var countCacheKeys = require('../private/count-cache-keys')
var allLevelKeys = require('../private/all-level-keys')

module.exports = count

// Call back with the number of cache keys in the underlying LevelUP.
function count(callback) {
  allLevelKeys.call(this, function(error, levelKeys) {
    if (error) { callback(error) }
    else { callback(null, countCacheKeys(levelKeys)) } }) }
