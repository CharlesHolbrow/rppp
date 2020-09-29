/* eslint-env mocha */
require('mocha')
require('should')

const { ReaperSource } = require('../src/reaper-objects')

describe('test-midi.js', function () {
  describe('ReaperSource', function () {
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
})
