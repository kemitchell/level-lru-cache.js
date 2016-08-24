var deleteOperation = require('../private/delete-operation')
var ecb = require('ecb')
var putOperation = require('../private/put-operation')
var trimOperations = require('../private/trim-operations')
var levelUPKeysForCacheKey =
  require('../private/levelup-keys-for-cache-key')

// Cache a value by key.
module.exports = function put (cacheKey, value, callback) {
  // The cache key must be a string.
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string')
  }
  // Create an Array of LevelUP batch operations to ...
  var cache = this
  // ... remove any extra cache records if we're going over the cache
  // limit ...
  trimOperations.call(cache, ecb(callback, function (trimOperations) {
    levelUPKeysForCacheKey.call(
      cache, cacheKey,
      ecb(callback, function (existingLevelUPKeys) {
        var batchOperations = trimOperations
        // ... delete any older cache records for the given cache
        // key ...
        .concat(existingLevelUPKeys.map(deleteOperation))
        // ... create a new cache record for this key ...
        .concat(putOperation(cacheKey, value))
        // Run the batch.
        cache.level.batch(batchOperations, callback)
      })
    )
  }))
}

