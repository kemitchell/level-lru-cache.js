var encode = require('./encode')

module.exports = allLevelUPKeys

// Calls back with an array of all LevelUP keys in the underlying LevelUP.
function allLevelUPKeys(callback) {
  var levelUPKeys = [ ]
  var errored = false
  this.level.createReadStream({
    keys: true,
    values: false,
    gt: encode([ null ]),
    lt: encode([ undefined ]) })
  .on('data', function(key) {
    levelUPKeys.push(key) })
  .on('error', function(error) {
    errored = true
    callback(error) })
  .on('end', function() {
    if (!errored) { callback(null, levelUPKeys) } }) }
