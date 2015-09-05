var bytewise = require('bytewise')

var encode = bytewise.encode
var decode = bytewise.decode
var noError = null

module.exports = LevelLRUCache

// Notes to readers:
//
// Code and comments call keys that users use to `set` and `get` cache values
// "cache keys". They call keys in the underlying LevelUP store "level keys".
//
// The cache uses bytewise for partitioning the key spaces of its underlying
// LevelUP. In bytewise' scheme, `null` is the lowest possible value and
// `undefined` is the highest. The range from `[ 'key', null ]` to `[ 'key',
// undefined ]` is any `Array` whose first element is the string `'key'`.

function LevelLRUCache(level, limit) {
  this.level = level
  this.limit = ( limit === undefined ? undefined : ( limit - 1 ) ) }

function deleteOperation(levelKey) {
  return { type: 'del', key: levelKey } }

function putOperation(cacheKey, value) {
  return {
    type: 'put',
    key: bytewise.encode([ cacheKey, Date.now() ]),
    value: value } }

// Calls back with an array of all level keys in the underlying LevelUP.
LevelLRUCache.prototype._allLevelKeys = function(callback) {
  var levelKeys = [ ]
  var errored = false
  this.level.createReadStream({
    keys: true,
    values: false,
    gt: encode([ null ]),
    lt: encode([ undefined ]) })
  .on('data', function(key) {
    levelKeys.push(key) })
  .on('error', function(error) {
    errored = true
    callback(error) })
  .on('end', function() {
    if (!errored) { callback(noError, levelKeys) } }) }

// Cache a value by key.
LevelLRUCache.prototype.put = function(cacheKey, value, callback) {
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
            else { callback(noError) } }) } }) } }) }

// Call back with the number of cache records that should be deleted to
// stay within the cache limit.
LevelLRUCache.prototype._extra = function(count) {
  var limit = this.limit
  // If there isn't a limit, don't delete anything.
  if (limit === undefined) { return 0 }
  else {
    if (count > limit) { return ( count - limit ) }
    else { return 0 } } }

// Call back with all the LevelUP keys for a given cache key.
LevelLRUCache.prototype._existingLevelKeysForCacheKey = function(cacheKey, callback) {
  var levelKeys = [ ]
  var errored = false
  this.level.createReadStream({
    keys: true,
    values: false,
    gt: encode([ cacheKey, null ]),
    lt: encode([ cacheKey, undefined ]) })
  .on('error', function(error) {
    errored = true
    callback(error) })
  .on('data', function(levelKey) {
    levelKeys.push(levelKey) })
  .on('end', function() {
    if (!errored) { callback(noError, levelKeys) } }) }

// Call back with a list of LevelUP batch operations from clearing old
// records that need to be trimmed to say within the cache's limit.
LevelLRUCache.prototype._trimOperations = function(callback) {
  var cache = this
  this._allLevelKeys(function(error, levelKeys) {
    if (error) { callback(error) }
    else {
      var cacheKeyCount = countCacheKeys(levelKeys)
      var extra = cache._extra(cacheKeyCount)
      // We're still within quota. No need to trim anything.
      if (extra < 1) { callback(noError, [ ]) }
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
        callback(noError, batchOperations) } } }) }

function countCacheKeys(levelKeys) {
  // Scan all level keys, counting cache keys.
  var cacheKeysSeen = [ ]
  return levelKeys
    .reduce(
      function(count, levelKey) {
        var decoded = decode(levelKey)
        var cacheKey = decoded[0]
        // Don't count a cache key twice if seen before.
        return (
          ( cacheKeysSeen.indexOf(cacheKey) === -1 ) ?
            ( count + 1 ) : count ) },
      0) }

// Call back with the number of cache keys in the underlying LevelUP.
LevelLRUCache.prototype.count = function(callback) {
  this._allLevelKeys(function(error, levelKeys) {
    if (error) { callback(error) }
    else { callback(noError, countCacheKeys(levelKeys)) } }) }

// Call back with the cached value for a cache key.
LevelLRUCache.prototype.get = function(cacheKey, callback) {
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string') }
  var cache = this
  // Find all existing LevelUP keys with the key.
  cache._existingLevelKeysForCacheKey(cacheKey, function(error, existingLevelKeys) {
    // If there aren't any, return undefined.
    if (existingLevelKeys.length === 0) { callback(noError, undefined) }
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
            else { callback(noError, latestValue) } }) } }) } }) }
