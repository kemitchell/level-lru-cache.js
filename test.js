var Cache = require('./')
var levelup = require('levelup')
var memdown = require('memdown')
var tape = require('tape')

function testCache(limit) {
  var level = levelup({ db: memdown })
  var cache = new Cache(level, limit)
  return cache }

tape.test('set and get', function(test) {
  test.plan(5)
  var cache = testCache()
  cache.put('a', 'b', function(error) {
    test.error(error, 'no put error')
    cache.get('a', function(error, value) {
      test.error(error, 'no get error')
      test.equal(value, 'b', 'returns cached value')
      cache.count(function(error, count) {
        test.error(error, 'count error')
        test.equal(count, 1, 'count is 1') }) }) }) })

tape.test('rolls off old values', function(test) {
  test.plan(4)
  var cache = testCache(1)
  cache.put('a', '1', function(error) {
    test.error(error, 'no put error')
    cache.put('b', '2', function(error) {
      test.error(error, 'no put error')
      cache.get('a', function(error, value) {
        test.error(error, 'no get error')
        test.equal(value, undefined, 'first cached is undefined') }) }) }) })
