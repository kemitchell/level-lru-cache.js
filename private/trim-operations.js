var allLevelUPKeys = require('./all-levelup-keys')
var countCacheKeys = require('./count-cache-keys')
var decode = require('./decode')
var deleteOperation = require('./delete-operation')
var ecb = require('ecb')
var extraHelper = require('./extra')

// Call back with a list of LevelUP batch operations from clearing old
// records that need to be trimmed to say within the cache's limit.
module.exports = function trimOperations (callback) {
  var cache = this
  allLevelUPKeys.call(cache, ecb(callback, function (levelUPKeys) {
    var cacheKeyCount = countCacheKeys(levelUPKeys)
    var extra = extraHelper.call(cache, cacheKeyCount)
    // We're still within quota. No need to trim anything.
    if (extra < 1) {
      callback(null, [])
    } else {
      // A map from cache key to Array of LevelUP keys
      var cacheKeyToLevelUPKeysMap = {}
      // A map from cache key to latest timestamp
      var cacheKeyToTimestampMap = {}
      levelUPKeys.forEach(function (levelUPKey) {
        var decoded = decode(levelUPKey)
        var cacheKey = decoded[0]
        var timestamp = decoded[1]
        // Note the cache key has a record with the timestamp.
        if (!cacheKeyToLevelUPKeysMap.hasOwnProperty(cacheKey)) {
          cacheKeyToLevelUPKeysMap[cacheKey] = []
        }
        cacheKeyToLevelUPKeysMap[cacheKey].push(levelUPKey)
        // Note this timestamp if it's the newest we've seen for its
        // cache key.
        var newest = (
          !cacheKeyToTimestampMap.hasOwnProperty(cacheKey) ||
          timestamp > cacheKeyToTimestampMap[cacheKey]
        )
        if (newest) {
          cacheKeyToTimestampMap[cacheKey] = timestamp
        }
      })
      // Create a sorted Array of [ cache key, latest timestamp ]
      var keyLatestPairs = Object.keys(cacheKeyToTimestampMap)
      .reduce(function (keyLatestPairs, cacheKey) {
        return keyLatestPairs.concat([
          [cacheKey, cacheKeyToTimestampMap[cacheKey]]
        ])
      }, [])
      .sort(function (a, b) {
        return a[1] - b[1]
      })
      // [ cache key, latest timestamp ] elements for the records that
      // need to be trimmed are at the front of that Array.
      var toDelete = keyLatestPairs.slice(0, extra)
      .map(function (element) {
        return element[0]
      })
      // Create an Array of LevelUP batch operations to delete ...
      var batchOperations = toDelete
      .reduce(function (batch, cacheKey) {
        // ... every record for those cache keys ...
        var levelUPKeys = cacheKeyToLevelUPKeysMap[cacheKey]
        return batch.concat(levelUPKeys.map(deleteOperation))
      }, [])
      // ... and call back with it.
      callback(null, batchOperations)
    }
  }))
}
