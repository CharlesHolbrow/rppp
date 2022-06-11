/* eslint-env mocha */
require('mocha')
const should = require('should')
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

const rppTrackItemNumberName = `<ITEM
  POSITION 1.25777827441979
  SNAPOFFS 0
  LENGTH 0.6288891372099
  LOOP 0
  ALLTAKES 0
  FADEIN 1 0 0 1 0 0 0
  FADEOUT 1 0 0 1 0 0 0
  MUTE 0 0
  SEL 0
  IGUID {EC7D9D45-D00D-994F-BF28-2E45B5A268A6}
  IID 2
  NAME 3
  VOLPAN 1 0 1 -1
  SOFFS 1.42360538789619
  PLAYRATE 1 0 0 -1 0 0.0025
  CHANMODE 0
  GUID {E485D319-595A-EB4B-976C-3365529ECD72}
  <SOURCE WAVE
    FILE "marvin-gaye-whats-happening-brother.wav"
  >
>`

describe('test-parser-item.js', function () {
  const base = parser.parse(rppTrackItemStringModified)

  describe('NAME', function () {
    const [firstParam] = base.getStructByToken('NAME').params
    it('should parse the correct name value', function () {
      firstParam.should.equal('-6db')
    })

    it('should return strings even when argument is a valid number', function () {
      const itemWithNumberName = parser.parse(rppTrackItemNumberName)
      const [firstParam] = itemWithNumberName.getStructByToken('NAME').params
      should(firstParam).be.a.String()
      should(firstParam).equal('3')
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
