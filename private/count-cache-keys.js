var decode = require('./decode')

module.exports = countCacheKeys

function countCacheKeys(levelKeys) {
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
