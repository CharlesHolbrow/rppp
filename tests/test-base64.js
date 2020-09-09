/* eslint-env mocha */
require('mocha')
require('should')

const parser = require('../src/parser-debug')
const ReaperBase = require('../src/reaper-base')

// The simplest possible base64 param
const noWrapExamples = [
  ['  ZXZ\n', 'ZXZ'],
  ['  ZXZh=\n', 'ZXZh='],
  ['  +/=\n', '+/='],
  ['  ZXZhdxgAAA==\n', 'ZXZhdxgAAA==']
]

// 129 A characters
const wrapResult = new Array(129).fill('A').join('')
const wrapExample =
`  AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
  A
`

describe('base64', function () {
  describe('base64 parser', function () {
    it('should handle simple no-wrap lines', function () {
      for (const [input, result] of noWrapExamples) {
        parser.parse(input, { startRule: 'b64' }).should.equal(result)
      }
    })

    it('should handle a wrapping line', function () {
      parser.parse(wrapExample, { startRule: 'b64' }).should.equal(wrapResult)
    })
  })

  describe('base64 objects', function () {
    it('should handle known objects with base64 arguments', function () {
      parser.parse('<RECORD_CFG\n  ZXZhdxgAAA==\n>').should.deepEqual(new ReaperBase({
        token: 'RECORD_CFG',
        b64Chunks: ['ZXZhdxgAAA==']
      }))
    })

    it('should handle known objects with base64 arguments and line wraps', function () {
      const str = '<RECORD_CFG\n  776t3g3wrd6bJAA+0tNVPQAAAAB8ppE8cbkLPAAAAAAAAIA/PBIXPAAAAAAAAAAAvTeGNQAAgD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHN0b2NrIC0gc3Rl\n  YWR5IHJvY2sga2ljawAAAAAA\n>'
      parser.parse(str).should.deepEqual(new ReaperBase({
        token: 'RECORD_CFG',
        b64Chunks: ['776t3g3wrd6bJAA+0tNVPQAAAAB8ppE8cbkLPAAAAAAAAIA/PBIXPAAAAAAAAAAAvTeGNQAAgD8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHN0b2NrIC0gc3RlYWR5IHJvY2sga2ljawAAAAAA']
      }))
    })
  })
})
