var decode = require('../private/decode')
var deleteOperation = require('../private/delete-operation')
var ecb = require('ecb')
var levelUPKeysForCacheKey =
  require('../private/levelup-keys-for-cache-key')
var putOperation = require('../private/put-operation')

// Call back with the cached value for a cache key.
module.exports = function get (cacheKey, callback) {
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string')
  }
  var cache = this
  // Find all existing LevelUP keys with the key.
  levelUPKeysForCacheKey.call(
    cache, cacheKey,
    ecb(callback, function (existingLevelUPKeys) {
      // If there aren't any, call back with undefined.
      if (existingLevelUPKeys.length === 0) {
        callback(null, undefined)
      } else {
        // Identify the latest timestamp and value for the key.
        var latestTimestamp = 0
        var latestLevelUPKey
        existingLevelUPKeys.forEach(function (levelUPKey) {
          var decoded = decode(levelUPKey)
          var timestamp = decoded[1]
          if (timestamp > latestTimestamp) {
            latestLevelUPKey = levelUPKey
            latestTimestamp = timestamp
          }
        })
        // Fetch the latest value.
        cache.level.get(
          latestLevelUPKey,
          ecb(callback, function (latest) {
            // Build a batch of operations that will ...
            // ... delete all existing records for this key ...
            var batchOperations = existingLevelUPKeys
            .map(deleteOperation)
            // ... and write a new record with the current timestamp.
            .concat(putOperation(cacheKey, latest))
            // Run the batch.
            cache.level.batch(batchOperations, function (error) {
              if (error) {
                callback(error)
              } else {
                callback(null, latest)
              }
            })
          })
        )
      }
    })
  )
}
