var deleteOperation = require('../private/delete-operation')
var putOperation = require('../private/put-operation')
var trimOperations = require('../private/trim-operations')
var levelUPKeysForCacheKey = require('../private/level-up-keys-for-cache-key')

// Cache a value by key.
module.exports = put

function put(cacheKey, value, callback) {
  // The cache key must be a string.
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string') }
  // Create an Array of LevelUP batch operations to ...
  var cache = this
  // ... remove any extra cache records if we're going over the cache limit ...
  trimOperations.call(cache, function(error, trimOperations) {
    if (error) { callback(error) }
    else {
      levelUPKeysForCacheKey.call(cache, cacheKey, function(error, existingLevelUPKeys) {
        if (error) { callback(error) }
        else {
          var batchOperations = trimOperations
            // ... delete any older cache records for the given cache key ...
            .concat(existingLevelUPKeys.map(deleteOperation))
            // ... create a a new cache record for this key ...
            .concat(putOperation(cacheKey, value))
          // Run the batch.
          cache.level.batch(batchOperations, callback) } }) } }) }

