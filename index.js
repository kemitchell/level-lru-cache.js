var asap = require('asap')
var bytewise = require('bytewise')

var encode = bytewise.encode
var decode = bytewise.decode
var noError = null

module.exports = LevelLRUCache

function LevelLRUCache(level, limit) {
  this.level = level
  this.limit = (
    limit === undefined ?
      undefined : ( limit - 1 ) ) }

// Cache a value by key.
LevelLRUCache.prototype.put = function(cacheKey, value, callback) {
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string') }
  var cache = this
  cache._trimOperations(function(error, trimOperations) {
    if (error) { callback(error) }
    else {
      cache._existingLevelKeys(
        cacheKey,
        function(error, preexistingLevelKeys) {
          if (error) { callback(error) }
          else {
            var levelKey = bytewise.encode([ cacheKey, Date.now() ])
            var batchOperations = preexistingLevelKeys
              .map(function(preexistingLevelKey) {
                return { type: 'del', key: preexistingLevelKey } })
              .concat({ type: 'put', key: levelKey, value: value })
              .concat(trimOperations)
            cache.level.batch(batchOperations, function(error) {
              if (error) { callback(error) }
              else { callback(noError) } }) } }) } }) }

LevelLRUCache.prototype.extra = function(callback) {
  var limit = this.limit
  if (limit === undefined) {
    asap(function() { callback(noError, 0) }) }
  else {
    this.count(function(error, count) {
      if (error) { callback(error) }
      else {
        if (count > limit) {
          callback(noError, ( count - limit )) }
        else {
          callback(noError, 0) } } }) } }

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

LevelLRUCache.prototype._trimOperations = function(callback) {
  var level = this.level
  this.extra(function(error, extra) {
    var keyToLevelKeys = { }
    var keyToTimestamp = { }
    if (extra > 0) {
      level.createReadStream({
        keys: true,
        values: false,
        gt: encode([ null ]),
        lt: encode([ undefined ]) })
      .on('data', function(levelKey) {
        var decoded = decode(levelKey)
        var cacheKey = decoded[0]
        var timestamp = decoded[1]
        if (!keyToLevelKeys.hasOwnProperty(cacheKey)) {
          keyToLevelKeys[cacheKey] = [ ] }
        keyToLevelKeys[cacheKey].push(levelKey)
        var newer = (
          !keyToTimestamp.hasOwnProperty(cacheKey) ||
          keyToTimestamp[cacheKey] < timestamp )
        if (newer) {
          keyToTimestamp[cacheKey] = timestamp } })
      .on('end', function() {
        var keyLatestPairs = Object.keys(keyToTimestamp)
        .reduce(
          function(keyLatestPairs, cacheKey) {
            return keyLatestPairs.concat([
              [ cacheKey, keyToTimestamp[cacheKey] ] ]) },
          [ ])
        .sort(function(a, b) {
          return a[1] - b[1] })
        var toDelete = keyLatestPairs.slice(0, extra)
        .map(function(element) {
          return element[0] })
        var batchOperations = toDelete
          .reduce(
            function(batchOperations, cacheKey) {
              return batchOperations
              .concat(
                keyToLevelKeys[cacheKey]
                .map(function(levelKey) {
                  return { type: 'del', key: levelKey } })) },
            [ ])
        callback(noError, batchOperations) }) }
    else {
      asap(function() { callback(noError, [ ]) }) } }) }

LevelLRUCache.prototype.count = function(callback) {
  // Scan the entire key space, counting keys.
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
    // Don't count a key twice.
    if (cacheKeysSeen.indexOf(cacheKey) === -1) {
      count += 1 } })
  .on('end', function() {
    callback(noError, count) }) }

LevelLRUCache.prototype.get = function(cacheKey, callback) {
  if (typeof cacheKey !== 'string') {
    throw new TypeError('key must be a string') }
  var cache = this
  // Find all existing values with the key.
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
