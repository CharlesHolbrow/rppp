/* eslint-env mocha */
require('mocha')
require('should')

const parser = require('../src/parser-debug')
const specialize = require('../src/specialize')
const { VstB64 } = require('../src/vst-utils')
const data = require('./data')

describe('test-vst.js', function () {
  describe('parse and serialize (with vst2)', function () {
    it('should parse and specialize a VST2 without error', function () {
      const struct = parser.parse(data.reaSynDrVst2String)
      specialize(struct)
    })
  })

  describe.skip('vst2 helpers', function () {
    it('should have some extra helpers for VST plugins', () => {})
  })

  // VST2s encode a bunch of info in their first line (encoded in base64). Most of
  // the spec is described here:
  // https://forum.cockos.com/showthread.php?t=240523
  //
  // Some useful details follow:
  // VST2 Magic value is            `Buffer.from('EE5EEDFE', 'hex')`
  //
  // Here's what Tracktion returns for Zebra2 vst2
  // "uidHex": "534d4432",
  // "uidInt": 1397572658,

  // Here's what Tracktion returns for DragonflyRoomReverb
  // "uidHex": "64667232", // Translates to dfr2
  // "uidInt": 1684435506, // ID uint
  // The end of the first line
  //          '1684435506<56535464667232647261676F6E666C79>',
  // And here's the first line of a DragonflyRoomReverb
  // 'MnJmZO5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAZgEAAAEAAAAAABAA',
  // The first four bytes in Hex: 32 77 66 64
  // The first four characters:   2  r  f  d

  describe('VstB64', function () {
    it('should provide getters and setters for vst2id', function () {
      const l1 = new VstB64()
      l1.vst2IdAscii = 'dfr2'
      l1.vst2IdHex.should.equal(Buffer.from('64667232', 'hex').toString('hex'))
      l1.vst2IdNumber.should.equal(1684435506)

      l1.vst2IdHex = '534d4432'
      l1.vst2IdAscii.should.equal('SMD2')
      l1.vst2IdNumber.should.equal(1397572658)

      l1.vst2IdNumber = 1684435506
      l1.vst2IdAscii.should.equal('dfr2')
    })

    describe('toUint8Array', function () {
      it('should contain a little-endian plugin id in the first four bytes', function () {
        const l1 = new VstB64({ vstIdAscii: 'dfr2' })
        Array.from(l1.toUint8Array().slice(0, 4)).should.deepEqual([0x32, 0x72, 0x66, 0x64])
      })
    })

    describe('fromUint8Array', function () {
      const vst2Base64String = 'MnJmZO5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAZgEAAAEAAAAAABAA'
      const vst3Base64String = 'TNxYYu5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAA/AgAAAEAAAD//xAA'
      let vst2FirstLine
      let vst3FirstLine

      before(function () {
        let buffer = Buffer.from(vst2Base64String, 'base64')
        let uint8Array = new Uint8Array(buffer)
        vst2FirstLine = VstB64.fromUint8Array(uint8Array)

        buffer = Buffer.from(vst3Base64String, 'base64')
        uint8Array = new Uint8Array(buffer)
        vst3FirstLine = VstB64.fromUint8Array(uint8Array)
      })

      it('should correctly parse the id', function () { vst2FirstLine.vst2IdAscii.should.equal('dfr2') })
      it('should correctly parse the numIn', function () { vst2FirstLine.numIn.should.equal(2) })
      it('should correctly parse the numOut', function () { vst2FirstLine.numOut.should.equal(2) })
      it('should correctly reverse itself (VST2)', function () { vst2FirstLine.toString().should.equal(vst2Base64String) })
      it('should correctly reverse itself (VST3)', function () { vst3FirstLine.toString().should.equal(vst3Base64String) })
    })
  })
})
