var allLevelKeys = require('./all-level-keys')
var countCacheKeys = require('./count-cache-keys')
var decode = require('bytewise').decode
var extraHelper = require('./extra')
var deleteOperation = require('./delete-operation')

module.exports = trimOperations

// Call back with a list of LevelUP batch operations from clearing old
// records that need to be trimmed to say within the cache's limit.
function trimOperations(callback) {
  var cache = this
  allLevelKeys.call(cache, function(error, levelKeys) {
    if (error) { callback(error) }
    else {
      var cacheKeyCount = countCacheKeys(levelKeys)
      var extra = extraHelper.call(cache, cacheKeyCount)
      // We're still within quota. No need to trim anything.
      if (extra < 1) { callback(null, [ ]) }
      else {
        // A map from cache key to Array of LevelUP keys
        var cacheKeyToLevelKeysMap = { }
        // A map from cache key to latest timestamp
        var cacheKeyToTimestampMap = { }
        levelKeys.forEach(function(levelKey) {
          var decoded = decode(levelKey)
          var cacheKey = decoded[0]
          var timestamp = decoded[1]
          // Note the cache key has a record with the timestamp.
          if (!cacheKeyToLevelKeysMap.hasOwnProperty(cacheKey)) {
            cacheKeyToLevelKeysMap[cacheKey] = [ ] }
          cacheKeyToLevelKeysMap[cacheKey].push(levelKey)
          // Note this timestamp if it's the newest we've seen for its cache key.
          var newest = (
            !cacheKeyToTimestampMap.hasOwnProperty(cacheKey) ||
            timestamp > cacheKeyToTimestampMap[cacheKey])
          if (newest) { cacheKeyToTimestampMap[cacheKey] = timestamp } })
        // Create a sorted Array of [ cache key, latest timestamp ]
        var keyLatestPairs = Object.keys(cacheKeyToTimestampMap)
        .reduce(
          function(keyLatestPairs, cacheKey) {
            return keyLatestPairs.concat([
              [ cacheKey, cacheKeyToTimestampMap[cacheKey] ] ]) },
          [ ])
        .sort(function(a, b) { return a[1] - b[1] })
        // [ cache key, latest timestamp ] elements for the records that need
        // to be trimmed are at the front of that Array.
        var toDelete = keyLatestPairs.slice(0, extra)
        .map(function(element) { return element[0] })
        // Create an Array of LevelUP batch operations to delete ...
        var batchOperations = toDelete
          .reduce(
            function(batch, cacheKey) {
              // ... every record for those cache keys ...
              var levelKeys = cacheKeyToLevelKeysMap[cacheKey]
              return batch.concat(levelKeys.map(deleteOperation)) },
            [ ])
        // ... and call back with it.
        callback(null, batchOperations) } } }) }