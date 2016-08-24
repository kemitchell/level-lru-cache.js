var allLevelUPKeys = require('../private/all-levelup-keys')
var countCacheKeys = require('../private/count-cache-keys')
var ecb = require('ecb')

// Call back with the number of cache keys in the underlying LevelUP.
module.exports = function count (callback) {
  allLevelUPKeys.call(this, ecb(callback, function (levelUPKeys) {
    callback(null, countCacheKeys(levelUPKeys))
  }))
}
