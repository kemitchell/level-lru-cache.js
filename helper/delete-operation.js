module.exports = deleteOperation

function deleteOperation(levelKey) {
  return { type: 'del', key: levelKey } }
