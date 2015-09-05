var decode = require('bytewise').decode
var deleteOperation = require('../helper/delete-operation')
var putOperation = require('../helper/put-operation')

module.exports = get

// Call back with the cached value for a cache key.
function get(cacheKey, callback) {
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string') }
  var cache = this
  // Find all existing LevelUP keys with the key.
  cache._existingLevelKeysForCacheKey(cacheKey, function(error, existingLevelKeys) {
    // If there aren't any, return undefined.
    if (existingLevelKeys.length === 0) { callback(null, undefined) }
    else {
      // Identify the latest timestamp and value for the key.
      var latestTimestamp = 0
      var latestLevelKey
      existingLevelKeys.forEach(function(levelKey) {
        var decoded = decode(levelKey)
        var timestamp = decoded[1]
        if (timestamp > latestTimestamp) {
          latestLevelKey = levelKey
          latestTimestamp = timestamp } })
      // Fetch the latest value.
      cache.level.get(latestLevelKey, function(error, latestValue) {
        if (error) { callback(error) }
        else {
          // Build a batch of operations that will ...
          // ... delete all existing records for this key ...
          var batchOperations = existingLevelKeys.map(deleteOperation)
          // ... and write a new record with the current timestamp.
          .concat(putOperation(cacheKey, latestValue))
          // Run the batch.
          cache.level.batch(batchOperations, function(error) {
            if (error) { callback(error) }
            else { callback(null, latestValue) } }) } }) } }) }
