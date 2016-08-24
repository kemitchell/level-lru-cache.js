var encode = require('./encode')

module.exports = levelUPKeysForCacheKey

// Call back with all the LevelUP keys for a given cache key.
function levelUPKeysForCacheKey (cacheKey, callback) {
  var levelUPKeys = []
  var errored = false
  this.level.createReadStream({
    keys: true,
    values: false,
    gt: encode([cacheKey, null]),
    lt: encode([cacheKey, undefined])
  })
  .on('error', function (error) {
    errored = true
    callback(error)
  })
  .on('data', function (levelUPKey) {
    levelUPKeys.push(levelUPKey)
  })
  .on('end', function () {
    if (!errored) {
      callback(null, levelUPKeys)
    }
  })
}
