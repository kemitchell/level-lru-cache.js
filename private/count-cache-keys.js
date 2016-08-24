var decode = require('./decode')

module.exports = countCacheKeys

function countCacheKeys (levelUPKeys) {
  var cacheKeysSeen = []
  return levelUPKeys.reduce(function (count, levelUPKey) {
    var decoded = decode(levelUPKey)
    var cacheKey = decoded[0]
    // Don't count a cache key twice if seen before.
    return cacheKeysSeen.indexOf(cacheKey) === -1
    ? count + 1
    : count
  }, 0)
}
