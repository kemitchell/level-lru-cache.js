var encode = require('bytewise').encode

module.exports = putOperation

function putOperation(cacheKey, value) {
  return {
    type: 'put',
    key: encode([ cacheKey, Date.now() ]),
    value: value } }
