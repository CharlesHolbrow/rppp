/* eslint-env mocha */
require('mocha')
require('should')

const parser = require('../src/parser-debug')
const { ReaperSource } = require('../src/reaper-objects')
const specialize = require('../src/specialize')

const sourceMp3String = `<SOURCE MP3
  FILE "media/909-kick.mp3"
>`
const sourceSectionString = `<SOURCE SECTION
  LENGTH 0.4071655328798
  MODE 1
  STARTPOS 0.05
  OVERLAP 0.01
  <SOURCE MP3
    FILE "media/909-kick.mp3"
  >
>`

describe('test-source.js', function () {
  describe('SOURCE MIDI', function () {
    it('append an "all notes off" message when a length is specified', function () {
      const sourceObj = new ReaperSource()
      sourceObj.makeMidiSource()
      sourceObj.setMidiNotes([
        { n: 0, s: 0.0, l: 0.25 },
        { n: 1, s: 0.5, l: 0.50 }
      ], 2)
      const allNotesOff = sourceObj.contents[sourceObj.contents.length - 1]
      allNotesOff.should.containDeep({ token: 'E', params: [960 * 4, 'b0', '7b', '00'] })
    })
  })

  describe('SOURCE SECTION', function () {
    const mp3SourceConfig = { token: 'SOURCE', params: ['MP3'], contents: [{ token: 'FILE', params: ['media/909-kick.mp3'] }] }
    const source = specialize(parser.parse(sourceMp3String))
    const sectionSource = specialize(parser.parse(sourceSectionString))
    const mp3Source = new ReaperSource(mp3SourceConfig)

    it('should add correctly identify the type', function () {
      sectionSource.isSectionSource().should.be.true()
    })

    describe('makeSectionSource', function () {
      it('should be an mp3 source before calling .makeSectionSource()', function () {
        source.isMp3Source().should.be.true('should')
        source.should.containDeep(mp3SourceConfig)
      })
      it('should become a SECTION source', function () {
        source.makeSectionSource()
        source.isSectionSource().should.be.true()

        const child = source.getStructByToken('SOURCE')
        child.should.deepEqual(mp3Source)
      })
    })
  })
})
