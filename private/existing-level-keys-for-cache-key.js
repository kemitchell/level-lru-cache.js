var encode = require('bytewise').encode

module.exports =  existingLevelKeysForCacheKey

// Call back with all the LevelUP keys for a given cache key.
function existingLevelKeysForCacheKey(cacheKey, callback) {
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
    if (!errored) { callback(null, levelKeys) } }) }
