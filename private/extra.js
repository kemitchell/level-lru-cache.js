module.exports = extra

// Call back with the number of cache records that should be deleted to
// stay within the cache limit.
function extra (count) {
  var limit = this.limit
  // If there isn't a limit, don't delete anything.
  if (limit === undefined) {
    return 0
  } else {
    if (count > limit) {
      return (count - limit)
    } else {
      return 0
    }
  }
}
