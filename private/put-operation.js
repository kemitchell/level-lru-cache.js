var encode = require('./encode')

module.exports = putOperation

function putOperation(cacheKey, value) {
  return {
    type: 'put',
    key: encode([ cacheKey, Date.now() ]),
    value: value } }
