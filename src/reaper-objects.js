const parser = require('./parser')
const fs = require('fs')
const ReaperBase = require('./reaper-base')
const ReaperAutomationTrack = require('./reaper-automation-track')
const path = require('path')
const { VstB64 } = require('./vst-utils')
const { base64StringByteLength } = require('./base64')

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
   * Add a receive (from another track) to this track
   * @param {object} options
   * @param {number} [options.sourceTrackNumber=0] reaper stores tracks in a flat
   *    array, even when those tracks have nested layers. This references the
   *    absolute track index, (starting from 0)
   * @param {number} [options.gain] 0.5 is approximately -6.02db
   * @param {number} [options.pan] 0=center, -1=left, 1=right
   * @param {string} [options.name] give the send a name (untested)
   * @param {number} [options.sourceChannels] indicates which channels on the
   *    sourceTrack to send. `-1="None"`, `1024= (mono) ch1`, `1025=(mono) ch2`
   *    `0=(stereo) ch1+2`, `1=(stereo) ch2+3`, `2=(stereo) ch3+4`
   * @param {number} [options.destinationChannels] indicate on which channels to
   *    receive audio
   */
  addReceive ({ sourceTrackNumber = 0, gain = 1, pan = 0, name = '', sourceChannel = 0, destinationChannel = 0 }) {
    const receive = this.createStruct('AUXRECV', this.contents.length)
    receive.params = [
      sourceTrackNumber,
      0,
      gain,
      pan,
      0, // mute `0=unmuted`, `1=muted`
      0, // source track's pan bypass (ven-diagram icon in routing panel)
      0, // Phase invert `1=inverted`

      // sourceChannels controls how many channels are sent. It looks like the
      // least significant 10 bits indicate the starting channel and then the
      // subsequent bits indicate the number of channels. For example:
      //
      // `-1="None"`, `1024= (mono) ch1`, `1025=(mono) ch2`
      // `0=(stereo) ch1+2`, `1=(stereo) ch2+3`, `2=(stereo) ch3+4`
      //
      // The general case is:
      // startingChannelNumber + 0 // stereo
      // startingChannelNumber + (1<<10) // 1 channel/mono
      // startingChannelNumber + (2<<10) // 4 channels
      // startingChannelNumber + (3<<10) // 6 channels
      // startingChannelNumber + (4<<10) // 8 channels, etc
      sourceChannel, // audio source channel(s)
      // unlike sourceChannel, destination value does not include channel count
      destinationChannel, // audio dest channel
      '-1:U', // ???

      // midi source/destination channels
      // `0=send receive all midi channels`, `1=send ch1, receive on all ch`, `33 send ch1, receive ch1`
      // `1024=MidiOnly(all channels)`, `1025=MidiOnly(ch1)`, Doesn't send audio
      0,
      -1, // automation mode `-1='track automation mode`
      name // name?
    ]

    return receive
  }

  /**
   * @param {ReaperItem} obj
   */
  addItem (obj) {
    if (!(obj instanceof ReaperItem)) throw new TypeError('obj has to be of type ReaperItem')
    return this.add(obj)
  }
}

class ReaperItem extends ReaperBase {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<ITEM
>`)
    }
    super(obj)
  }

  /**
   * Find all SOURCE objects, and reverse them if possible. This is intended to
   * work with simple items that have one AUDIO source. Some caveats:
   * (1) reverseSources is intended for items with audio SOURCEs (ex. WAVE, MP3)
   * (2) ITEMs with SOURCE MIDI sources cannot be reversed. Trying to reverse an
   *     ITEM with SOURCE MIDI contents will print a warning message
   * (3) ITEMs may have multiple SOURCE children in the .contents array (for
   *     example, when the underlying Reaper ITEM has multiple takes). These
   *     ITEMS will have only one active take in reaper, but this method will
   *     reverse ALL the possible immediate children. I have not tested the case
   *     where an item has multiple complex child sources that are offset from
   *     each other.
   * (4) To reverse, sources must be converted to `<SOURCE SECTION...` objects.
   *     This conversion happens automatically, but for SOURCEs that are already
   *     SECTION sources, the behavior may be unpredictable.
   * (5) reverseSources will not un-reverse sources that are already reversed
   *
   * Other general notes about reversed ITEMS:
   * - For reversed sources, SOFFS ('Start in source') measures from the END of
   *   the source file
   */
  reverseSources () {
    let found = 0
    this.contents.forEach((obj, i, all) => {
      if (obj.token === 'SOURCE') {
        let source = obj
        if (!(obj instanceof ReaperSource)) {
          source = new ReaperSource(obj)
          all[i] = source
        }

        // Reaper does not support reversing MIDI ITEMs in this way
        if (source.isMidiSource()) {
          const msg = 'cannot reverse a `<SOURCE MIDI` object'
          console.warn('WARNING: rppp ' + msg)
          return
        }

        source.makeSectionSource()
        const childSource = source.getStructByToken('SOURCE')
        if (!childSource) {
          const msg = 'tried to reverse a SOURCE SECTION with no children'
          console.warn('WARNING: rpp ' + msg)
          return
        }

        const modeStruct = source.getStructByToken('MODE')
        if (!modeStruct) source.getOrCreateStructByToken('MODE').params[0] = 2
        else source.getOrCreateStructByToken('MODE').params[0] = 3

        if (childSource.getStructByToken('SOURCE', 1)) {
          const msg = 'reversed only the first SOURCE object in a child source ' + source.dump()
          console.warn('WARNING: rpp ' + msg)
        }

        if (++found > 1) {
          console.warn('WARNING: rpp reversed an item with more than one immediate child SOURCE.')
        }
      }
    })
  }
}

class ReaperSource extends ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<SOURCE WAVE
>`)
    }
    super(obj)
    if (this.isMidiSource()) this.cleanMidi()
  }

  isWaveSource () { return this.params[0] === 'WAVE' }
  isMidiSource () { return this.params[0] === 'MIDI' }
  isMp3Source () { return this.params[0] === 'MP3' }
  isSectionSource () { return this.params[0] === 'SECTION' }

  makeWaveSource () {
    if (this.isSectionSource()) {
      throw new Error('Cannot convert `<SOURCE SECTION` object to `<SOURCE WAV`')
    }
    this.params[0] = 'WAVE'
    return this
  }

  makeMidiSource () {
    if (this.isSectionSource()) {
      throw new Error('Cannot convert `<SOURCE SECTION` object to `<SOURCE MIDI`')
    }
    this.params[0] = 'MIDI'
    this.cleanMidi()
    return this
  }

  makeMp3Source () {
    if (this.isSectionSource()) {
      throw new Error('Cannot convert `<SOURCE SECTION` object to `<SOURCE MP3`')
    }
    this.params[0] = 'MP3'
    return this
  }

  /**
   * Reaper ITEMs may contain `<SOURCE SECTION` objects containing child SOURCE
   * objects. This method copies the underlying SOURCE WAVE/MP3/MIDI object, and
   * moves the copy into a child SOURCE object, converting the original SOURCE
   * object into a SOURCE SECTION object, and adding SECTION specific structs
   * to .this (added: LENGTH, MODE, STARTPOS. omitted: OVERLAP).
   *
   * For SOURCE objects that are already SECTIONs, do nothing.
   *
   * See https://github.com/ReaTeam/Doc/blob/master/State%20Chunk%20Definitions
   * for info about `<SOURCE SECTION` objects
   */
  makeSectionSource () {
    if (this.isSectionSource()) return this

    if (this.getStructByToken('SOURCE')) {
      // If this happens, it is probably a bug in the consuming code. I do not
      // believe that non-SECTION source objects (such as WAVE or MP3) should
      // ever have children.
      console.warn('WARNING: rppp called .makeSectionSource on an object that already has one or more SOURCE children. This may result in bugs')
    }

    const childSource = new ReaperSource(this)
    this.params = ['SECTION']
    this.contents = []

    // SECTION sources have a bunch of structs that WAVE/MP3 sources do not.
    // I believe that the LENGTH, STARTPOS, and (probably) OVERLAP structs are
    // ignored unless the 'Section' checkbox (found in the Reaper item's
    // properties window) is checked.
    //
    // Note the MODE struct:
    // - when MODE is not present, it indicates that the 'Section' checkbox in
    //   the Reaper item's properties is checked, but the 'Reverse' checkbox is
    //   not checked.
    //
    // - MODE 1: this appears to be the default. It seems to indicate that
    //   neither of the 'Reverse' or 'Section' checkboxes in the Reaper item
    //   properties are checked. I believe that this mode ignores values in the
    //   LENGTH, STARTPOS, and (probably) OVERLAP structs
    //
    // - MODE 2: Indicates that both 'Reverse' and 'Section' boxes are checked.
    //
    // - MODE 3: Indicates that 'Reverse' is checked, and 'Section' is not
    this.getOrCreateStructByToken('LENGTH').params[0] = 0
    this.getOrCreateStructByToken('MODE').params[0] = 1
    this.getOrCreateStructByToken('STARTPOS').params[0] = 0
    this.contents.push(childSource)

    return this
  }

  /**
   * Some numbers in the midi note should actually be strings and have to be cleaned.
   */
  cleanMidi () {
    if (!this.isMidiSource()) throw new Error('cleanMidi only works on MIDI sources')
    for (var i = 0; i < this.contents.length; i++) {
      if (['E', 'e', 'X', 'x', 'Em', 'em', 'Xm', 'xm'].indexOf(this.contents[i].token) >= 0) {
        for (var j = 1; j < 4; j++) {
          this.contents[i].params[j] = this.contents[i].params[j].toString() // Make the last three parameters be two character strings
          if (this.contents[i].params[j].length < 2) {
            this.contents[i].params[j] = '0' + this.contents[i].params[j]
          }
        }
      }
    }
    return this.contents
  }

  /**
   * Set this to a MIDI source. Replace the objects contents with midi notes.
   * @param {Object[]} notes Array of objects that look like this:
   *  { c: midiChannel (0-15), l: lengthWholeNotes, n: midiNoteNumber, s: startTimeWholeNotes, v: velocity (0-127) }
   */
  setMidiNotes (notes, lengthInWholeNotes) {
    this.makeMidiSource()
    this.contents = ReaperSource.midiMessagesToContents(notes, lengthInWholeNotes)
  }

  /**
   * Converts an array of MidiNotes into a rppp-style .contents array
   * https://wiki.cockos.com/wiki/index.php/StateChunkAndRppMidiFormat
   *
   * @param {MidiNote[]} midiArray
   * @param {number} [lengthInWholeNotes]
   *
   * Input is an array of objects that looks like this
   * ```
   * [
   *   { c: midiChannel (0-15), l: lengthWholeNotes, n: midiNoteNumber, s: startTimeWholeNotes, v: velocity (0-127) }
   * ]
   * ```
   * Output looks like this like this:
   * ```
   * [
   *   {token: 'HASDATA', params: [1, 960, 'QN']},
   *   {token: 'E', params: [0, 90, '3c', 60]},
   *   {token: 'E', params: [480, 80, '3c', 00]},
   *   {token: 'E', params: [0, 'b0', '7b', 00]},
   *   {token: 'X', params: [2^32 + 1, '90', '3c', 00]},
   *   {token: 'X', params: [2^32 + 1, '80', '3c', 00]},
   * ]
   * ```
   */
  static midiMessagesToContents (midiArray, lengthInWholeNotes) {
    const ticksPerQuarterNote = 960
    const ticksPerWholeNote = ticksPerQuarterNote * 4

    // Reaper uses an all notes off message to indicate the "source length"
    const insertAllNotesOff = typeof lengthInWholeNotes === 'number'
    const allNotesOffTicks = insertAllNotesOff ? Math.ceil(ticksPerWholeNote * lengthInWholeNotes) : 0

    const midiMessage = [{ token: 'HASDATA', params: [1, ticksPerQuarterNote, 'QN'] }]

    /**
     * Function for cleaning input and generating a Reaper midi message.
     */
    const note = (offset, channelAndStatus, midin, midiv) => {
      offset = Math.round(offset)
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

    // midiData stores midi events in an intermediary format. It will be sorted
    // by the .tick member of each item, before each item is converted to the
    // RPP format. There are two different types of objects that can go into
    // midiData:
    // 1. Note: { tick: number, status: string, v: number, c: number: n: number}
    // 2. Other: { tick: number, status: string, byte1: string, byte2: string }
    //
    // Notice that in the first format, the status string contains a nibble, and
    // the .c property contains contains the second nibble of the status byte.
    const midiData = [{ tick: 0 }]
    for (const note of midiArray) {
      if (!note.c) note.c = 0
      if (!note.v) note.v = 64
      const startTick = note.s * ticksPerWholeNote
      const lengthTick = note.l * ticksPerWholeNote

      midiData.push({ tick: startTick, status: '9', v: note.v, c: note.c, n: note.n })
      midiData.push({ tick: startTick + lengthTick, status: '8', v: note.v, c: note.c, n: note.n })
    }
    if (insertAllNotesOff) midiData.push({ tick: allNotesOffTicks, status: 'b0', byte1: '7b', byte2: '00' })

    midiData.sort(function compare (a, b) {
      return a.tick - b.tick
    })

    // Loop through each start/stop command and generate its corresponding midi message.
    for (var i = 1; i < midiData.length; i++) {
      let midiByteS, midiByte1, midiByte2 // 3 strings

      if (Object.prototype.hasOwnProperty.call(midiData[i], 'byte1')) {
        midiByteS = midiData[i].status
        midiByte1 = midiData[i].byte1
        midiByte2 = midiData[i].byte2
      } else {
        const channel = midiData[i].c.toString(16)
        if (channel.length !== 1) throw new Error('midi channel has to be between 0 and 15')

        midiByteS = midiData[i].status + channel // status byte

        midiByte1 = midiData[i].n.toString(16)
        if (midiByte1.length < 2) midiByte1 = '0' + midiByte1
        if (midiByte1.length > 2) throw new Error('midi note has to be between 0 and 127')

        midiByte2 = midiData[i].v.toString(16)
        if (midiByte2.length < 2) midiByte2 = '0' + midiByte2
        if (midiByte2.length > 2) throw new Error('midi velocity has to be between 0 and 127')
      }

      let eventId = 'E'
      const offset = midiData[i].tick - midiData[i - 1].tick
      if (offset > Math.pow(2, 32) - 1) {
        eventId = 'X'
      }

      midiMessage.push({ token: eventId, params: note(offset, midiByteS, midiByte1, midiByte2) })
    }

    return midiMessage
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
    if (!obj) obj = parser.parse('<VST\n>')
    super(obj)
    while (this.params.length < 5) this.params.push('')
    this.externalAttributes = obj.externalAttributes || {}

    if (!this.b64Chunks[0]) this.b64Chunks[0] = new VstB64()
    if (!this.b64Chunks[1]) this.b64Chunks[1] = ''
    if (!this.b64Chunks[2]) this.b64Chunks[2] = 'AAAQAAAA' // 'No Preset'

    if (typeof this.b64Chunks[0] === 'string') {
      // .b64Chunks can contain objects that have a .toString() method
      this.b64Chunks[0] = VstB64.fromString(this.b64Chunks[0])
    }
  }

  dumpExternalAttribute (attr, indent) {
    if (typeof attr !== 'string') throw new TypeError('attr must be of type string')
    if (this.externalAttributes[attr]) {
      return ReaperBase.dumpStruct(attr, this.externalAttributes[attr], indent) + '\n'
    }
    return ''
  }

  dump (indent = 0) {
    // These attributes correspond to the VST object, not the FXChain object.
    const BYPASS = this.dumpExternalAttribute('BYPASS', indent)
    const PRESETNAME = this.dumpExternalAttribute('PRESETNAME', indent)
    const FLOATPOS = this.dumpExternalAttribute('FLOATPOS', indent)
    const FXID = this.dumpExternalAttribute('FXID', indent)
    const WAK = this.dumpExternalAttribute('WAK', indent)

    let misc = ''
    for (const o of this.contents) {
      if (o.contents) {
        misc += o.dump(indent) + '\n'
      } else {
        misc += ReaperBase.dumpStruct(o.token, o.params, indent + 1) + '\n'
      }
    }

    const indentStr = '  '.repeat(indent)
    const start = indentStr + '<' + this.token + ReaperBase.dumpParams(this.params) + '\n'
    const body = this.dumpB64Chunks(indent + 1)
    const end = indentStr + '>'
    const vstBody = start + body + end + '\n'

    return (BYPASS + vstBody + PRESETNAME + FLOATPOS + FXID + misc + WAK).slice(0, -1)
  }

  /**
   * @param {string} b64String the plugin's state in base64 format
   */
  setVst2State (b64String) {
    if (typeof b64String !== 'string') {
      throw new Error('ReaperVst.setVst2State did not receive a string')
    }
    this.b64Chunks[0].stateSize = base64StringByteLength(b64String)
    this.b64Chunks[1] = b64String
  }

  initializeRouting (numIn = 2, numOut = 2) {
    this.b64Chunks[0].numIn = numIn
    this.b64Chunks[0].numOut = numOut
  }

  setVst2IdNumber (idNumber) {
    this.b64Chunks[0].vst2IdNumber = idNumber
  }
}

class ReaperPluginAutomation extends ReaperAutomationTrack {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<PARMENV
>`)
    }
    super(obj)
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

class ReaperVolumeAutomation extends ReaperAutomationTrack {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<VOLENV2
>`)
    }
    super(obj)
  }
}

class ReaperPanAutomation extends ReaperAutomationTrack {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<PANENV2
>`)
    }
    super(obj)
  }
}

class ReaperWidthAutomation extends ReaperAutomationTrack {
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<WIDTHENV2
>`)
    }
    super(obj)
  }
}

/**
 * Tempo and time signature Automation. Like other automation objects, this
 * appends `PT` structs for each automation point. `PT` structs typically have
 * either 3 or 6 fields:
 *
 *  1. Start time in seconds,
 *  2. new bpm
 *  3. curve type. 0=linear, 1=square (no other types available) (further args
 *     are optional. Their presence indicate a time signature change)
 *  4. time signature expressed as two 16 bit ints in a 32 bit int f = (num,
 *     demon) => ((denom << 16) + num)
 *  5. 1=selected, 0=unselected
 *  6. Some kind of mode indicator. A bitmask?
 *     - `1`= set tempo and set time signature
 *     - `3`= only set time signature
 *     - `5`= allow partial measure before next bar, set time signature, set
 *       tempo
 *     - `7`= allow partial mesaure before next bar, set time signature, don't
 *       set tempo
 *
 * However, the helpers abstract these fields. So you do not need to remember
 */
class ReaperTempoTimeSigAutomation extends ReaperBase {
  // Note that this doesn't inherit from ReaperAutomationTrack. Tempo automation
  // has some similar parameters, but it does not actually support bezier
  // curves, and its subsequent arguments are specific to time signature
  // automation.
  constructor (obj) {
    if (!obj) {
      obj = parser.parse(
`<TEMPOENVEX
  ACT 1 -1
  VIS 1 0 1
  LANEHEIGHT 0 0
  ARM 0
  DEFSHAPE 1 -1 -1
>`)
    }
    super(obj)
  }

  /**
   * Add a time signature automation point (without tempo automation info) to
   * the end of the envelope. You are responsible for making sure that (1) the
   * timeSeconds value exactly corresponds to the start of a new measure, and
   * (2) upper/lower make a valid time signature, and (3) this is called in
   * order, so that timeSeconds values are ascending.
   *
   * This will interrupt a tempo curve, so if this is in the middle of a tempo
   * curve, you will need to use `addTempoTimeSignature`.
   *
   * @param {number} upper time signature "numerator"
   * @param {number} lower time signature "demonimator"
   * @param {number} [timeSeconds = 0] position of the time signature on the
   * timeline. Make sure that this value exactly corresponds to the start of a
   * measure.
   */
  addTimeSignature (upper, lower, timeSeconds = 0) {
    if (typeof timeSeconds !== 'number') throw new TypeError('timeSeconds must be a number')
    if (typeof upper !== 'number' || upper < 1) throw new TypeError(`invalid time signature: ${upper}/${lower}`)
    if (typeof lower !== 'number' || lower < 1) throw new TypeError(`invalid time signature: ${upper}/${lower}`)
    const reaTimeSig = (lower << 16) + upper
    this.add({ token: 'PT', params: [timeSeconds, 120, 1, reaTimeSig, 0, 3] })
  }

  /**
   * Add a tempo automation point to the end of the envelope. You must call
   * this in order, so that timeSeconds values are ascending.
   * @param {number} tempo the new tempo
   * @param {number} [timeSeconds = 0] position of the time signature on the
   * timeline. Make sure that this value exactly corresponds to the start of a
   * measure.
   * @param {number} [mode = 1] 1=square, 0=linear
   */
  addTempo (tempo, timeSeconds = 0, mode = 1) {
    if (typeof tempo !== 'number') throw new TypeError('tempo must be a number')
    if (typeof timeSeconds !== 'number') throw new TypeError('timeSeconds must be a number')
    if (![0, 1].includes(mode)) throw new TypeError(`invalid time signature mode: ${mode}`)
    this.add({ token: 'PT', params: [timeSeconds, tempo, mode] })
  }

  /**
   * Add an automation point to the end of the envelope. The automation point
   * will specify time signature AND tempo automation. You are responsible for
   * making sure that (1) the timeSeconds value exactly corresponds to the start
   * of a new measure, and (2) upper/lower make a valid time signature, and (3)
   * this is called in order, so that timeSeconds values of all points in the
   * envelope are ascending.
   *
   * This will interrupt an in-progress tempo curve.
   *
   * @param {number} upper time signature "numerator"
   * @param {number} lower time signature "demonimator"
   * @param {number} [timeSeconds = 0] position of the time signature on the
   * timeline. Make sure that this value exactly corresponds to the start of a
   * measure.
   */
  addTempoTimeSignature (tempo, upper, lower, timeSeconds, mode = 1) {
    if (typeof tempo !== 'number') throw new TypeError('tempo must be a number')
    if (typeof upper !== 'number' || upper < 1) throw new TypeError(`invalid time signature: ${upper}/${lower}`)
    if (typeof lower !== 'number' || lower < 1) throw new TypeError(`invalid time signature: ${upper}/${lower}`)
    if (typeof timeSeconds !== 'number') throw new TypeError('timeSeconds must be a number')
    if (![0, 1].includes(mode)) throw new TypeError(`invalid time signature mode: ${mode}`)

    const reaTimeSig = (lower << 16) + upper
    this.add({ token: 'PT', params: [timeSeconds, 120, mode, reaTimeSig, 0, 1] })
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
        return ReaperSource.midiMessagesToContents(input)
      default:
        return input.dump()
    }
  }
}

module.exports = {
  ReaperProject,
  ReaperItem,
  ReaperVst,
  ReaperTrack,
  ReaperSource,
  ReaperNotes,
  Tests,
  ReaperFXChain,
  ReaperPluginAutomation,
  ReaperPanAutomation,
  ReaperVolumeAutomation,
  ReaperWidthAutomation,
  ReaperTempoTimeSigAutomation
}
