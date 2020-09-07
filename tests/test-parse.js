/* eslint-env mocha */
require('mocha')
require('should')

const parser = require('../src/parser-debug')
const ReaperBase = require('../src/reaper-base')

describe('parser', function () {
  describe('object rule', function () {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, { startRule: 'object' })

    // TODO: Check if reaper ever puts objects one line
    it('should parse a one line object', function () {
      parse('<TEST 1\n>').should.deepEqual(new ReaperBase({
        token: 'TEST',
        params: [1],
        contents: []
      }))
    })

    it('should parse an object with no parameters', function () {
      parse('<TEST\n>').should.deepEqual(new ReaperBase({
        token: 'TEST',
        params: [],
        contents: []
      }))
    })

    it('should parse a multiline object with two structs', function () {
      parse('<NAME "GUITAR"\n  VOLUME 11\n>').should.deepEqual(new ReaperBase({
        token: 'NAME',
        params: ['GUITAR'],
        contents: [
          { token: 'VOLUME', params: [11] }
        ]
      }))
    })

    it('should parse a multiline object with two structs and indents', function () {
      parse('  <NAME "GUITAR"\n    VOLUME 11\n  >').should.deepEqual(new ReaperBase({
        token: 'NAME',
        params: ['GUITAR'],
        contents: [
          { token: 'VOLUME', params: [11] }
        ]
      }))
    })

    it('should parse a multiline object with two structs and an object', function () {
      parse('<NAME "GUITAR"\n  VOLUME 11\n  <METRONOME 6 2\n    VOL 0.25 0.125\n  >\n>').should.deepEqual(new ReaperBase({
        token: 'NAME',
        params: ['GUITAR'],
        contents: [
          { token: 'VOLUME', params: [11] },
          new ReaperBase({
            token: 'METRONOME',
            params: [6, 2],
            contents: [
              { token: 'VOL', params: [0.25, 0.125] }
            ]
          })
        ]
      }))
    })
  }) // Describe object Rule

  describe('int rule', function () {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, { startRule: 'int' })

    it('should parse 0', function () { parse('0').should.deepEqual(0) })
    it('should parse 100', function () { parse('100').should.deepEqual(100) })
    it('should parse negative integers', function () { parse('-10').should.deepEqual(-10) })
  }) // Describe int rule

  describe('decimal rule', function () {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, { startRule: 'decimal' })

    it('should parse 0.0', function () { parse('0.0').should.deepEqual(0) })
    it('should parse 0.5', function () { parse('0.5').should.deepEqual(0.5) })
    it('should parse 101.555', function () { parse('101.555').should.deepEqual(101.555) })
    it('should parse negative integers', function () { parse('-10.1234').should.deepEqual(-10.1234) })
  }) // Describe decimal rule

  describe('params rule', function () {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, { startRule: 'params' })

    const t01 = ' 0 1'
    it(`should parse "${t01}" as two ints`, function () {
      parse(t01).should.deepEqual([0, 1])
    })

    const t02 = ' 5 10'
    it(`should parse "${t02}" as two ints`, function () {
      parse(t02).should.deepEqual([5, 10])
    })

    const t03 = ' "ok" 1 2 3'
    it(`should parse "${t03}" as a string and three ints`, function () {
      parse(t03).should.deepEqual(['ok', 1, 2, 3])
    })

    const t04 = ' "" 1234{}'
    it(`should parse "${t04}" as an empty string and a string that starts with an integer`, function () {
      parse(t04).should.deepEqual(['', '1234{}'])
    })
  }) // describe params

  describe('string rule', function () {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, { startRule: 'string' })

    it('should parse double quoted strings', function () {
      parse('"Okay this is a string"').should.equal('Okay this is a string')
      parse('""').should.equal('')
    })

    it('should uandle unquoted strings (strings that do not start w/ a space, quote, or backtick)', () => {
      parse('aString').should.equal('aString')
      parse('hel"lo').should.equal('hel"lo')
      parse('hello"').should.equal('hello"')
    })

    it('should handle non-alphanumeric characters', function () {
      parse('"! ok"').should.equal('! ok')
      parse('"ok !"').should.equal('ok !')
      parse('!@#$%^&*()_+').should.equal('!@#$%^&*()_+')
    })

    it('should handle strings beginning with quotes', function () {
      parse('"\'\'"').should.equal('\'\'')
      parse('\'"\'').should.equal('"')
      parse('"```"').should.equal('```')
      parse('`"`').should.equal('"')
    })
  }) // describe string rule

  describe('multiline parameters', function () {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, { startRule: 'object' })

    it('should parse strings that start with a string delimiter and contain all delimiters', () => {
      parse('<NAME `\'\'\'\'\'\'"""`\n  <NAME\n    |\'\'\'```"""\n  >\n>').should.deepEqual(new ReaperBase({
        token: 'NAME',
        params: ['\'\'\'```"""'],
        contents: []
      }))
    })
  }) // describe multiline parameters rule
}) // describe parse

describe('special object parsing', function () {
  const parse = input => parser.parse(input, { startRule: 'object' })

  it('should parse NOTES objects', function () {
    parse('<NOTES\n  || Line one with extra pipes |\n  | Second Line\n>').should.deepEqual(new ReaperBase({
      token: 'NOTES',
      params: ['| Line one with extra pipes |\n Second Line'],
      contents: []
    }))
  })

  it('should parse REAPER_PROJECT objects', function () {
    parse('<REAPER_PROJECT 0.1 "6.13/OSX64" 1596785244\n>').should.deepEqual(new ReaperBase({
      token: 'REAPER_PROJECT',
      params: [0.1, '6.13/OSX64', 1596785244]
    }))
  })

  it('should parse TRACK objects', function () {
    parse('<TRACK\n  NAME scream\n>').should.deepEqual(new ReaperBase({
      token: 'TRACK',
      params: [],
      contents: [
        { token: 'NAME', params: ['scream'] }
      ]
    }))
  })

  it('should parse MidiItem objects', function () {
    parse(`<ITEM
POSITION 2
LENGTH 2
<SOURCE MIDI
  HASDATA 1 960 QN
  CCINTERP 32
  POOLEDEVTS {10F9B930-32BF-604C-86D1-B6819C2E6F41}
  E 0 90 3c 60
  E 480 80 3c 00
  E 0 b0 7b 00
>
>`).should.deepEqual(new ReaperBase({
      token: 'ITEM',
      params: [],
      contents: [
        { token: 'POSITION', params: [2] },
        { token: 'LENGTH', params: [2] },
        new ReaperBase({
          token: 'SOURCE',
          params: ['MIDI'],
          contents: [
            { token: 'HASDATA', params: [1, 960, 'QN'] },
            { token: 'CCINTERP', params: [32] },
            { token: 'POOLEDEVTS', params: ['{10F9B930-32BF-604C-86D1-B6819C2E6F41}'] },
            { token: 'E', params: [0, 90, '3c', 60] },
            { token: 'E', params: [480, 80, '3c', '00'] },
            { token: 'E', params: [0, 'b0', '7b', '00'] }
          ]
        })
      ]
    }))
  })

  it('should parse AudioItem objects', function () {
    parse('<ITEM\n  POSITION 2\n  LENGTH 10.2\n  <SOURCE WAVE\n    FILE "filename"\n  >\n>').should.deepEqual(new ReaperBase({
      token: 'ITEM',
      params: [],
      contents: [
        { token: 'POSITION', params: [2] },
        { token: 'LENGTH', params: [10.2] },
        new ReaperBase({
          token: 'SOURCE',
          params: ['WAVE'],
          contents: [
            { token: 'FILE', params: ['filename'] }
          ]
        })
      ]
    }))
  })

  it('should parse VST3 Plugins containing Base64', function () {
    parse(`<VST "VST3: #TStereo Delay (Tracktion)" "#TStereo Delay.vst3" 0 "" 1997878177{5653545344656C237473746572656F20} ""
oTMVd+9e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEgUAAAEAAAD//xAA
AgUAAAEAAABWc3RXAAAACAAAAAEAAAAAQ2NuSwAABOpGQkNoAAAAAlNEZWwAAQAmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUlBST0dSQU0A
AQRwbHVnaW5JRAABDwVUU3RlcmVvIERlbGF5AHByb2dyYW1EaXJ0eQABAQNjdXJyZW50UHJvZ3JhbQABEQVGYWN0b3J5IERlZmF1bHQAcHJvZ3JhbUlEAAABF1BBUkFN
AAECaWQAAQsFZGVsYXlzeW5jAHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQcFZHJ5ZGIAdmFsdWUAAQkEAAAAAAAARMAAUEFSQU0AAQJpZAABCAVlbmFibGUA
dmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABBwVpbnB1dAB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEQBWxjcm9zc2ZlZWRiYWNrAHZhbHVlAAEJBAAA
AAAAAAAAAFBBUkFNAAECaWQAAQoFbGRlbGF5bXMAdmFsdWUAAQkEAAAAAABAf0AAUEFSQU0AAQJpZAABDAVsZGVsYXlub3RlAHZhbHVlAAEJBAAAAAAAAAhAAFBBUkFN
AAECaWQAAQ4FbGRlbGF5b2Zmc2V0AHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQsFbGZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAD5AAFBBUkFNAAECaWQAAQoF
bGhpZ2hjdXQAdmFsdWUAAQkEAAAAAACI00AAUEFSQU0AAQJpZAABCQVsbG93Y3V0AHZhbHVlAAEJBAAAAAAAADRAAFBBUkFNAAECaWQAAQYFbHBhbgB2YWx1ZQABCQQA
AAAAAADwvwBQQVJBTQABAmlkAAEJBWxzb3VyY2UAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABEAVyY3Jvc3NmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAAAAABQ
QVJBTQABAmlkAAEKBXJkZWxheW1zAHZhbHVlAAEJBAAAAAAAQH9AAFBBUkFNAAECaWQAAQwFcmRlbGF5bm90ZQB2YWx1ZQABCQQAAAAAAAAIQABQQVJBTQABAmlkAAEO
BXJkZWxheW9mZnNldAB2YWx1ZQABCQQAAAAAAADwPwBQQVJBTQABAmlkAAELBXJmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAA+QABQQVJBTQABAmlkAAEKBXJoaWdoY3V0
AHZhbHVlAAEJBAAAAAAAiNNAAFBBUkFNAAECaWQAAQkFcmxvd2N1dAB2YWx1ZQABCQQAAAAAAAA0QABQQVJBTQABAmlkAAEGBXJwYW4AdmFsdWUAAQkEAAAAAAAA8D8A
UEFSQU0AAQJpZAABCQVyc291cmNlAHZhbHVlAAEJBAAAAAAAAABAAFBBUkFNAAECaWQAAQcFd2V0ZGIAdmFsdWUAAQkEAAAAAAAAJMAAAAAAAAAAAABKVUNFUHJpdmF0
ZURhdGEAAQFCeXBhc3MAAQEDAB0AAAAAAAAASlVDRVByaXZhdGVEYXRhAAAAAAAAAAA=
AEZhY3RvcnkgUHJlc2V0czogRmFjdG9yeSBEZWZhdWx0ABAAAAA=
>`).should.deepEqual(new ReaperBase({
      token: 'VST',
      params: ['VST3: #TStereo Delay (Tracktion)', '#TStereo Delay.vst3', 0, '', '1997878177{5653545344656C237473746572656F20}', '',
        'oTMVd+9e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEgUAAAEAAAD//xAA',
        'AgUAAAEAAABWc3RXAAAACAAAAAEAAAAAQ2NuSwAABOpGQkNoAAAAAlNEZWwAAQAmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUlBST0dSQU0AAQRwbHVnaW5JRAABDwVUU3RlcmVvIERlbGF5AHByb2dyYW1EaXJ0eQABAQNjdXJyZW50UHJvZ3JhbQABEQVGYWN0b3J5IERlZmF1bHQAcHJvZ3JhbUlEAAABF1BBUkFNAAECaWQAAQsFZGVsYXlzeW5jAHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQcFZHJ5ZGIAdmFsdWUAAQkEAAAAAAAARMAAUEFSQU0AAQJpZAABCAVlbmFibGUAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABBwVpbnB1dAB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEQBWxjcm9zc2ZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAAAAAFBBUkFNAAECaWQAAQoFbGRlbGF5bXMAdmFsdWUAAQkEAAAAAABAf0AAUEFSQU0AAQJpZAABDAVsZGVsYXlub3RlAHZhbHVlAAEJBAAAAAAAAAhAAFBBUkFNAAECaWQAAQ4FbGRlbGF5b2Zmc2V0AHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQsFbGZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAD5AAFBBUkFNAAECaWQAAQoFbGhpZ2hjdXQAdmFsdWUAAQkEAAAAAACI00AAUEFSQU0AAQJpZAABCQVsbG93Y3V0AHZhbHVlAAEJBAAAAAAAADRAAFBBUkFNAAECaWQAAQYFbHBhbgB2YWx1ZQABCQQAAAAAAADwvwBQQVJBTQABAmlkAAEJBWxzb3VyY2UAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABEAVyY3Jvc3NmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEKBXJkZWxheW1zAHZhbHVlAAEJBAAAAAAAQH9AAFBBUkFNAAECaWQAAQwFcmRlbGF5bm90ZQB2YWx1ZQABCQQAAAAAAAAIQABQQVJBTQABAmlkAAEOBXJkZWxheW9mZnNldAB2YWx1ZQABCQQAAAAAAADwPwBQQVJBTQABAmlkAAELBXJmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAA+QABQQVJBTQABAmlkAAEKBXJoaWdoY3V0AHZhbHVlAAEJBAAAAAAAiNNAAFBBUkFNAAECaWQAAQkFcmxvd2N1dAB2YWx1ZQABCQQAAAAAAAA0QABQQVJBTQABAmlkAAEGBXJwYW4AdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABCQVyc291cmNlAHZhbHVlAAEJBAAAAAAAAABAAFBBUkFNAAECaWQAAQcFd2V0ZGIAdmFsdWUAAQkEAAAAAAAAJMAAAAAAAAAAAABKVUNFUHJpdmF0ZURhdGEAAQFCeXBhc3MAAQEDAB0AAAAAAAAASlVDRVByaXZhdGVEYXRhAAAAAAAAAAA=',
        'AEZhY3RvcnkgUHJlc2V0czogRmFjdG9yeSBEZWZhdWx0ABAAAAA='],
      contents: []
    }))
  })

  it('should parse FXCHAIN objects', function () {
    parse(`<FXCHAIN
WNDRECT 493 333 1239 676
SHOW 2
LASTSEL 1
DOCKED 0
BYPASS 0 0 0
<VST "VST3: #TStereo Delay (Tracktion)" "#TStereo Delay.vst3" 0 "" 1997878177{5653545344656C237473746572656F20} ""
  oTMVd+9e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEgUAAAEAAAD//xAA
  AgUAAAEAAABWc3RXAAAACAAAAAEAAAAAQ2NuSwAABOpGQkNoAAAAAlNEZWwAAQAmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
  AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUlBST0dSQU0A
  AQRwbHVnaW5JRAABDwVUU3RlcmVvIERlbGF5AHByb2dyYW1EaXJ0eQABAQNjdXJyZW50UHJvZ3JhbQABEQVGYWN0b3J5IERlZmF1bHQAcHJvZ3JhbUlEAAABF1BBUkFN
  AAECaWQAAQsFZGVsYXlzeW5jAHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQcFZHJ5ZGIAdmFsdWUAAQkEAAAAAAAARMAAUEFSQU0AAQJpZAABCAVlbmFibGUA
  dmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABBwVpbnB1dAB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEQBWxjcm9zc2ZlZWRiYWNrAHZhbHVlAAEJBAAA
  AAAAAAAAAFBBUkFNAAECaWQAAQoFbGRlbGF5bXMAdmFsdWUAAQkEAAAAAABAf0AAUEFSQU0AAQJpZAABDAVsZGVsYXlub3RlAHZhbHVlAAEJBAAAAAAAAAhAAFBBUkFN
  AAECaWQAAQ4FbGRlbGF5b2Zmc2V0AHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQsFbGZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAD5AAFBBUkFNAAECaWQAAQoF
  bGhpZ2hjdXQAdmFsdWUAAQkEAAAAAACI00AAUEFSQU0AAQJpZAABCQVsbG93Y3V0AHZhbHVlAAEJBAAAAAAAADRAAFBBUkFNAAECaWQAAQYFbHBhbgB2YWx1ZQABCQQA
  AAAAAADwvwBQQVJBTQABAmlkAAEJBWxzb3VyY2UAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABEAVyY3Jvc3NmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAAAAABQ
  QVJBTQABAmlkAAEKBXJkZWxheW1zAHZhbHVlAAEJBAAAAAAAQH9AAFBBUkFNAAECaWQAAQwFcmRlbGF5bm90ZQB2YWx1ZQABCQQAAAAAAAAIQABQQVJBTQABAmlkAAEO
  BXJkZWxheW9mZnNldAB2YWx1ZQABCQQAAAAAAADwPwBQQVJBTQABAmlkAAELBXJmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAA+QABQQVJBTQABAmlkAAEKBXJoaWdoY3V0
  AHZhbHVlAAEJBAAAAAAAiNNAAFBBUkFNAAECaWQAAQkFcmxvd2N1dAB2YWx1ZQABCQQAAAAAAAA0QABQQVJBTQABAmlkAAEGBXJwYW4AdmFsdWUAAQkEAAAAAAAA8D8A
  UEFSQU0AAQJpZAABCQVyc291cmNlAHZhbHVlAAEJBAAAAAAAAABAAFBBUkFNAAECaWQAAQcFd2V0ZGIAdmFsdWUAAQkEAAAAAAAAJMAAAAAAAAAAAABKVUNFUHJpdmF0
  ZURhdGEAAQFCeXBhc3MAAQEDAB0AAAAAAAAASlVDRVByaXZhdGVEYXRhAAAAAAAAAAA=
  AEZhY3RvcnkgUHJlc2V0czogRmFjdG9yeSBEZWZhdWx0ABAAAAA=
>
PRESETNAME "Factory Presets: Factory Default"
FLOATPOS 0 0 0 0
FXID {7E06E29C-0388-DD4B-9B13-BB5F766225B7}
WAK 0 0
>`).should.deepEqual(new ReaperBase({
      token: 'FXCHAIN',
      params: [],
      contents: [
        { token: 'WNDRECT', params: [493, 333, 1239, 676] },
        { token: 'SHOW', params: [2] },
        { token: 'LASTSEL', params: [1] },
        { token: 'DOCKED', params: [0] },
        { token: 'BYPASS', params: [0, 0, 0] },
        new ReaperBase({
          token: 'VST',
          params: ['VST3: #TStereo Delay (Tracktion)', '#TStereo Delay.vst3', 0, '', '1997878177{5653545344656C237473746572656F20}', '',
            'oTMVd+9e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEgUAAAEAAAD//xAA',
            'AgUAAAEAAABWc3RXAAAACAAAAAEAAAAAQ2NuSwAABOpGQkNoAAAAAlNEZWwAAQAmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUlBST0dSQU0AAQRwbHVnaW5JRAABDwVUU3RlcmVvIERlbGF5AHByb2dyYW1EaXJ0eQABAQNjdXJyZW50UHJvZ3JhbQABEQVGYWN0b3J5IERlZmF1bHQAcHJvZ3JhbUlEAAABF1BBUkFNAAECaWQAAQsFZGVsYXlzeW5jAHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQcFZHJ5ZGIAdmFsdWUAAQkEAAAAAAAARMAAUEFSQU0AAQJpZAABCAVlbmFibGUAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABBwVpbnB1dAB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEQBWxjcm9zc2ZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAAAAAFBBUkFNAAECaWQAAQoFbGRlbGF5bXMAdmFsdWUAAQkEAAAAAABAf0AAUEFSQU0AAQJpZAABDAVsZGVsYXlub3RlAHZhbHVlAAEJBAAAAAAAAAhAAFBBUkFNAAECaWQAAQ4FbGRlbGF5b2Zmc2V0AHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQsFbGZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAD5AAFBBUkFNAAECaWQAAQoFbGhpZ2hjdXQAdmFsdWUAAQkEAAAAAACI00AAUEFSQU0AAQJpZAABCQVsbG93Y3V0AHZhbHVlAAEJBAAAAAAAADRAAFBBUkFNAAECaWQAAQYFbHBhbgB2YWx1ZQABCQQAAAAAAADwvwBQQVJBTQABAmlkAAEJBWxzb3VyY2UAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABEAVyY3Jvc3NmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEKBXJkZWxheW1zAHZhbHVlAAEJBAAAAAAAQH9AAFBBUkFNAAECaWQAAQwFcmRlbGF5bm90ZQB2YWx1ZQABCQQAAAAAAAAIQABQQVJBTQABAmlkAAEOBXJkZWxheW9mZnNldAB2YWx1ZQABCQQAAAAAAADwPwBQQVJBTQABAmlkAAELBXJmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAA+QABQQVJBTQABAmlkAAEKBXJoaWdoY3V0AHZhbHVlAAEJBAAAAAAAiNNAAFBBUkFNAAECaWQAAQkFcmxvd2N1dAB2YWx1ZQABCQQAAAAAAAA0QABQQVJBTQABAmlkAAEGBXJwYW4AdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABCQVyc291cmNlAHZhbHVlAAEJBAAAAAAAAABAAFBBUkFNAAECaWQAAQcFd2V0ZGIAdmFsdWUAAQkEAAAAAAAAJMAAAAAAAAAAAABKVUNFUHJpdmF0ZURhdGEAAQFCeXBhc3MAAQEDAB0AAAAAAAAASlVDRVByaXZhdGVEYXRhAAAAAAAAAAA=',
            'AEZhY3RvcnkgUHJlc2V0czogRmFjdG9yeSBEZWZhdWx0ABAAAAA='],

          contents: []
        }),
        { token: 'PRESETNAME', params: ['Factory Presets: Factory Default'] },
        { token: 'FLOATPOS', params: [0, 0, 0, 0] },
        { token: 'FXID', params: ['{7E06E29C-0388-DD4B-9B13-BB5F766225B7}'] },
        { token: 'WAK', params: [0, 0] }
      ]
    }))
  })
})
