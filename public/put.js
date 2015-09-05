var deleteOperation = require('../helper/delete-operation')
var putOperation = require('../helper/put-operation')

// Cache a value by key.
module.exports = put

function put(cacheKey, value, callback) {
  // The cache key must be a string.
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string') }
  // Create an Array of LevelUP batch operations to ...
  var cache = this
  // ... remove any extra cache records if we're going over the cache limit ...
  cache._trimOperations(function(error, trimOperations) {
    if (error) { callback(error) }
    else {
      cache._existingLevelKeysForCacheKey(cacheKey, function(error, existingLevelKeys) {
        if (error) { callback(error) }
        else {
          var batchOperations = trimOperations
            // ... delete any older cache records for the given cache key ...
            .concat(existingLevelKeys.map(deleteOperation))
            // ... create a a new cache record for this key ...
            .concat(putOperation(cacheKey, value))
          // Run the batch.
          cache.level.batch(batchOperations, function(error) {
            if (error) { callback(error) }
            else { callback(null) } }) } }) } }) }

