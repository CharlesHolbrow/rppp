/* eslint-env mocha */
require('mocha')
require('should')

const rppp = require('..')

describe('test-time-tempo-automation.js (rppp.objects.ReaperTempoTimeSigAutomation)', function () {
  const obj = rppp.specialize(new rppp.objects.ReaperTempoTimeSigAutomation())

  describe('.addTimeSignature', function () {
    it('should append a time signature', function () {
      obj.addTimeSignature(9, 12, 3.5)
      obj.getStructByToken('PT').params.should.deepEqual([3.5, 120, 1, 786441, 0, 3])
    })  
  })
})


