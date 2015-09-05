# Usage

```javascript
var Cache = require('level-lru-cache')
var levelup = require('levelup')
var memdown = require('memdown')

// Any sane LevelDOWN will do.
var level = levelup({ db: memdown })
// A loose limit for how many keys the cache should store.
var limit = 100

var cache = new Cache(level, limit)

cache.set('string key', value, function(error) {
  /* ... */ })

cache.get('string key', function(error, value) {
  /* Value is `undefined` if the cache doesn't have a value. */ })
```

# Under the Hood

The cache stores values as records. Each record's key combines the cache key and a timestamp. On `put`, the cache counts stored records, compares to the cache limit, if any, and deletes records for the oldest keys as it adds a record for the new value. On `get`, the cache finds all the records for the key, deletes them all, notes the most recent value, creates a new record for the value, and returns the value.

The general idea is to avoid issues where:

1. A first `put` performs LevelUP read operations. They indicate the cache is about to bust its limit, and that key `'x'` is the oldest.

2. Another operation operation reads or writes the cached value for `'x'`.

3. The first `put` operation performs its LevelUP write operations, deleting `'x'`, which should actually be the most recently used value in the cache.

The use of timestamps isn't ideal, but it probably works when the asynchronous clients of the underling LevelUP are on the same machine.
