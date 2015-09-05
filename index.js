var asap = require('asap')
var bytewise = require('bytewise')

var encode = bytewise.encode
var decode = bytewise.decode
var noError = null

module.exports = LevelLRUCache

// Notes to readers:
//
// Code and comments call keys that users use to `set` and `get` cache values
// "cache keys".They call keys in the underlying LevelUP store "Level keys".
//
// The cache uses bytewise for partitioning the key spaces of its underlying
// LevelUP. In bytewise' scheme, `null` is the lowest possible value and
// `undefined` is the highest. The range from `[ 'key', null ]` to `[ 'key',
// undefined ]` is any `Array` whose first element is the string `'key'`.

function LevelLRUCache(level, limit) {
  this.level = level
  this.limit = ( limit === undefined ? undefined : ( limit - 1 ) ) }

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
      cache._existingLevelKeys(cacheKey, function(error, exitingLevelKeys) {
        if (error) { callback(error) }
        else {
          var batchOperations = trimOperations
            // ... delete any older cache records for the given cache key ...
            .concat(
              exitingLevelKeys
              .map(function(exitingLevelKey) {
                return { type: 'del', key: exitingLevelKey } }))
            // ... create a a new cache record for this key ...
            .concat({
              type: 'put',
              // ... at the current timestamp.
              key: bytewise.encode([ cacheKey, Date.now() ]),
              value: value })
          // Run the batch.
          cache.level.batch(batchOperations, function(error) {
            if (error) { callback(error) }
            else { callback(noError) } }) } }) } }) }

// Call back with the number of cache records that should be deleted to
// stay within the cache limit.
LevelLRUCache.prototype._extra = function(callback) {
  var limit = this.limit
  // If there isn't a limit, don't delete anything.
  if (limit === undefined) {
    asap(function() { callback(noError, 0) }) }
  else {
    // Get the current cache record count ...
    this.count(function(error, count) {
      if (error) { callback(error) }
      else {
        // ... and call back with how it exceeds the cache limit.
        if (count > limit) {
          callback(noError, ( count - limit )) }
        else {
          callback(noError, 0) } } }) } }

// Call back with all the LevelUP keys for a given cache key.
LevelLRUCache.prototype._existingLevelKeys = function(cacheKey, callback) {
  var levelKeys = [ ]
  this.level.createReadStream({
    keys: true,
    values: false,
    gt: encode([ cacheKey, null ]),
    lt: encode([ cacheKey, undefined ]) })
  .on('data', function(levelKey) {
    levelKeys.push(levelKey) })
  .on('end', function() {
    callback(noError, levelKeys) }) }

// Call back with a list of LevelUP batch operations from clearing old
// records that need to be trimmed to say within the cache's limit.
LevelLRUCache.prototype._trimOperations = function(callback) {
  var level = this.level
  this._extra(function(error, extra) {
    // We're still within quota. No need to trim anything.
    if (extra < 1) {
      asap(function() { callback(noError, [ ]) }) }
    else {
      // A map from cache key to Array of LevelUP keys
      var cacheKeyToLevelKeysMap = { }
      // A map from cache key to latest timestamp
      var cacheKeyToTimestampMap = { }
      level.createReadStream({
        keys: true,
        values: false,
        gt: encode([ null ]),
        lt: encode([ undefined ]) })
      .on('data', function(levelKey) {
        var decoded = decode(levelKey)
        var cacheKey = decoded[0]
        var timestamp = decoded[1]
        // Note the cache key has a record with the timestamp.
        if (!cacheKeyToLevelKeysMap.hasOwnProperty(cacheKey)) {
          cacheKeyToLevelKeysMap[cacheKey] = [ ] }
        cacheKeyToLevelKeysMap[cacheKey].push(levelKey)
        // Note this timestamp if it's the newest we've seen for its cache key.
        var newer = (
          !cacheKeyToTimestampMap.hasOwnProperty(cacheKey) ||
          cacheKeyToTimestampMap[cacheKey] < timestamp )
        if (newer) {
          cacheKeyToTimestampMap[cacheKey] = timestamp } })
      .on('end', function() {
        // Create a sorted Array of [ cache key, latest timestamp ]
        var keyLatestPairs = Object.keys(cacheKeyToTimestampMap)
        .reduce(
          function(keyLatestPairs, cacheKey) {
            return keyLatestPairs.concat([
              [ cacheKey, cacheKeyToTimestampMap[cacheKey] ] ]) },
          [ ])
        .sort(function(a, b) {
          return a[1] - b[1] })
        // [ cache key, latest timestamp ] elements for the records that need
        // to be trimmed are at the front of that Array.
        var toDelete = keyLatestPairs.slice(0, extra)
        .map(function(element) {
          return element[0] })
        // Create an Array of LevelUP batch operations to delete ...
        var batchOperations = toDelete
          .reduce(
            function(batch, cacheKey) {
              // ... every record for those cache keys ...
              return batch
              .concat(
                cacheKeyToLevelKeysMap[cacheKey]
                .map(function(levelKey) {
                  return { type: 'del', key: levelKey } })) },
            [ ])
        // ... and call back with it.
        callback(noError, batchOperations) }) } }) }

// Call back with the number of cache keys in the underlying LevelUP.
LevelLRUCache.prototype.count = function(callback) {
  // Scan call cache keys, counting keys.
  var count = 0
  var cacheKeysSeen = [ ]
  this.level.createReadStream({
    keys: true,
    values: false,
    gt: encode([ null ]),
    lt: encode([ undefined ]) })
  .on('data', function(levelKey) {
    var decoded = decode(levelKey)
    var cacheKey = decoded[0]
    // Don't count a key twice if seen before.
    if (cacheKeysSeen.indexOf(cacheKey) === -1) {
      count += 1 } })
  .on('end', function() {
    callback(noError, count) }) }

// Call back with the cached value for a cache key.
LevelLRUCache.prototype.get = function(cacheKey, callback) {
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string') }
  var cache = this
  // Find all existing LevelUP keys with the key.
  cache._existingLevelKeys(cacheKey, function(error, existingLevelKeys) {
    // If there aren't any, return undefined.
    if (existingLevelKeys.length === 0) {
      callback(noError, undefined) }
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
          var batchOperations = existingLevelKeys
          // ... delete all existing records for this key and ...
          .map(function(existingLevelKey) {
            return { type: 'del', key: existingLevelKey } })
          // ... write a new record with the current timestamp.
          .concat({
            type: 'put',
            key: encode([ cacheKey, Date.now() ]),
            value: latestValue })
          // Run the batch.
          cache.level.batch(batchOperations, function(error) {
            if (error) { callback(error) }
            else { callback(noError, latestValue) } }) } }) } }) }
