import React, { Suspense } from 'react'
import { BrowserRouter, Route, Link } from 'react-router-dom'
import PropTypes from 'prop-types'
import classnames from 'classnames'
// Optimize Material-UI imports
import Drawer from '@material-ui/core/Drawer'
import Badge from '@material-ui/core/Badge'
import List from '@material-ui/core/List'
import Divider from '@material-ui/core/Divider'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import CircularProgress from '@material-ui/core/CircularProgress'
import { withStyles } from '@material-ui/core/styles'
// Optimize icon imports
import InboxIcon from '@material-ui/icons/MoveToInbox'
import AllInboxIcon from '@material-ui/icons/AllInbox'
import DoneOutlineIcon from '@material-ui/icons/DoneOutline'
import ChartIcon from '@material-ui/icons/BubbleChart'
import FavoriteIcon from '@material-ui/icons/FavoriteBorder'
import withRoot from './withRoot'
import styles from './styles'
import { dedupeWSMessage } from './utils/cache'

// Lazy load page components for code splitting
const Index = React.lazy(() => import('./pages/index'))
const Downloading = React.lazy(() => import('./pages/downloading'))
const Finished = React.lazy(() => import('./pages/finished'))
const Donate = React.lazy(() => import('./pages/donate'))
const Welcome = React.lazy(() => import('./pages/welcome'))

// Loading component
const LoadingSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
    <CircularProgress />
  </div>
)

class App extends React.Component {
  state = {
    count: 0,
    downloadingData: '',
    finishedData: '',
    indexData: '',
    welcomeData: '',
  }

  componentDidMount () {
    window.rws.send(JSON.stringify({cmd: 'counttasks', param: {}}))
    
    // Optimize WebSocket message handling with switch statement and deduplication
    const handleWebSocketMessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        
        // Skip duplicate messages to reduce unnecessary re-renders
        if (!dedupeWSMessage(data)) {
          return
        }
        
        switch (data.cmd) {
          case 'counttasks':
            this.setState({
              count: data.data.taskCount,
            })
            break
          case 'statistic':
            this.setState({
              welcomeData: data,
            })
            break
          case 'lstasks':
            this.setState({
              downloadingData: data,
            })
            break
          case 'traverse':
          case 'ls':
            this.setState({
              indexData: data,
            })
            break
          case 'lsctasks':
            this.setState({
              finishedData: data,
            })
            break
          default:
            // Handle unknown commands gracefully
            console.warn('Unknown WebSocket command:', data.cmd)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
    
    window.rws.onmessage = handleWebSocketMessage
  }
  
  componentWillUnmount() {
    // Clean up WebSocket listener to prevent memory leaks
    if (window.rws && window.rws.onmessage) {
      window.rws.onmessage = null
    }
  }

  render () {
    const {classes} = this.props
    return (
      <BrowserRouter>
        <div>
          <Drawer variant="permanent">
            <List className={classes.sideLi}>
              <Route exact
                     path="/"
                     children={({match}) => (
                       <Link className={match && classes.sideItemCurrent}
                             to="/">
                         <ListItem button>
                           <ListItemIcon>
                             <ChartIcon className={classnames(classes.sideSVG,
                               classes.ftYellow)}/>
                           </ListItemIcon>
                         </ListItem>
                       </Link>
                     )}
              />
              <Divider/>
              <Route
                path="/index"
                children={({match}) => (
                  <Link className={match && classes.sideItemCurrent}
                        to="/index">
                    <ListItem button>
                      <ListItemIcon>
                        <AllInboxIcon color='primary'
                                      className={classes.sideSVG}/>
                      </ListItemIcon>
                    </ListItem>
                  </Link>
                )}
              />
              <Divider/>
              <Route
                path="/downloading"
                children={({match}) => (
                  <Link className={match && classes.sideItemCurrent}
                        to="/downloading">
                    <ListItem button>
                      <ListItemIcon>
                        {
                          this.state.count !== 0 ? (
                            <Badge badgeContent={this.state.count}
                                   color="secondary">
                              <InboxIcon className={classnames(classes.sideSVG,
                                classes.ftPurple)}/>
                            </Badge>) : (
                            <InboxIcon className={classnames(classes.sideSVG,
                              classes.ftPurple)}/>)
                        }
                      </ListItemIcon>
                    </ListItem>
                  </Link>
                )}
              />
              <Route
                path="/finished"
                children={({match}) => (
                  <Link className={match && classes.sideItemCurrent}
                        to="/finished">
                    <ListItem button>
                      <ListItemIcon>
                        <DoneOutlineIcon className={classnames(classes.sideSVG,
                          classes.ftGreen)}/>
                      </ListItemIcon>
                    </ListItem>
                  </Link>
                )}
              />
              <Divider/>
              <Route
                path="/donate"
                children={({match}) => (
                  <Link className={match && classes.sideItemCurrent}
                        to="/donate">
                    <ListItem button>
                      <ListItemIcon>
                        <FavoriteIcon color='secondary'
                                      className={classes.sideSVG}/>
                      </ListItemIcon>
                    </ListItem>
                  </Link>
                )}
              />
            </List>
          </Drawer>
          <main className={classes.content}>
            <Route path="/" exact render={props => (
              <Suspense fallback={<LoadingSpinner />}>
                <Welcome classes={classes} rwsData={this.state.welcomeData}/>
              </Suspense>
            )}/>
            <Route path="/index" render={props => (
              <Suspense fallback={<LoadingSpinner />}>
                <Index classes={classes} rwsData={this.state.indexData}/>
              </Suspense>
            )}/>
            <Route path="/downloading" render={props => (
              <Suspense fallback={<LoadingSpinner />}>
                <Downloading classes={classes}
                           rwsData={this.state.downloadingData}/>
              </Suspense>
            )}/>
            <Route path="/finished" render={props => (
              <Suspense fallback={<LoadingSpinner />}>
                <Finished classes={classes} rwsData={this.state.finishedData}/>
              </Suspense>
            )}/>
            <Route path="/donate" render={props => (
              <Suspense fallback={<LoadingSpinner />}>
                <Donate classes={classes}/>
              </Suspense>
            )}/>
          </main>
        </div>
      </BrowserRouter>
    )
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withRoot(withStyles(styles)(App))
