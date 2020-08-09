// Charles: watch out for unused imports/requires. I think dump, get-audio
// -duration, and start are all unused right now. I'm hoping that this can run
// in the browser, so for now try to avoid any unnecessary dependencies.
const { dump } = require('.')
const parser = require('./parser')
const fs = require('fs')
const { getAudioDurationInSeconds } = require('get-audio-duration')
const { start } = require('repl')

// Charles: The classes like TrackSerializer, VstSerializer are now more
// than just serializers. They stand in for the reaper objects themselves.
// I think they should be names ReaperTrack, ReaperVst, etc (or perhaps
// ReaTrack and ReaVst. VS Code's "Rename Symbol" feature should make this
// change easy to do.

// Charles: Comment strings should also wrap at a consistent line length. I
// usually limit my comments to 80 characters. If a comment needs the 81st
// character, I wrap it to a new line. This keeps the code looking much cleaner.
// There's lots of different ways to handle this, but when adding code to a
// library that's already setup, it's the best practice the follow the
// existing style. Adding a linter makes this a thousand times easier, but I
// have a bad habit of not linting my code. Since we're both working on this
// together, It's probably worth adding a linter.

// Charles: Let's add a typedef for {token: 'BLAH', params: [...]} This will
// make reading the code below much easier. JSDoc has a way to document objects
// that have specific layout and type requirements. See below:
/**
 * @typedef {Object} ReaData
 * @property {string} token Reaper token such as VST, TRACK, or NAME
 * @property {string[]} params ex. ["hi", 5000]]
 * @property {ReaData[]} [contents] optional contents
 */

// Base class for parsing objects that are not special.
class BaseSerializer {
  /**
     * @param {ReaData} obj
     */
  constructor (obj) {
    if (!obj.token) throw new TypeError('Objects need to have a token key')
    if (typeof obj.token !== 'string') throw new TypeError('obj.token has to have type string')
    if (!obj.params) obj.params = []

    if (!Array.isArray(obj.params)) throw new TypeError('obj.params has to have type Array')
    if (!obj.contents) obj.contents = []
    if (!Array.isArray(obj.contents)) throw new TypeError('obj.contents has to have type Array')

    this.token = obj.token
    this.params = obj.params
    this.contents = obj.contents
  }

  dump (indent = 0) {
    var start = '  '.repeat(indent) + '<' + this.dumpStruct(this.token, this.params) + '\n'
    var body = ''
    for (const o of this.contents) {
      if (o.contents) {
        body += o.dump(indent + 1) + '\n'
      } else {
        body += this.dumpStruct(o.token, o.params, indent + 1) + '\n'
      }
    }
    var end = '  '.repeat(indent) + '>'
    return start + body + end
  }

  // Charles: Looks like most of the dump methods should be static methods, as
  // they do use (or need) `.this`. For that reason, it might actually make
  // sense to just define them as functions at the top of the file... but
  // static methods would be okay too.
  dumpNum (i) {
    if (typeof i !== 'number') throw new TypeError('dumpNum was not passed a number')
    return i.toString()
  }

  dumpString (s, indent) {
    if (typeof s !== 'string') throw new TypeError('dumpString was not passed a string')

    if (s.includes(' ') || s.length == 0 || s[0] == '"' || s[0] == '`' || s[0] == "'") {
      if (s.includes('"')) {
        if (s.includes("'")) {
          if (s.includes('`')) {
            return '`' + s.replace(/`/g, "'") + '`'
          }
          return '`' + s + '`'
        }
        return "'" + s + "'"
      }
      return '"' + s + '"'
    }
    return s
  }

  dumpSpecialStrings (token, special, indent) {
    var res = ''

    for (const s of special) {
      const start = '\n  '.repeat(indent) + '<' + token + '\n'
      const body = '  '.repeat(indent + 1) + '|' + s + '\n'
      const end = '  '.repeat(indent) + '>'
      res += start + body + end
    }
    return res
  }

  dumpParams (params) {
    var out = ''
    var specialStrings = []
    for (const param of params) {
      if (typeof param === 'number') out += ' ' + this.dumpNum(param)
      else out += ' ' + this.dumpString(param)
    }
    return out
  }

  findSpecialStrings (params) {
    var specialStrings = []
    for (const param of params) {
      if (typeof param === 'string' && param.includes('"') && param.includes("'") && param.includes('`')) {
        specialStrings.push(param)
      }
    }
    return specialStrings
  }

  dumpStruct (token, params, indent = 0) {
    var specialStrings = this.findSpecialStrings(params)
    var sparams = this.dumpParams(params)
    var res = '  '.repeat(indent) + token + sparams

    res += this.dumpSpecialStrings(token, specialStrings, indent + 1)

    return res
  }
}

class ReaperProjectSerializer extends BaseSerializer {
  // the constructor should create a parsed version of a empty reaper project
  constructor (obj) {
    if (obj) { super(obj) } else {
      // Charles: I like this approach... making obj an optional argument.
      // We probably don't want to read from the disk every time that a
      // new instance of the class is created. What about reading the file
      // when the library is loaded, and just storing it in a string?
      const emptys = fs.readFileSync(__dirname + '/../rpp-examples/empty.RPP', 'utf8')
      const empty = parser.parse(emptys)
      super(empty)
    }
  }

  // Charles: addTrack takes a "name", string, while other objects take a
  // `{ token: 'BLAH', params: ['hi', 5000]}` style argument.
  //
  addTrack (name) {
    if (typeof name !== 'string') throw new TypeError('name has to be of type string')
    this.contents.push(new TrackSerializer({ token: 'TRACK', contents: [{ token: 'NAME', params: [name] }] }))
    return this
  }
}

class TrackSerializer extends BaseSerializer {
  // Charles: I believe this constructor can be omitted. I'm pretty sure that
  // when no constructor is declared, the super constructor will be called
  // automatically.
  constructor (obj) {
    super(obj)
  }

  addMidiItemFromObject (midiObj) {
    if (!(midiObj instanceof MidiItemSerializer)) throw new TypeError('midiObj has to be of type MidiItemSerializer')
    this.contents.push(midiObj)
    return this
  }

  // Charles: The definition of NoteObject in the fluid-music library has changed.
  // Now there are `Note`s and `ClipEvents`. Midi notes are just one kind of Note,
  // and I wanted to be able to plug many different kinds of objects into
  // `NoteLibrary`s for representing lots of different kinds of timeline events.
  // Let's talk about the right way to handle notes in the RPP library. For now,
  // I'll update the NoteObject @param below

  /**
     * @typedef {Object} MidiNote
     * @property {number} s Start time in whole notes
     * @property {number} l Length in whole notes
     * @property {number} v midi velocity
     * @property {number} n Midi note Number
     */

  /**
     * Build a MidiClip that creates a clip with a bunch of midi notes
     * @param { string } clipName name of the clip.
     * @param { number } startTimeInWholeNotes clip start time in whole notes
     * @param { number} durationInWholeNotes clip length in whole notes
     * @param { MidiNote[] } notes
     */
  addMidiItemFromNotes (name, startPosition, length, midiArray, midiSettings) {
    // Charles: I'm a little hesitant to go down this path, because we don't
    // want to have to do this for every type we want to add. It feels like
    // we want the .parse function here, but we have to be careful not
    // to create a circular dependency. Let's think together about how to
    // handle this.
    const midiObj = new MidiItemSerializer({
      token: 'ITEM',
      params: [],
      contents: [
        { token: 'POSITION', params: [startPosition] },
        { token: 'LENGTH', params: [length] },
        { token: 'NAME', params: [name] },
        new BaseSerializer({
          token: 'SOURCE',
          params: ['MIDI'],
          contents: []
        })
      ]
    })

    midiObj.contents[3].contents = midiObj.getMidiMessage(midiArray, midiSettings)

    this.addMidiItemFromObject(midiObj)
    return this
  }

  addAudioItemFromObject (audioObj) {
    if (!(audioObj instanceof AudioItemSerializer)) throw new TypeError('audioObj has to be of type AudioItemSerializer')
    this.contents.push(audioObj)
    return this
  }

  addAudioItem (position, length, filename) {
    if (typeof filename !== 'string') throw new TypeError('filename has to be of type string')
    if (typeof length !== 'number') throw new TypeError('position has to be of type number')
    if (typeof position !== 'number') throw new TypeError('position has to be of type number')

    const audioObj = new AudioItemSerializer({
      token: 'ITEM',
      params: [],
      contents: [
        { token: 'POSITION', params: [position] },
        { token: 'LENGTH', params: [length] },
        new BaseSerializer({
          token: 'SOURCE',
          params: ['WAVE'],
          contents: [
            { token: 'FILE', params: [filename] }
          ]
        })
      ]
    })

    this.addAudioItemFromObject(audioObj)
    return this
  }
}

class AudioItemSerializer extends BaseSerializer {
  constructor (obj) {
    super(obj)
  }
}

class MidiItemSerializer extends BaseSerializer {
  constructor (obj, midiArray) {
    super(obj)

    for (var i = 0; i < this.contents.length; i++) {
      if (this.contents[i].token === 'SOURCE' && this.contents[i].params[0] === 'MIDI') {
        if (midiArray) {
          this.contents[i] = this.getMidiMessage(midiArray)
        }
        this.contents[i] = this.cleanMidi(this.contents[i])
      }
    }
  }

  // Charles: This is a more complicated function, so it should definitely
  // have a clear JSDoc string. It looks like it can probably be a static too.
  getMidiMessage (midiArray, midiSettings = { ticksQN: 960 }) {
    /*
        Outputs something like this:
        [{token: 'HASDATA', params: [1, 960, 'QN']},
        {token: 'E', params: [0, 90, '3c', 60]},
        {token: 'E', params: [480, 80, '3c', 00]},
        {token: 'E', params: [0, 'b0', '7b', 00]},
        {token: 'X', params: [2^32 + 1, '90', '3c', 00]},
        {token: 'X', params: [2^32 + 1, '80', '3c', 00]},]

        from this:
        `{ c: midiChannel, l: lengthWholeNotes, n: midiNoteNumber, s: startTimeWholeNotes, v: velocity (0-127) }`
        */

    const conversion = 4
    const ticksWholeNotes = midiSettings.ticksQN * conversion

    const midiMessage = [{ token: 'HASDATA', params: [1, midiSettings.ticksQN, 'QN'] }]

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

      if (channelAndStatus[0] == '8') res.push('00')
      else res.push(midiv)

      return res
    }

    const midiStatus = [...Array(16)].map(x => [...Array(128)].map(y => [[0, 'NONE', 0]])) // 16 Channels, 128 Possible notes
    for (const note of midiArray) {
      if (!note.c) note.c = 0
      if (!note.v) note.v = 64
      const startTick = note.s * ticksWholeNotes
      const lengthTick = note.l * ticksWholeNotes

      midiStatus[note.c][note.n].push([startTick, '9', note.v])
      midiStatus[note.c][note.n].push([startTick + lengthTick, '8', note.v])
    }

    for (var i = 0; i < 16; i++) {
      for (var j = 0; j < 128; j++) {
        if (midiStatus[i][j].length > 1) {
          midiStatus[i][j].sort(function compare (a, b) {
            return a[0] - b[0]
          })

          console.log(midiStatus[i][j])

          for (var k = 1; k < midiStatus[i][j].length; k++) {
            const channel = i.toString(16)
            if (channel.length > 1) throw new Error('midi channel has to be between 0 and 15')

            let midin = j.toString(16)
            if (midin.length < 2) midin = '0' + midin
            if (midin.length > 2) throw new Error('midi note has to be between 0 and 127')

            let midiv = midiStatus[i][j][k][2].toString(16)
            if (midiv.length < 2) midiv = '0' + midiv
            if (midiv.length > 2) throw new Error('midi velocity has to be between 0 and 127')

            let eventId = 'E'
            const offset = midiStatus[i][j][k][0] - midiStatus[i][j][k - 1][0]
            if (midiStatus[i][j][k] - midiStatus[i][j][k - 1] > Math.pow(2, 32) - 1) {
              eventId = 'X'
            }

            midiMessage.push({ token: eventId, params: note(offset, midiStatus[i][j][k][1] + channel, midin, midiv) })
          }
        }
      }
    }

    return midiMessage
  }

  cleanMidi (obj) {
    for (var i = 0; i < obj.contents.length; i++) {
      if (['E', 'e', 'X', 'x', 'Em', 'em', 'Xm', 'xm'].indexOf(obj.contents[i].token) >= 0) {
        for (var j = 1; j < 4; j++) {
          obj.contents[i].params[j] = obj.contents[i].params[j].toString()
          if (obj.contents[i].params[j].length < 2) {
            obj.contents[i].params[j] = '0' + obj.contents[i].params[j]
          }
        }
      }
    }
    return obj
  }
}

class FXChainSerializer extends BaseSerializer {
  constructor (obj) {
    super(obj)
  }

  // Charles: My instinct is to make `.add` a BaseSerializer Method.
  // Then addVst can look more like this:
  // ```
  // addVst(vstObj) {
  //   if (!instanceof VSTSerializer) throw...
  //   super.add(vstObj)
  // }
  //
  // // Which allows you to write code like this:
  //
  // someObject.add(new Vst(...));
  // ```
  //
  // This centralizes the meaning of "add", and for example, makes it easier to
  // rename the `.contents` variable, or refactor in other ways.
  addVst (vstObj) {
    if (!(vstObj instanceof VstSerializer)) throw new TypeError('vstObj has to be of type VstSerializer')
    this.contents.push(vstObj)
    return this
  }
}

class VstSerializer extends BaseSerializer {
  constructor (obj) {
    super(obj)
    if (obj.externalAttributes) this.externalAttributes = obj.externalAttributes
    else this.externalAttributes = {}
  }

  // Charles: let's talk about what .externalAttributes means.
  dumpExternalAttribute (attr, indent) {
    if (typeof attr !== 'string') throw new TypeError('attr must be of type string')
    if (this.externalAttributes[attr]) {
      return this.dumpStruct(attr, this.externalAttributes[attr], indent) + '\n'
    }
    return ''
  }

  dump (indent = 0) {
    const params = this.dumpParams(this.params.slice(0, -3))
    const res = this.token + params

    var lines = []
    var startIdx = 0
    const vst2 = this.params.slice(-2)[0]
    for (var i = 0; i < vst2.length; i++) {
      if (i % 128 == 0 && i != 0) {
        lines.push(vst2.slice(startIdx, i))
        startIdx = i
      }
    }
    if (vst2.length % 128 != 0) lines.push(vst2.slice(startIdx, vst2.length))

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

    const vst3 = '  '.repeat(indent + 1) + this.params.slice(-1)[0] + '\n'
    const end = '  '.repeat(indent) + '>'

    const vstBody = start + vst1 + body + vst3 + end + '\n'

    return (BYPASS + vstBody + PRESETNAME + FLOATPOS + FXID + WAK).slice(0, -1)
  }
}

class NotesSerializer extends BaseSerializer {
  constructor (obj) {
    super(obj)
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

/**
 * Serializes an object and outputs it as an RPP file.
 */
class TestsSerializer {
  constructor () {
    // initialize the other serializers here
    this.base = new BaseSerializer({ token: 'TEST' })
    this.vst = new VstSerializer({ token: 'TEST' })
    this.notes = new NotesSerializer({ token: 'TEST' })
    this.midi = new MidiItemSerializer({ token: 'TEST' })
  }

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
        return this.base.dumpNum(input)
      case 'decimal':
        return this.base.dumpNum(input)
      case 'params':
        return this.base.dumpParams(input)
      case 'string':
        return this.base.dumpString(input)
      case 'midi':
        return this.midi.getMidiMessage(input)
      default:
        return input.dump()
    }
  }
}

module.exports = {
  ReaperProject: ReaperProjectSerializer,
  Base: BaseSerializer,
  Vst: VstSerializer,
  Track: TrackSerializer,
  AudioItem: AudioItemSerializer,
  Notes: NotesSerializer,
  Tests: TestsSerializer,
  MidiItem: MidiItemSerializer,
  FXChain: FXChainSerializer
}
