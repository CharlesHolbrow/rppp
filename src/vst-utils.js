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
    return new Array(this.numBits).fill(0).map((_, i) => this.getBit(i) ? '1' : '0').join('')
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
 *
 * This aims to use Uint8Array instead of Buffer were possible, so that it can
 * easily be used in the browser as well as in node.js. As of September 2020
 * the nodeToString method uses Buffer for converting to base64.
 */
class Vst2LineOne {
  static makeVst2Magic () { return new Uint8Array([0xEE, 0x5E, 0xED, 0xFE]) } // same as: [ 238, 94, 237, 254 ]
  static makeVst3Magic () { return new Uint8Array([0xEF, 0x5E, 0xED, 0xFE]) } // same as: [ 239, 94, 237, 254 ]
  static makeFooter () { return new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10, 0x00]) }
  static makeIoBlock (numChannels) {
    const length = 4 + numChannels * 8
    const data = new Uint8Array(length)
    new DataView(data.buffer).setUint32(0, numChannels, true)
    return data
  }

  constructor ({ numIn = 2, numOut = 2, vstIdAscii = 'AAAA' } = {}) {
    // Here's the normal way to represent VST2 IDs as a number: Convert each of
    // the four characters to a byte. Then interpret the four byte sequence as
    // a big-endian int. I believe this is an UNSIGNED big-endian int, but I am
    // not %100 sure.
    this._vst2Id = 0
    this.numIn = numIn
    this.numOut = numOut
    this.vst2IdAscii = vstIdAscii
    this.magic = Vst2LineOne.makeVst2Magic()
    this.stateSize = 0
    this.footer = Vst2LineOne.makeFooter()
  }

  set numIn (numIn) { this.inputMask = new BitMask(numIn) }
  set numOut (numOut) { this.outputMask = new BitMask(numOut) }
  get numIn () { return this.inputMask.numBytes / 8 }
  get numOut () { return this.outputMask.numBytes / 8 }

  // It is helpful to get and set some members in several different formats. For
  // example, the vst2Id can be expressed as an integer, an ASCII string, or a
  // hex string. The next group of functions are for getting and setting members
  // in a variety of different formats

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

  // The next block of functions are for converting to and from the base64
  // format that is directly used in .RPP chunks.

  /**
   * Convert a UInt8Array to a FirstLine instance
   * @param {UInt8Array} data
   */
  static fromUint8Array (data) {
    if (!(data instanceof Uint8Array)) throw new Error('fromBuffer did not get a Uint8Array')
    const view = new DataView(data.buffer, data.byteOffset)

    const idNumber = view.getUint32(0, true)
    const magic = data.subarray(4, 8)
    const numIn = view.getUint32(8, true)
    const numOut = view.getUint32(8 + 4 + numIn * 8, true)

    const firstLine = new Vst2LineOne()
    firstLine.vst2IdNumber = idNumber
    firstLine.magic = magic

    let i = 8 + 4 // skip id, magic, numIn
    firstLine.inputMask = new BitMask(data.subarray(i, i += 8 * numIn))
    i += 4 // skip numOut
    firstLine.outputMask = new BitMask(data.subarray(i, i += 8 * numOut))
    firstLine.stateSize = view.getUint32(i, true)
    i += 4 // skip stateSize
    firstLine.footer = data.subarray(i, i += 8)

    return firstLine
  }

  toUint8Array () {
    // Store vst2 in four bytes as little endian
    const length =
      8 + // 4 character vst2 id + 4 character vstMagic
      4 + // 4 bytes for the number of inputs
      this.numIn * 8 + // input channel bit mask
      4 + // 4 bytes for the number of outputs
      this.numOut * 8 + // output channel bit mask
      4 + // stateSize
      8 // 01 00 00 00 00 00 10 00

    const data = new Uint8Array(length)
    const view = new DataView(data.buffer)
    view.setUint32(0, this.vst2IdNumber, true) // little-endian vstID
    data.set(this.magic, 4) // vst magic

    // Input and Output channel count + bit mask
    let i = 8
    const inBlock = this.inputMask.toVstIoBlock()
    data.set(inBlock, i)
    i += inBlock.length
    const outBlock = this.outputMask.toVstIoBlock()
    data.set(outBlock, i)
    i += outBlock.length

    // State size + footer
    view.setUint32(i, this.stateSize, true)
    i += 4
    data.set(this.footer, i)
    i += this.footer.length // should always be 8

    return data
  }

  /**
   * CAUTION: toString depends on Buffer, and will not work in the browser
   * Get a stringified version of the underlying buffer
   * @returns {string}
   */
  toString () {
    return Buffer.from(this.toUint8Array()).toString('base64')
  }

  /**
   * CAUTION: fromString depends on Buffer, and will not work in the browser
   * @param {string} s base64 string encoding of first line
   * @returns  {Vst2LineOne}
   */
  static fromString (s) {
    const uint8Array = new Uint8Array(Buffer.from(s, 'base64'))
    return Vst2LineOne.fromUint8Array(uint8Array)
  }
}

module.exports = {
  Vst2LineOne,
  BitMask
}
