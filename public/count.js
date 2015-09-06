var countCacheKeys = require('../private/count-cache-keys')
var allLevelUPKeys = require('../private/all-levelup-keys')

module.exports = count

// Call back with the number of cache keys in the underlying LevelUP.
function count(callback) {
  allLevelUPKeys.call(this, function(error, levelUPKeys) {
    if (error) { callback(error) }
    else { callback(null, countCacheKeys(levelUPKeys)) } }) }
