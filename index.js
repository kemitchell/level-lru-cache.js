var bytewise = require('bytewise')

function LevelLRUCache(level, maxItems) {
  this.level = level
  this.maxItems = maxItems }

function touchOperation(key) {
  return {
    type: 'put',
    key: bytewise.encode([ 'touches', Date.now() ]),
    value: key } }

function putOperation(key, value) {
  return {
    type: 'put',
    key: valueKey(key),
    value: value } }

function valueKey(key) {
  return bytewise.encode([ 'values', key ]) }

LevelLRUCache.prototype.put = function(key, value, callback) {
  var operations = [ putOperation(key, value), touchOperation(key) ]
  this.level.batch(operations, function(error) {
    if (error) {
      callback(error) }
    else {
      this.count(function(error, count) {
        if (error) {
          callback(error) }
        else {
          if (count < this.maxItems) {
            callback(null) }
          else {
             } } }) } }) }

LevelLRUCache.prototype.count = function(callback) {
  var count = 0
  var errored = false
  this.level.createReadStream({
    keys: true,
    values: false,
    gt: bytewise.encode([ 'values', null ]),
    lt: bytewise.encode([ 'values', undefined ]) })
  .on('error', function(error) {
    errored = true
    callback(error) })
  .on('data', function() {
    count += 1 })
  .on('end', function() {
    if (!errored) {
      callback(null, count) } }) }

LevelLRUCache.prototype.get = function(key, callback) {
  var level = this.level
  level.batch([ touchOperation(key) ], function(error) {
    if (error) {
      callback(error) }
    else {
      level.get(valueKey(key), function(error, value) {
        if (error) {
          callback(error) }
        else {
          callback(null, value) } }) } }) }

module.exports = LevelLRUCache
