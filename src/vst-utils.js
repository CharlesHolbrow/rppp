class Vst2LineOne {
  constructor (settings = { numIn: 2, numOut: 2, vstIdAscii: 'AAAA' }) {
    this._vst2IdBuffer = Buffer.from([0, 0, 0, 0])
    this.numIn = settings.numIn
    this.numOut = settings.numOut
    this.vst2IdAscii = settings.vstIdAscii
  }

  get vst2IdAscii () {
    return this._vst2IdBuffer.toString('ascii')
  }

  set vst2IdAscii (v) {
    Buffer.from(v, 'ascii').copy(this._vst2IdBuffer)
  }

  get vst2IdHex () {
    return this._vst2IdBuffer.toString('hex')
  }

  /**
   * @param {string} v vst2 id in hex format
   */
  set vst2IdHex (v) {
    if (v.length !== 8) throw new Error('Invalid vst2IdHex string')
    Buffer.from(v, 'hex').copy(this._vst2IdBuffer)
  }

  get vst2IdNumber () {
    return this._vst2IdBuffer.readUInt32BE(0)
  }

  get vst2IdUIntBigEndian () {
    throw new Error('To get an the id as a number, use vst2IdNumber')
  }

  /**
   * @param {number} n the Vst2ID, interpreted as an big-endian uint.
   */
  set vst2IdUIntBigEndian (v) {
    this._vst2IdBuffer.writeUInt32BE(v, 0)
  }

  toBuffer () {
    const result = Buffer.alloc(4)
    result.writeUInt32LE(this.vst2IdNumber)
    return result
  }
}

module.exports.Vst2LineOne = Vst2LineOne
