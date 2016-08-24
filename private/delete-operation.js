module.exports = deleteOperation

function deleteOperation (levelUPKey) {
  return {
    type: 'del',
    key: levelUPKey
  }
}
