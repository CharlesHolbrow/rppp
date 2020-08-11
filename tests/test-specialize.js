const mocha = require('mocha');
const should = require('should');

const ReaperBase = require('../src/reaper-base');
const {
    ReaperProject,
    ReaperVst,
    ReaperTrack,
    ReaperAudioItem,
    ReaperMidiItem,
    ReaperFXChain
} = require('../src/reaper-objects');
const specialize = require('../src/specialize');

describe('specializer', function() {
    describe('special objects', function() {
        it('should dump REAPER_PROJECT objects', function() {
          specialize(new ReaperBase({
            token: 'REAPER_PROJECT',
            params: [0.1, "6.13/OSX64", 1596785244],
          })).dump().should.deepEqual('<REAPER_PROJECT 0.1 6.13/OSX64 1596785244\n>')
        });
    
        it('should add a track to REAPER_PROJECT objects', function() {
          specialize(new ReaperBase({
            token: 'REAPER_PROJECT',
            params: [0.1, "6.13/OSX64", 1596785244],
          })).addTrack(new ReaperTrack({
            token: 'TRACK',
            params: [],
            contents: [
              {token: 'NAME', params: [ 'scream' ]}
            ]
          })).should.deepEqual(new ReaperProject({
            token: 'REAPER_PROJECT',
            params: [0.1, "6.13/OSX64", 1596785244],
            contents: [
              new ReaperTrack({
                token: 'TRACK',
                params: [],
                contents: [
                  {token: 'NAME', params: [ 'scream' ]}
                ]
              })
            ]
          }))
        });
    
        it('should dump TRACK objects', function() {
          specialize(new ReaperBase({
            token: 'TRACK',
            params: [],
            contents: [
              {token: 'NAME', params: ['scream']}
            ]
          })).dump().should.deepEqual('<TRACK\n  NAME scream\n>')
        });
    
        it('should add an ReaperAudioItem to TRACK objects', function() {
          specialize(new ReaperBase({
            token: 'TRACK',
            params: [],
            contents: [
              {token: 'NAME', params: ['scream']}
            ]
          })).addAudioItem(new ReaperAudioItem({
            token: 'ITEM',
            params: [],
            contents: [
              {token: 'POSITION', params: [2]},
              {token: 'LENGTH', params: [0.10179138321995]},
              new ReaperBase({
                token: 'SOURCE', 
                params: ['WAVE'],
                contents: [
                  {token: 'FILE', params: [__dirname + '../rpp-examples/media/909-kick.wav']},
                ]
              })
            ]
          })).should.deepEqual(new ReaperTrack({
            token: 'TRACK',
            params: [],
            contents: [
              {token: 'NAME', params: ['scream']},
              new ReaperAudioItem({
                token: 'ITEM',
                params: [],
                contents: [
                  {token: 'POSITION', params: [2]},
                  {token: 'LENGTH', params: [0.10179138321995]},
                  new ReaperBase({
                    token: 'SOURCE', 
                    params: ['WAVE'],
                    contents: [
                      {token: 'FILE', params: [__dirname + '../rpp-examples/media/909-kick.wav']},
                    ]
                  })
                ]
              })
            ]
          }))
        });
        
        it('should add an ReaperMidiItem object to TRACK objects', function() {
          specialize(new ReaperBase({
            token: 'TRACK',
            params: [],
            contents: [
              {token: 'NAME', params: ['scream']}
            ]
          })).addMidiItem(new ReaperMidiItem({
            token: 'ITEM',
            params: [],
            contents: [
              {token: 'POSITION', params: [2]},
              {token: 'LENGTH', params: [2]},
              new ReaperBase({
                token: 'SOURCE', 
                params: ['MIDI'],
                contents: [
                  {token: 'HASDATA', params: [1, 960, 'QN']},
                  {token: 'E', params: [0, 90, '3c', 60]},
                  {token: 'E', params: [480, 80, '3c', 00]},
                  {token: 'E', params: [0, 'b0', '7b', 00]},
                ]
              })
            ]
          })).should.deepEqual(new ReaperTrack({
            token: 'TRACK',
            params: [],
            contents: [
              {token: 'NAME', params: ['scream']},
              new ReaperMidiItem({
                token: 'ITEM',
                params: [],
                contents: [
                  {token: 'POSITION', params: [2]},
                  {token: 'LENGTH', params: [2]},
                  new ReaperBase({
                    token: 'SOURCE', 
                    params: ['MIDI'],
                    contents: [
                      {token: 'HASDATA', params: [1, 960, 'QN']},
                      {token: 'E', params: [0, 90, '3c', 60]},
                      {token: 'E', params: [480, 80, '3c', 00]},
                      {token: 'E', params: [0, 'b0', '7b', 00]},
                    ]
                  })
                ]
              })
            ]
          }))
        });
    
        it('should dump ReaperMidiItem objects', function() {
          specialize(new ReaperBase({
            token: 'ITEM',
            params: [],
            contents: [
              {token: 'POSITION', params: [2]},
              {token: 'LENGTH', params: [2]},
              new ReaperBase({
                token: 'SOURCE', 
                params: ['MIDI'],
                contents: [
                  {token: 'HASDATA', params: [1, 960, 'QN']},
                  {token: 'CCINTERP', params: [32]},
                  {token: 'POOLEDEVTS', params: ['{10F9B930-32BF-604C-86D1-B6819C2E6F41}']},
                  {token: 'E', params: [0, 90, '3c', 60]},
                  {token: 'E', params: [480, 80, '3c', 00]},
                  {token: 'E', params: [0, 'b0', '7b', 00]},
                ]
              })
            ]
          })).dump().should.deepEqual(`<ITEM
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
>`)
        });
    
        it('should dump ReaperAudioItem objects', function() {
          specialize(new ReaperBase({
            token: 'ITEM',
            params: [],
            contents: [
              {token: 'POSITION', params: [2]},
              {token: 'LENGTH', params: [10.2]},
              new ReaperBase({
                token: 'SOURCE', 
                params: ['WAVE'],
                contents: [
                  {token: 'FILE', params: ["filename"]},
                ]
              })
            ]
          })).dump().should.deepEqual('<ITEM\n  POSITION 2\n  LENGTH 10.2\n  <SOURCE WAVE\n    FILE filename\n  >\n>')
        });
    
        it('should add a VST to FXCHAIN objects', function() {
          specialize(new ReaperBase({
            token: 'FXCHAIN',
            params: [],
            contents: [
              {token: 'WNDRECT', params: [493, 333,1239, 676]},
              {token: 'SHOW', params: [2]},
              {token: 'LASTSEL', params: [1]},
              {token: 'DOCKED', params: [0]},
            ]
          })).addVst(new ReaperVst({
            token: 'VST',
            params: ['VST3: #TStereo Delay (Tracktion)', '#TStereo Delay.vst3', 0, '', '1997878177{5653545344656C237473746572656F20}', '',
                    `oTMVd+9e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEgUAAAEAAAD//xAA`,
                    `AgUAAAEAAABWc3RXAAAACAAAAAEAAAAAQ2NuSwAABOpGQkNoAAAAAlNEZWwAAQAmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUlBST0dSQU0AAQRwbHVnaW5JRAABDwVUU3RlcmVvIERlbGF5AHByb2dyYW1EaXJ0eQABAQNjdXJyZW50UHJvZ3JhbQABEQVGYWN0b3J5IERlZmF1bHQAcHJvZ3JhbUlEAAABF1BBUkFNAAECaWQAAQsFZGVsYXlzeW5jAHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQcFZHJ5ZGIAdmFsdWUAAQkEAAAAAAAARMAAUEFSQU0AAQJpZAABCAVlbmFibGUAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABBwVpbnB1dAB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEQBWxjcm9zc2ZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAAAAAFBBUkFNAAECaWQAAQoFbGRlbGF5bXMAdmFsdWUAAQkEAAAAAABAf0AAUEFSQU0AAQJpZAABDAVsZGVsYXlub3RlAHZhbHVlAAEJBAAAAAAAAAhAAFBBUkFNAAECaWQAAQ4FbGRlbGF5b2Zmc2V0AHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQsFbGZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAD5AAFBBUkFNAAECaWQAAQoFbGhpZ2hjdXQAdmFsdWUAAQkEAAAAAACI00AAUEFSQU0AAQJpZAABCQVsbG93Y3V0AHZhbHVlAAEJBAAAAAAAADRAAFBBUkFNAAECaWQAAQYFbHBhbgB2YWx1ZQABCQQAAAAAAADwvwBQQVJBTQABAmlkAAEJBWxzb3VyY2UAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABEAVyY3Jvc3NmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEKBXJkZWxheW1zAHZhbHVlAAEJBAAAAAAAQH9AAFBBUkFNAAECaWQAAQwFcmRlbGF5bm90ZQB2YWx1ZQABCQQAAAAAAAAIQABQQVJBTQABAmlkAAEOBXJkZWxheW9mZnNldAB2YWx1ZQABCQQAAAAAAADwPwBQQVJBTQABAmlkAAELBXJmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAA+QABQQVJBTQABAmlkAAEKBXJoaWdoY3V0AHZhbHVlAAEJBAAAAAAAiNNAAFBBUkFNAAECaWQAAQkFcmxvd2N1dAB2YWx1ZQABCQQAAAAAAAA0QABQQVJBTQABAmlkAAEGBXJwYW4AdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABCQVyc291cmNlAHZhbHVlAAEJBAAAAAAAAABAAFBBUkFNAAECaWQAAQcFd2V0ZGIAdmFsdWUAAQkEAAAAAAAAJMAAAAAAAAAAAABKVUNFUHJpdmF0ZURhdGEAAQFCeXBhc3MAAQEDAB0AAAAAAAAASlVDRVByaXZhdGVEYXRhAAAAAAAAAAA=`,
                    `AEZhY3RvcnkgUHJlc2V0czogRmFjdG9yeSBEZWZhdWx0ABAAAAA=`],
            externalAttributes: {
              BYPASS: [0, 0, 0],
              PRESETNAME: ["Factory Presets: Factory Default"],
              FLOATPOS: [0, 0, 0, 0,],
              FXID: ["{7E06E29C-0388-DD4B-9B13-BB5F766225B7}"],
              WAK: [0, 0],
            },
            contents: [],
          })).should.deepEqual(new ReaperFXChain({
            token: 'FXCHAIN',
            params: [],
            contents: [
              {token: 'WNDRECT', params: [493, 333,1239, 676]},
              {token: 'SHOW', params: [2]},
              {token: 'LASTSEL', params: [1]},
              {token: 'DOCKED', params: [0]},
              new ReaperVst({
                token: 'VST',
                params: ['VST3: #TStereo Delay (Tracktion)', '#TStereo Delay.vst3', 0, '', '1997878177{5653545344656C237473746572656F20}', '',
                        `oTMVd+9e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEgUAAAEAAAD//xAA`,
                        `AgUAAAEAAABWc3RXAAAACAAAAAEAAAAAQ2NuSwAABOpGQkNoAAAAAlNEZWwAAQAmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUlBST0dSQU0AAQRwbHVnaW5JRAABDwVUU3RlcmVvIERlbGF5AHByb2dyYW1EaXJ0eQABAQNjdXJyZW50UHJvZ3JhbQABEQVGYWN0b3J5IERlZmF1bHQAcHJvZ3JhbUlEAAABF1BBUkFNAAECaWQAAQsFZGVsYXlzeW5jAHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQcFZHJ5ZGIAdmFsdWUAAQkEAAAAAAAARMAAUEFSQU0AAQJpZAABCAVlbmFibGUAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABBwVpbnB1dAB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEQBWxjcm9zc2ZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAAAAAFBBUkFNAAECaWQAAQoFbGRlbGF5bXMAdmFsdWUAAQkEAAAAAABAf0AAUEFSQU0AAQJpZAABDAVsZGVsYXlub3RlAHZhbHVlAAEJBAAAAAAAAAhAAFBBUkFNAAECaWQAAQ4FbGRlbGF5b2Zmc2V0AHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQsFbGZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAD5AAFBBUkFNAAECaWQAAQoFbGhpZ2hjdXQAdmFsdWUAAQkEAAAAAACI00AAUEFSQU0AAQJpZAABCQVsbG93Y3V0AHZhbHVlAAEJBAAAAAAAADRAAFBBUkFNAAECaWQAAQYFbHBhbgB2YWx1ZQABCQQAAAAAAADwvwBQQVJBTQABAmlkAAEJBWxzb3VyY2UAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABEAVyY3Jvc3NmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEKBXJkZWxheW1zAHZhbHVlAAEJBAAAAAAAQH9AAFBBUkFNAAECaWQAAQwFcmRlbGF5bm90ZQB2YWx1ZQABCQQAAAAAAAAIQABQQVJBTQABAmlkAAEOBXJkZWxheW9mZnNldAB2YWx1ZQABCQQAAAAAAADwPwBQQVJBTQABAmlkAAELBXJmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAA+QABQQVJBTQABAmlkAAEKBXJoaWdoY3V0AHZhbHVlAAEJBAAAAAAAiNNAAFBBUkFNAAECaWQAAQkFcmxvd2N1dAB2YWx1ZQABCQQAAAAAAAA0QABQQVJBTQABAmlkAAEGBXJwYW4AdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABCQVyc291cmNlAHZhbHVlAAEJBAAAAAAAAABAAFBBUkFNAAECaWQAAQcFd2V0ZGIAdmFsdWUAAQkEAAAAAAAAJMAAAAAAAAAAAABKVUNFUHJpdmF0ZURhdGEAAQFCeXBhc3MAAQEDAB0AAAAAAAAASlVDRVByaXZhdGVEYXRhAAAAAAAAAAA=`,
                        `AEZhY3RvcnkgUHJlc2V0czogRmFjdG9yeSBEZWZhdWx0ABAAAAA=`],
                externalAttributes: {
                  BYPASS: [0, 0, 0],
                  PRESETNAME: ["Factory Presets: Factory Default"],
                  FLOATPOS: [0, 0, 0, 0,],
                  FXID: ["{7E06E29C-0388-DD4B-9B13-BB5F766225B7}"],
                  WAK: [0, 0],
                },
                contents: [],
              })
            ]
          }))
        });
    
        it('should dump FXCHAIN objects', function() {
          specialize(new ReaperBase({
            token: 'FXCHAIN',
            params: [],
            contents: [
              {token: 'WNDRECT', params: [493, 333,1239, 676]},
              {token: 'SHOW', params: [2]},
              {token: 'LASTSEL', params: [1]},
              {token: 'DOCKED', params: [0]},
              new ReaperVst({
                token: 'VST',
                params: ['VST3: #TStereo Delay (Tracktion)', '#TStereo Delay.vst3', 0, '', '1997878177{5653545344656C237473746572656F20}', '',
                        `oTMVd+9e7f4CAAAAAQAAAAAAAAACAAAAAAAAAAIAAAABAAAAAAAAAAIAAAAAAAAAEgUAAAEAAAD//xAA`,
                        `AgUAAAEAAABWc3RXAAAACAAAAAEAAAAAQ2NuSwAABOpGQkNoAAAAAlNEZWwAAQAmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEUlBST0dSQU0AAQRwbHVnaW5JRAABDwVUU3RlcmVvIERlbGF5AHByb2dyYW1EaXJ0eQABAQNjdXJyZW50UHJvZ3JhbQABEQVGYWN0b3J5IERlZmF1bHQAcHJvZ3JhbUlEAAABF1BBUkFNAAECaWQAAQsFZGVsYXlzeW5jAHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQcFZHJ5ZGIAdmFsdWUAAQkEAAAAAAAARMAAUEFSQU0AAQJpZAABCAVlbmFibGUAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABBwVpbnB1dAB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEQBWxjcm9zc2ZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAAAAAFBBUkFNAAECaWQAAQoFbGRlbGF5bXMAdmFsdWUAAQkEAAAAAABAf0AAUEFSQU0AAQJpZAABDAVsZGVsYXlub3RlAHZhbHVlAAEJBAAAAAAAAAhAAFBBUkFNAAECaWQAAQ4FbGRlbGF5b2Zmc2V0AHZhbHVlAAEJBAAAAAAAAPA/AFBBUkFNAAECaWQAAQsFbGZlZWRiYWNrAHZhbHVlAAEJBAAAAAAAAD5AAFBBUkFNAAECaWQAAQoFbGhpZ2hjdXQAdmFsdWUAAQkEAAAAAACI00AAUEFSQU0AAQJpZAABCQVsbG93Y3V0AHZhbHVlAAEJBAAAAAAAADRAAFBBUkFNAAECaWQAAQYFbHBhbgB2YWx1ZQABCQQAAAAAAADwvwBQQVJBTQABAmlkAAEJBWxzb3VyY2UAdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABEAVyY3Jvc3NmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAAAAABQQVJBTQABAmlkAAEKBXJkZWxheW1zAHZhbHVlAAEJBAAAAAAAQH9AAFBBUkFNAAECaWQAAQwFcmRlbGF5bm90ZQB2YWx1ZQABCQQAAAAAAAAIQABQQVJBTQABAmlkAAEOBXJkZWxheW9mZnNldAB2YWx1ZQABCQQAAAAAAADwPwBQQVJBTQABAmlkAAELBXJmZWVkYmFjawB2YWx1ZQABCQQAAAAAAAA+QABQQVJBTQABAmlkAAEKBXJoaWdoY3V0AHZhbHVlAAEJBAAAAAAAiNNAAFBBUkFNAAECaWQAAQkFcmxvd2N1dAB2YWx1ZQABCQQAAAAAAAA0QABQQVJBTQABAmlkAAEGBXJwYW4AdmFsdWUAAQkEAAAAAAAA8D8AUEFSQU0AAQJpZAABCQVyc291cmNlAHZhbHVlAAEJBAAAAAAAAABAAFBBUkFNAAECaWQAAQcFd2V0ZGIAdmFsdWUAAQkEAAAAAAAAJMAAAAAAAAAAAABKVUNFUHJpdmF0ZURhdGEAAQFCeXBhc3MAAQEDAB0AAAAAAAAASlVDRVByaXZhdGVEYXRhAAAAAAAAAAA=`,
                        `AEZhY3RvcnkgUHJlc2V0czogRmFjdG9yeSBEZWZhdWx0ABAAAAA=`],
                externalAttributes: {
                  BYPASS: [0, 0, 0],
                  PRESETNAME: ["Factory Presets: Factory Default"],
                  FLOATPOS: [0, 0, 0, 0,],
                  FXID: ["{7E06E29C-0388-DD4B-9B13-BB5F766225B7}"],
                  WAK: [0, 0],
                },
                contents: [],
              })
            ]
        })).dump().should.deepEqual(`<FXCHAIN
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
>`);
        });
      });
}); // describe specializer
  