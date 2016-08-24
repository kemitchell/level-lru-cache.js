var encode = require('./encode')

module.exports = function putOperation (cacheKey, value) {
  return {
    type: 'put',
    key: encode([cacheKey, Date.now()]),
    value: value
  }
}
