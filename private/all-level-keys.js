var encode = require('bytewise').encode

module.exports = _allLevelKeys

// Calls back with an array of all level keys in the underlying LevelUP.
function _allLevelKeys(callback) {
  var levelKeys = [ ]
  var errored = false
  this.level.createReadStream({
    keys: true,
    values: false,
    gt: encode([ null ]),
    lt: encode([ undefined ]) })
  .on('data', function(key) {
    levelKeys.push(key) })
  .on('error', function(error) {
    errored = true
    callback(error) })
  .on('end', function() {
    if (!errored) { callback(null, levelKeys) } }) }
