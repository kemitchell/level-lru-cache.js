module.exports = LevelLRUCache

// Notes to readers:
//
// Code and comments call keys that users use to `set` and `get` cache values
// "cache keys". They call keys in the underlying LevelUP store "level keys".
//
// The cache uses bytewise for partitioning the key spaces of its underlying
// LevelUP. In bytewise' scheme, `null` is the lowest possible value and
// `undefined` is the highest. The range from `[ 'key', null ]` to `[ 'key',
// undefined ]` is any `Array` whose first element is the string `'key'`.

function LevelLRUCache(level, limit) {
  this.level = level
  this.limit = ( limit === undefined ? undefined : ( limit - 1 ) ) }

var prototype = LevelLRUCache.prototype

prototype.count = require('./public/count')
prototype.get = require('./public/get')
prototype.put = require('./public/put')

prototype._allLevelKeys  = require('./private/all-level-keys')
prototype._existingLevelKeysForCacheKey = require('./private/existing-level-keys-for-cache-key')
prototype._extra = require('./private/extra')
prototype._trimOperations = require('./private/trim-operations')
