const asciiDecoder = new TextDecoder('utf-8')
const asciiEncoder = new TextEncoder('utf-8')

const fromAscii = str => asciiEncoder.encode(str)
const toAscii = str => asciiDecoder.decode(str)
const fromHexString = hexString => new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))) // '0000000f' -> [0, 0, 0, 15]
const toHexString = bytes => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')

class Vst2LineOne {
  constructor ({ numIn = 2, numOut = 2, vstIdAscii = 'AAAA' } = {}) {
    // Here's the normal way to represent VST2 IDs as a number: Convert each of
    // the four characters to a byte. Then interpret the four byte sequence as
    // a big-endian int. I believe this is an Unsigned bid-endian int, but I am
    // not %100 sure.
    this._vst2Id = 0
    this.numIn = numIn
    this.numOut = numOut
    this.vst2IdAscii = vstIdAscii
  }

  get vst2IdAscii () {
    const uint8array = new Uint8Array(4)
    new DataView(uint8array.buffer).setUint32(0, this._vst2Id, false)
    return toAscii(uint8array)
  }

  /**
   * @param {string} v
   */
  set vst2IdAscii (v) {
    if (v.length !== 4) throw new Error('Invalid vst2IdAscii string')
    this._vst2Id = new DataView(fromAscii(v).buffer).getUint32(0, false)
  }

  get vst2IdHex () {
    const uint8array = new Uint8Array(4)
    new DataView(uint8array.buffer).setUint32(0, this._vst2Id, false)
    return toHexString(uint8array)
  }

  /**
   * @param {string} v vst2 id in hex format
   */
  set vst2IdHex (v) {
    if (v.length !== 8) throw new Error('Invalid vst2IdHex string')
    const uint8array = fromHexString(v)
    this._vst2Id = new DataView(uint8array.buffer).getUint32(0, false)
  }

  get vst2IdNumber () {
    return this._vst2Id
  }

  /**
   * @param {number} n the Vst2ID as a number
   */
  set vst2IdNumber (v) {
    this._vst2Id = v
  }

  toBuffer () {
    // Store vst2 in four bytes as little endian
    const uint8array = new Uint8Array(4)
    new DataView(uint8array.buffer).setUint32(0, this._vst2Id, true)
    return uint8array
  }
}

module.exports.Vst2LineOne = Vst2LineOne
