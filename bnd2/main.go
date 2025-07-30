package main

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/88250/bnd2/command"
	"github.com/88250/bnd2/util"
	"github.com/88250/gulu"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"gopkg.in/olahol/melody.v1"
)

var logger *gulu.Logger

func init() {
	gulu.Log.SetLevel("error")
	logger = gulu.Log.NewLogger(os.Stdout)

	if util.CheckUpgrade() {
		logger.Fatalf("current BND2 kernel v[%s] is outdated, exited", util.Ver)
	}

	go util.ParentExited()
}

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	
	// Performance middleware
	r.Use(gin.Recovery())
	r.Use(gzip.Gzip(gzip.DefaultCompression)) // Enable gzip compression
	r.Use(func(c *gin.Context) {
		// Add performance headers
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	})

	// Optimize status endpoint with caching
	var cachedStatus []byte
	var statusCacheTime time.Time
	r.GET("/status", func(c *gin.Context) {
		// Simple caching for status endpoint (5 second cache)
		if time.Since(statusCacheTime) > 5*time.Second || cachedStatus == nil {
			result := util.NewResult()
			result.Data = map[string]interface{}{
				"version": util.Ver,
				"timestamp": time.Now().Unix(),
			}
			cachedStatus, _ = json.Marshal(result)
			statusCacheTime = time.Now()
		}
		c.Data(http.StatusOK, "application/json", cachedStatus)
	})

	m := melody.New()
	r.GET("/ws", func(c *gin.Context) {
		m.HandleRequest(c.Writer, c.Request)
	})

	r.POST("/login", func(c *gin.Context) {
		result := util.NewResult()
		defer c.JSON(http.StatusOK, result)

		arg := map[string]interface{}{}
		if err := c.BindJSON(&arg); nil != err {
			result.Code = -1
			result.Msg = "parses login request failed"

			return
		}

		util.BDUSS = arg["bd"].(string)
		logger.Debug("signed in [baidu]")

		go util.StartAria2()
	})

	m.HandleConnect(func(s *melody.Session) {
		util.SetPushChan(s)
		logger.Debug("websocket connected")
	})

	m.HandleMessage(func(s *melody.Session, msg []byte) {
		logger.Infof("request [%s]", msg)
		request := map[string]interface{}{}
		if err := json.Unmarshal(msg, &request); nil != err {
			result := util.NewResult()
			result.Code = -1
			result.Msg = "Bad Request"
			responseData, _ := json.Marshal(result)
			util.Push(responseData)

			return
		}

		cmdStr := request["cmd"].(string)
		cmd := command.Commands[cmdStr]
		if nil == cmd {
			result := util.NewResult()
			result.Code = -1
			result.Msg = "Invalid Command"
			responseData, _ := json.Marshal(result)
			util.Push(responseData)

			return
		}

		param := request["param"].(map[string]interface{})
		go cmd.Exec(param)
	})

	port := strconv.Itoa(util.ServerPort)
	logger.Infof("BND2 kernel (v%s) is running [:%s]", util.Ver, port)

	if err := r.Run(":" + port); nil != err {
		logger.Errorf("start BND2 kernel failed [%s]", err)
	}
}
