/* eslint-env mocha */

const { ReaperVst } = require('../src/reaper-objects')
const { Vst2LineOne } = require('../src/vst-utils')

// This is a stub. we want to add helpers that describe the behavior here:
// https://forum.cockos.com/showthread.php?t=240523
// VST2 Magic value is            `Buffer.from('EE5EEDFE', 'hex')`
//
// Here's what Tracktion returns for Zebra2 vst2
// "uidHex": "534d4432",
// "uidInt": 1397572658,

// Here's what Tracktion returns for DragonflyRoomReverb
// "uidHex": "64667232", // Translates to dfr2
// "uidInt": 1684435506, // Big Endian Uint
// The end of the first line
//          '1684435506<56535464667232647261676F6E666C79>',
// And here's the first line of a DragonflyRoomReverb
// 'MnJmZO5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAZgEAAAEAAAAAABAA',
// The first four bytes in Hex: 32 77 66 64
// The first four characters:   2  r  f  d

describe('Vst2LineOne', function () {
  it('should provide getters and setters for vst2id', function () {
    const l1 = new Vst2LineOne()
    l1.vst2IdAscii = 'dfr2'
    l1.vst2IdHex.should.equal(Buffer.from('64667232', 'hex').toString('hex'))
    l1.vst2IdNumber.should.equal(1684435506)

    l1.vst2IdHex = '534d4432'
    l1.vst2IdAscii.should.equal('SMD2')
    l1.vst2IdNumber.should.equal(1397572658)
  })

  describe('toBuffer', function () {
    it('should contain a little-endian plugin id in the first four bytes', function () {
      const l1 = new Vst2LineOne({ vstIdAscii: 'dfr2' })
      Array.from(l1.toBuffer().slice(0, 4)).should.deepEqual([0x32, 0x72, 0x66, 0x64])
    })
  })
})

describe('vst2', function () {
  it('should have some extra helpers for VST plugins', () => {
    const vst = new ReaperVst({
      token: 'VST',
      params: [
        '"VST: DragonflyRoomReverb-vst (Michael Willis)"',
        'DragonflyRoomReverb-vst.so',
        0,
        '',
        '1684435506<56535464667232647261676F6E666C79>',
        '',
        'MnJmZO5e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAZgEAAAEAAAAAABAA', // id: 2 in 2 out
        'cHJlc2V0AE1lZGl1bSBDbGVhciBSb29tAABkcnlfbGV2ZWwAODAuMDAwMDAwAGVhcmx5X2xldmVsADEwLjAwMDAwMABlYXJseV9zZW5kADIwLjAwMDAwMABsYXRlX2xldmVsADIwLjAwMDAwMABzaXplADkuMDAwMDAwAHdpZHRoADEwMC4wMDAwMDAAcHJlZGVsYXkANDkuMDAwMDAwAGRlY2F5ADIuNDAwMDAwAGRpZmZ1c2UANzAuMDAwMDAwAHNwaW4AMC44MDAwMDAAd2FuZGVyADQwLjAwMDAwMABpbl9oaWdoX2N1dAAxNjAwMC4wMDAwMDAAZWFybHlfZGFtcAAxMDAwMC4wMDAwMDAAbGF0ZV9kYW1wADk0MDAuMDAwMDAwAGxvd19ib29zdAA1MC4wMDAwMDAAYm9vc3RfZnJlcQA2MDAuMDAwMDAwAGluX2xvd19jdXQANC4wMDAwMDAAAA==',
        'AAAQAAAA'
      ],
      externalAttributes: {
        BYPASS: [0, 0, 0],
        PRESETNAME: ['Factory Presets: Factory Default'],
        FLOATPOS: [0, 0, 0, 0],
        FXID: ['{7E06E29C-0388-DD4B-9B13-BB5F766225B7}'],
        WAK: [0, 0]
      },
      contents: []
    })
  }) // it should (vst helpers)
})
