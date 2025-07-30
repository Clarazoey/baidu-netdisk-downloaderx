/**
 * Simple in-memory cache with TTL (Time To Live) support
 * Optimizes API calls and WebSocket data handling
 */
class MemoryCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map()
    this.timers = new Map()
    this.defaultTTL = defaultTTL
  }

  set(key, value, ttl = this.defaultTTL) {
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }

    // Set value
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key)
    }, ttl)

    this.timers.set(key, timer)
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null

    return item.value
  }

  has(key) {
    return this.cache.has(key)
  }

  delete(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
      this.timers.delete(key)
    }

    // Remove from cache
    return this.cache.delete(key)
  }

  clear() {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    this.cache.clear()
  }

  size() {
    return this.cache.size
  }

  // Get cache stats for debugging
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memory: this.getMemoryUsage()
    }
  }

  getMemoryUsage() {
    // Rough estimation of memory usage
    let size = 0
    this.cache.forEach((value, key) => {
      size += JSON.stringify({key, value}).length
    })
    return size
  }
}

// Create global cache instances
export const apiCache = new MemoryCache(5 * 60 * 1000) // 5 minutes for API calls
export const wsCache = new MemoryCache(30 * 1000) // 30 seconds for WebSocket data
export const staticCache = new MemoryCache(60 * 60 * 1000) // 1 hour for static data

// Cache wrapper for API calls
export const cachedFetch = async (url, options = {}, ttl) => {
  const cacheKey = `${url}-${JSON.stringify(options)}`
  
  // Check cache first
  if (apiCache.has(cacheKey)) {
    return apiCache.get(cacheKey)
  }

  try {
    const response = await fetch(url, options)
    const data = await response.json()
    
    // Cache successful responses
    if (response.ok) {
      apiCache.set(cacheKey, data, ttl)
    }
    
    return data
  } catch (error) {
    console.error('Cached fetch error:', error)
    throw error
  }
}

// WebSocket message deduplication
export const dedupeWSMessage = (message) => {
  const messageKey = `${message.cmd}-${JSON.stringify(message.data)}`
  
  // Check if we've seen this exact message recently
  if (wsCache.has(messageKey)) {
    return false // Duplicate, ignore
  }
  
  // Mark as seen
  wsCache.set(messageKey, true)
  return true // New message, process it
}

// Local storage cache with expiration
export const localStorageCache = {
  set(key, value, ttl = 24 * 60 * 60 * 1000) { // 24 hours default
    const item = {
      value,
      expiry: Date.now() + ttl
    }
    try {
      localStorage.setItem(key, JSON.stringify(item))
    } catch (e) {
      console.warn('LocalStorage cache failed:', e)
    }
  },

  get(key) {
    try {
      const itemStr = localStorage.getItem(key)
      if (!itemStr) return null

      const item = JSON.parse(itemStr)
      
      // Check if expired
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key)
        return null
      }

      return item.value
    } catch (e) {
      console.warn('LocalStorage cache read failed:', e)
      return null
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key)
    } catch (e) {
      console.warn('LocalStorage cache remove failed:', e)
    }
  },

  clear() {
    try {
      // Clear only our cache entries (those with expiry)
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key))
          if (item && typeof item.expiry === 'number') {
            localStorage.removeItem(key)
          }
        } catch (e) {
          // Not our cache entry, skip
        }
      })
    } catch (e) {
      console.warn('LocalStorage cache clear failed:', e)
    }
  }
}

export default {
  apiCache,
  wsCache,
  staticCache,
  cachedFetch,
  dedupeWSMessage,
  localStorageCache
}