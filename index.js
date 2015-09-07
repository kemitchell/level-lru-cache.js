module.exports = LevelLRUCache

// Notes to readers:
//
// Code and comments call keys that users use to `put` and `get` cache values
// "cache keys". They call keys in the underlying LevelUP store "LevelUP keys".
//
// The cache uses bytewise (with hex encoding) for partitioning the key spaces
// of its underlying // LevelUP. In bytewise' scheme, `null` is the lowest
// possible value and // `undefined` is the highest. The range from `[ 'key',
// null ]` to `[ 'key', // undefined ]` is any `Array` whose first element is
// the string `'key'`.

function LevelLRUCache(level, limit) { this.level = level
  this.limit = ( limit === undefined ? undefined : ( limit - 1 ) ) }

LevelLRUCache.prototype.count = require('./public/count')
LevelLRUCache.prototype.get = require('./public/get')
LevelLRUCache.prototype.put = require('./public/put')
