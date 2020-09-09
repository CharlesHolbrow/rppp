function splitBase64String (b64) {
  const lines = []
  let startIdx = 0
  for (var i = 0; i < b64.length; i++) {
    if (i % 128 === 0 && i !== 0) {
      lines.push(b64.slice(startIdx, i))
      startIdx = i
    }
  }
  if (b64.length % 128 !== 0) lines.push(b64.slice(startIdx, b64.length))
  return lines
}

function base64StringByteLength (str) {
  let delta = 0
  if (str.slice(-2) === '==') delta = -2
  else if (str.slice(-1) === '=') delta = -1
  return Math.round(str.length / 4 * 3) + delta
}
// Charles: base64StringByteLength probably doesn't need to be tested again.
// Just in case:
// describe('base64StringByteLength', function () {
//   it('should correctly return the size of the buffer for any input string', function () {
//     for (let i = 0; i < 100; i++) {
//       const byteLength = Math.floor(Math.random() * 129)
//       const randomBytes = crypto.randomBytes(byteLength)
//       base64StringByteLength(randomBytes.toString('base64')).should.equal(byteLength)
//     }
//   })
// })

module.exports = {
  splitBase64String,
  base64StringByteLength
}
