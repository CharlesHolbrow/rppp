const asciiDecoder = new TextDecoder('utf-8')
const asciiEncoder = new TextEncoder('utf-8')

const fromAscii = str => asciiEncoder.encode(str)
const toAscii = str => asciiDecoder.decode(str)
const fromHexString = hexString => new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))) // '0000000f' -> [0, 0, 0, 15]
const toHexString = bytes => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '')

class BitMask {
  constructor (lengthOrTypedArray) {
    if (typeof lengthOrTypedArray === 'number') {
      this.data = new Uint8Array(lengthOrTypedArray)
    } else if (lengthOrTypedArray.buffer instanceof ArrayBuffer) {
      this.data = new Uint8Array(lengthOrTypedArray)
    } else {
      throw new Error('BitMask required a length in bytes')
    }
  }

  setBit (index) {
    const bitIndex = index % 8
    const byteIndex = Math.floor(index / 8)
    const byte = this.data[byteIndex]
    const mask = 1 << bitIndex
    this.data[byteIndex] = mask | byte
  }

  clearBit (index) {
    const bitIndex = index % 8
    const byteIndex = Math.floor(index / 8)
    const byte = this.data[byteIndex]
    const mask = 1 << bitIndex
    this.data[byteIndex] = ~mask & byte
  }

  getBit (index) {
    const bitIndex = index % 8
    const byteIndex = Math.floor(index / 8)
    const byte = this.data[byteIndex]
    const mask = 1 << bitIndex
    return mask & byte
  }

  toString () {
    return new Array(this.length).fill(0).map((_, i) => this.getBit(i) ? '1' : '0').join('')
  }

  get numBytes () { return this.data.length }
  get numBits () { return this.data.length * 8 }

  toVstIoBlock () {
    const result = new Uint8Array(4 + this.numBytes)
    const view = new DataView(result.buffer)
    view.setUint32(0, Math.floor(this.numBytes / 8), true)
    this.data.forEach((byte, i) => { view.setUint8(i + 4, byte) })
    return result
  }
}

/**
 * Utility class for generating the first line of Reaper VST2 chunk. See:
 * https://forum.cockos.com/showpost.php?p=2325823&postcount=2
 */
class Vst2LineOne {
  static makeVstMagic () { return new Uint8Array([0xEE, 0x5E, 0xED, 0xFE]) }
  static makeFooter () { return new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00]) }
  static makeUnknown () { return new Uint8Array([0x00, 0x00, 0x00, 0x00]) }
  static makeIoBlock (numChannels) {
    const length = 4 + numChannels * 8
    const data = new Uint8Array(length)
    new DataView(data.buffer).setUint32(0, numChannels, true)
    return data
  }

  constructor ({ numIn = 2, numOut = 2, vstIdAscii = 'AAAA' } = {}) {
    // Here's the normal way to represent VST2 IDs as a number: Convert each of
    // the four characters to a byte. Then interpret the four byte sequence as
    // a big-endian int. I believe this is an Unsigned bid-endian int, but I am
    // not %100 sure.
    this._vst2Id = 0
    this.numIn = numIn
    this.numOut = numOut
    this.vst2IdAscii = vstIdAscii
    this.unknown = Vst2LineOne.makeUnknown()
    this.footer = Vst2LineOne.makeFooter()
  }

  set numIn (numIn) { this.inputMask = new BitMask(numIn) }
  set numOut (numOut) { this.outputMask = new BitMask(numOut) }
  get numIn () { return this.inputMask.numBytes / 8 }
  get numOut () { return this.outputMask.numBytes / 8 }

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

  /**
   * Convert a UInt8Array to a FirstLine instance
   * @param {UInt8Array} data
   */
  static fromBuffer (data) {
    if (!(data instanceof Uint8Array)) throw new Error('fromBuffer did not get a Uint8Array')
    const view = new DataView(data.buffer)

    const idNumber = view.getUint32(0, true)
    const numIn = view.getUint32(8, true)
    const numOut = view.getUint32(8 + 4 + numIn * 8, true)

    const firstLine = new Vst2LineOne()
    firstLine.vst2IdNumber = idNumber

    let i = 8 + 4
    firstLine.inputMask = new BitMask(data.subarray(i, i += 8 * numIn))
    i += 4
    firstLine.outputMask = new BitMask(data.subarray(i, i += 8 * numOut))
    firstLine.unknown = data.subarray(i, i += 4)
    firstLine.footer = data.subarray(i, i += 8)

    return firstLine
  }

  toBuffer () {
    // Store vst2 in four bytes as little endian
    const length =
      8 + // 4 character vst2 id + 4 character vstMagic
      4 + // 4 bytes for the number of inputs
      this.numIn * 8 + // input channel bit mask
      4 + // 4 bytes for the number of outputs
      this.numOut * 8 + // output channel bit mask
      4 + // something unknown
      8 // 01 00 00 00 00 00 10 00

    const data = new Uint8Array(length)
    const view = new DataView(data.buffer)
    view.setUint32(0, this.vst2IdNumber, true) // little-endian vstID
    data.set(Vst2LineOne.makeVstMagic(), 4) // vst magic

    // Input and Output channel count + bit mask
    let i = 8
    const inBlock = this.inputMask.toVstIoBlock()
    data.set(inBlock, i)
    i += inBlock.length
    const outBlock = this.outputMask.toVstIoBlock()
    data.set(outBlock, i)
    i += outBlock.length

    // Unknown section + footer
    data.set(this.unknown, i)
    i += this.unknown.length // should always be 4
    data.set(this.footer, i)
    i += this.footer.length // should always be 8

    return data
  }

  // Get a stringified version of the underlying buffer
  nodeToString () {
    return Buffer.from(this.toBuffer()).toString('base64')
  }
}

module.exports = {
  Vst2LineOne,
  BitMask
}
