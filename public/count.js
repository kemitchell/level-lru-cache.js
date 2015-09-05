var countCacheKeys = require('../helper/count-cache-keys')

module.exports = count

// Call back with the number of cache keys in the underlying LevelUP.
function count(callback) {
  this._allLevelKeys(function(error, levelKeys) {
    if (error) { callback(error) }
    else { callback(null, countCacheKeys(levelKeys)) } }) }
