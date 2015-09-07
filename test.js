var Cache = require('./')
var levelup = require('levelup')
var memdown = require('memdown')
var series = require('async-series')
var tape = require('tape')

function testCache(limit) {
  var level = levelup({ db: memdown })
  var cache = new Cache(level, limit)
  return cache }

tape.test('string keys', function(test) {
  var cache = testCache()
  test.throws(
    function() { cache.put(new Date(), 'x') },
    /string/,
    '.put() requires string keys')
  test.throws(
    function() { cache.get(new Date()) },
    /string/,
    '.get() requires string keys')
  test.end() })

tape.test('put and get', function(test) {
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

tape.test('missing value', function(test) {
  test.plan(1)
  var cache = testCache()
  cache.get('nada', function(error, value) {
    test.equal(value, undefined, 'nonexistent value is undefined') }) })

tape.test('least recently put', function (test) {
  var cache = new testCache(2)
  series(
    [ cache.put.bind(cache, 'a', 'A'),
      cache.put.bind(cache, 'b', 'B'),
      cache.put.bind(cache, 'c', 'C'),
      function(done) {
        cache.get('c', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, 'C', 'c is C')
          done() }) },
      function(done) {
        cache.get('b', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, 'B', 'b is B')
          done() }) },
      function(done) {
        cache.get('a', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, undefined, 'a is undefined')
          done() }) } ],
    function(error) {
      test.ifError(error, 'no error')
      test.end() }) })

tape.test('recently gotten', function (test) {
  var cache = new testCache(2)
  series(
    [ cache.put.bind(cache, 'a', 'A'),
      cache.put.bind(cache, 'b', 'B'),
      function(done) {
        cache.get('a', function(error, value) {
          test.equal(value, 'A', 'a is A')
          done() }) },
      cache.put.bind(cache, 'c', 'C'),
      function(done) {
        cache.get('c', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, 'C', 'c is C')
          done() }) },
      function(done) {
        cache.get('b', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, undefined, 'b is undefined')
          done() }) },
      function(done) {
        cache.get('a', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, 'A', 'a is A')
          done() }) } ],
    function(error) {
      test.ifError(error, 'no error')
      test.end() }) })

tape.test('lru update via put', function(test) {
  var cache = new testCache(2)
  series(
    [ cache.put.bind(cache, 'foo', '1'),
      cache.put.bind(cache, 'bar', '2'),
      cache.put.bind(cache, 'baz', '3'),
      cache.put.bind(cache, 'qux', '4'),
      function(done) {
        cache.get('foo', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, undefined, 'foo is undefined')
          done() }) },
      function(done) {
        cache.get('bar', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, undefined, 'bar is undefined')
          done() }) },
      function(done) {
        cache.get('baz', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, '3', 'baz is 3')
          done() }) },
      function(done) {
        cache.get('qux', function(error, value) {
          test.ifError(error, 'no error')
          test.equal(value, '4', 'qux if 4')
          done() }) } ],
    function(error) {
      test.ifError(error, 'no error')
      test.end() }) })
