const parser = require('./parser')
const fs = require('fs')
const ReaperBase = require('./reaper-base')
const ReaperAutomationTrack = require('./reaper-automation-track')
const path = require('path')

const emptys = fs.readFileSync(path.join(__dirname, '../data/empty.RPP'), 'utf8')

/**
 * @typedef {Object} ReaData
 * @property {string} token Reaper token such as VST, TRACK, or NAME
 * @property {Array} params ex. ["hi", 5000]
 * @property {ReaData[]} [contents] optional contents
 */
class ReaperProject extends ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor (obj) {
    if (obj) super(obj)
    else {
      const empty = parser.parse(emptys)
      super(empty)
    }
  }

  /**
   * @param {ReaperTrack} obj
   */
  addTrack (trackObj) {
    if (!(trackObj instanceof ReaperTrack)) throw new TypeError('trackObj has to be of type ReaperTrack')
    return this.add(trackObj)
  }
}

class ReaperTrack extends ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<TRACK
>`)
    }
    super(obj)
  }

  /**
   * @param {ReaperMidiItem} obj
   */
  addMidiItem (midiObj) {
    if (!(midiObj instanceof ReaperMidiItem)) throw new TypeError('midiObj has to be of type ReaperMidiItem')
    return this.add(midiObj)
  }

  /**
   * @param {ReaperAudioItem} obj
   */
  addAudioItem (audioObj) {
    if (!(audioObj instanceof ReaperAudioItem)) throw new TypeError('audioObj has to be of type ReaperAudioItem')
    return this.add(audioObj)
  }
}

class ReaperAudioItem extends ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<ITEM
POSITION 0
LENGTH 2
NAME "untitled WAVE item"
  <SOURCE WAVE
  >
>`)
    }
    super(obj)
  }
}

class ReaperMidiItem extends ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<ITEM
POSITION 0
LENGTH 2
NAME "untitled MIDI item"
  <SOURCE MIDI
  >
>`)
    }
    super(obj)

    for (const i in obj.contents) {
      if (this.contents[i].token === 'SOURCE' && this.contents[i].params[0] === 'MIDI') {
        this.contents[i] = ReaperMidiItem.cleanMidi(this.contents[i])
      }
    }
  }

  /**
   * Converts an array of MidiNotes into midi messages following the specification here:
   * https://wiki.cockos.com/wiki/index.php/StateChunkAndRppMidiFormat
   *
   * @param {MidiNote[]} midiArray
   * @param {Object} midiSettings
   *
   * Outputs something like this:
   * [
   *   {token: 'HASDATA', params: [1, 960, 'QN']},
   *   {token: 'E', params: [0, 90, '3c', 60]},
   *   {token: 'E', params: [480, 80, '3c', 00]},
   *   {token: 'E', params: [0, 'b0', '7b', 00]},
   *   {token: 'X', params: [2^32 + 1, '90', '3c', 00]},
   *   {token: 'X', params: [2^32 + 1, '80', '3c', 00]},
   * ]
   *
   * from a format like:
   *   { c: midiChannel (0-15), l: lengthWholeNotes, n: midiNoteNumber, s: startTimeWholeNotes, v: velocity (0-127) }
   */
  static getMidiMessage (midiArray, midiSettings = { ticksQN: 960 }) {
    const conversion = 4
    const ticksWholeNotes = midiSettings.ticksQN * conversion

    const midiMessage = [{ token: 'HASDATA', params: [1, midiSettings.ticksQN, 'QN'] }]

    /**
     * Function for cleaning input and generating a Reaper midi message.
     */
    const note = (offset, channelAndStatus, midin, midiv) => {
      const res = []
      if (offset > Math.pow(2, 32) - 1) {
        res.push(offset - Math.pow(2, 32) - 1)
        res.push(Math.pow(2, 32) - 1)
      } else {
        res.push(offset)
      }
      res.push(channelAndStatus)
      res.push(midin)

      if (channelAndStatus[0] === '8') res.push('00')
      else res.push(midiv)

      return res
    }

    // Generate a 3D array to store start/stop times for each note on each channel.
    const midiData = [ {tick: 0} ];
    for (const note of midiArray) {
      if (!note.c) note.c = 0
      if (!note.v) note.v = 64
      const startTick = note.s * ticksWholeNotes
      const lengthTick = note.l * ticksWholeNotes

      midiData.push({tick: startTick, status: '9', v: note.v, c: note.c, n: note.n})
      midiData.push({tick: startTick + lengthTick, status: '8', v: note.v, c: note.c, n: note.n})
    }

   
    midiData.sort(function compare (a, b) {
      return a.tick - b.tick
    })

    // Loop through each start/stop command and generate its corresponding midi message.
    for (var i = 1; i < midiData.length; i++) {
      const channel = midiData[i].c.toString(16)
      if (channel.length > 1) throw new Error('midi channel has to be between 0 and 15')

      let midin = midiData[i].n.toString(16)
      if (midin.length < 2) midin = '0' + midin
      if (midin.length > 2) throw new Error('midi note has to be between 0 and 127')

      let midiv = midiData[i].v.toString(16)
      if (midiv.length < 2) midiv = '0' + midiv
      if (midiv.length > 2) throw new Error('midi velocity has to be between 0 and 127')

      let eventId = 'E'
      const offset = midiData[i].tick - midiData[i-1].tick;
      if (offset > Math.pow(2, 32) - 1) {
        eventId = 'X'
      }

      midiMessage.push({ token: eventId, params: note(offset, midiData[i].status + channel, midin, midiv) })
    }
        

    return midiMessage
  }

  /**
   * Some numbers in the midi note should actually be strings and have to be cleaned.
   * @param {ReaData} obj
   */
  static cleanMidi (obj) {
    for (var i = 0; i < obj.contents.length; i++) {
      if (['E', 'e', 'X', 'x', 'Em', 'em', 'Xm', 'xm'].indexOf(obj.contents[i].token) >= 0) {
        for (var j = 1; j < 4; j++) {
          obj.contents[i].params[j] = obj.contents[i].params[j].toString() // Make the last three parameters be two character strings
          if (obj.contents[i].params[j].length < 2) {
            obj.contents[i].params[j] = '0' + obj.contents[i].params[j]
          }
        }
      }
    }
    return obj
  }
}

class ReaperFXChain extends ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<FXCHAIN
  SHOW 0
  LASTSEL 0
  DOCKED 0
>`)
    }
    super(obj)

    // look for VST's external attributes
    const cleanedContents = []
    let i = 0
    for (; i < obj.contents.length; i++) {
      if (obj.contents[i].token === 'VST') {
        const VstObj = new ReaperVst(obj.contents[i])

        if (i !== 0 && obj.contents[i - 1].token === 'BYPASS') {
          VstObj.externalAttributes.BYPASS = obj.contents[i - 1].params
          cleanedContents.pop()
        }

        let toSkip = 0
        for (let j = 1; j < 5 && i + j < obj.contents.length; j++) {
          if (['BYPASS', 'PRESETNAME', 'FLOATPOS', 'FXID', 'WAK'].includes(obj.contents[i + j].token)) {
            VstObj.externalAttributes[obj.contents[i + j].token] = obj.contents[i + j].params
            toSkip += 1
          }
          if (obj.contents[i + j].token === 'VST' && j !== 0) {
            break
          }
        }

        cleanedContents.push(VstObj)
        i += toSkip
      } else {
        cleanedContents.push(obj.contents[i])
      }
    }

    obj.contents = cleanedContents
  }

  /**
   * @param {ReaperVst} obj
   */
  addVst (vstObj) {
    if (!(vstObj instanceof ReaperVst)) throw new TypeError('vstObj has to be of type ReaperVst')
    return this.add(vstObj)
  }
}

class ReaperVst extends ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<VST
>`);
    }
    super(obj);
    while (this.params.length < 8) {
      this.params.push('');
    }
    if (obj.externalAttributes) this.externalAttributes = obj.externalAttributes
    else this.externalAttributes = {}
  }

  dumpExternalAttribute (attr, indent) {
    if (typeof attr !== 'string') throw new TypeError('attr must be of type string')
    if (this.externalAttributes[attr]) {
      return ReaperBase.dumpStruct(attr, this.externalAttributes[attr], indent) + '\n'
    }
    return ''
  }

  dump (indent = 0) {
    const params = ReaperBase.dumpParams(this.params.slice(0, -3))
    const res = this.token + params

    var lines = []
    var startIdx = 0
    const vst2 = this.params.slice(-2)[0]
    for (var i = 0; i < vst2.length; i++) {
      if (i % 128 === 0 && i !== 0) {
        lines.push(vst2.slice(startIdx, i))
        startIdx = i
      }
    }
    if (vst2.length % 128 !== 0) lines.push(vst2.slice(startIdx, vst2.length))

    // These attributes correspond to the VST object, not the FXChain object.
    const BYPASS = this.dumpExternalAttribute('BYPASS', indent)
    const PRESETNAME = this.dumpExternalAttribute('PRESETNAME', indent)
    const FLOATPOS = this.dumpExternalAttribute('FLOATPOS', indent)
    const FXID = this.dumpExternalAttribute('FXID', indent)
    const WAK = this.dumpExternalAttribute('WAK', indent)

    const start = '  '.repeat(indent) + '<' + res + '\n'
    const vst1 = '  '.repeat(indent + 1) + this.params.slice(-3)[0] + '\n'

    var body = ''
    for (const line of lines) {
      body += '  '.repeat(indent + 1) + line + '\n'
    }

    let misc = ''
    for (const o of this.contents) {
      if (o.contents) {
        misc += o.dump(indent) + '\n'
      } else {
        misc += ReaperBase.dumpStruct(o.token, o.params, indent + 1) + '\n'
      }
    }

    const vst3 = '  '.repeat(indent + 1) + this.params.slice(-1)[0] + '\n'
    const end = '  '.repeat(indent) + '>'

    const vstBody = start + vst1 + body + vst3 + end + '\n';

    return (BYPASS + vstBody + PRESETNAME + FLOATPOS + FXID + misc + WAK).slice(0, -1)
  }
}

class ReaperPluginAutomation extends ReaperAutomationTrack {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<PARMENV
>`)
    }
    super(obj);
  }
}

class ReaperNotes extends ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<NOTES
>`)
    }
    super(obj);
  }

  dump (indent = 0) {
    const notes = this.params[0].split('\n')
    var start = '  '.repeat(indent) + '<NOTES\n'
    var body = ''
    for (const line of notes) {
      body += '  '.repeat(indent + 1) + '|' + line + '\n'
    }
    var end = '  '.repeat(indent) + '>'
    return start + body + end
  }
}

class ReaperVolumeAutomation extends ReaperAutomationTrack {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<VOLENV2
>`)
    }
    super(obj);
  }
}

class ReaperPanAutomation extends ReaperAutomationTrack {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<PANENV2
>`)
    }
    super(obj);
  }
}

class ReaperWidthAutomation extends ReaperAutomationTrack {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<WIDTHENV2
>`)
    }
    super(obj);
  }
}

/**
 * Serializes an object and outputs it as an RPP file.
 */
class Tests {
  /**
     * Parses an object and dumps its representation as a string in RPP format.
     * @param {object} obj - An object of the following format containing information in an RPP file.
     * {
     *  token {string}: NAME OF TOKEN
     *  params {Array}: Object parameters
     *  contents {Array}: Array of structs or objects
     * }
     */
  dump (input, debugSettings) {
    switch (debugSettings.startRule) {
      case 'int':
        return ReaperBase.dumpNum(input)
      case 'decimal':
        return ReaperBase.dumpNum(input)
      case 'params':
        return ReaperBase.dumpParams(input)
      case 'string':
        return ReaperBase.dumpString(input)
      case 'midi':
        return ReaperMidiItem.getMidiMessage(input)
      default:
        return input.dump()
    }
  }
}

module.exports = {
  ReaperProject,
  ReaperVst,
  ReaperTrack,
  ReaperAudioItem,
  ReaperNotes,
  Tests,
  ReaperFXChain,
  ReaperPluginAutomation,
  ReaperMidiItem,
  ReaperPanAutomation,
  ReaperVolumeAutomation,
  ReaperWidthAutomation
}
