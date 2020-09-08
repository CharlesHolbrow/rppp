
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

module.exports = {
  splitBase64String
}
