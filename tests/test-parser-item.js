/* eslint-env mocha */
require('mocha')
require('should')
const parser = require('../src/parser-debug')

const rppTrackItemStringModified = `<ITEM
  POSITION 2.66666666666667
  SNAPOFFS 0
  LENGTH 0.33333333333333
  LOOP 1
  ALLTAKES 0
  FADEIN 1 0 0 1 0 0 0
  FADEOUT 1 0 0 1 0 0 0
  MUTE 0 0
  SEL 1
  IGUID {62DB51D0-B9CC-EB4B-AE0D-6D7A4C6187FE}
  IID 7
  NAME -6db
  VOLPAN 1 -0.5 0.501187 -1
  SOFFS 0
  PLAYRATE 1 1 0 -1 0 0.0025
  CHANMODE 1
  GUID {63074C1F-71AA-4440-B51E-83037C6D1BEC}
  <SOURCE WAVE
    FILE "media/snare.wav"
  >
>`

describe('test-parser-item.js', function () {
  const base = parser.parse(rppTrackItemStringModified)

  describe('NAME', function () {
    const [name] = base.getStructByToken('NAME').params
    it('should parse the correct name value', function () {
      name.should.equal('-6db')
    })
  })

  describe('VOLPAN', function () {
    const [trim, pan, gain, mode] = base.getStructByToken('VOLPAN').params

    it('should parse trim', function () { trim.should.equal(1) })
    it('should parse pan', function () { pan.should.equal(-0.5) })
    it('should parse gain', function () { gain.should.equal(0.501187) })
    it('should parse mode', function () { mode.should.equal(-1) })
  })
})
