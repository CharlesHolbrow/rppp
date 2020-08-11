const ReaperBase = require('./reaper-base')
const {
  ReaperProject,
  ReaperVst,
  ReaperTrack,
  ReaperAudioItem,
  ReaperNotes,
  ReaperMidiItem,
  ReaperFXChain
} = require('./reaper-objects')
const reaperObjects = require('./reaper-objects')

/**
 * @typedef {Object} ReaData
 * @property {string} token Reaper token such as VST, TRACK, or NAME
 * @property {string[]} params ex. ["hi", 5000]
 * @property {ReaData[]} [contents] optional contents
 */
function specialize (obj) {
  if (!(obj instanceof ReaperBase)) return obj

  switch (obj.token) {
    case 'NOTES':
      obj = new ReaperNotes(obj)
      break
    case 'TRACK':
      obj = new ReaperTrack(obj)
      break
    case 'REAPER_PROJECT':
      obj = new ReaperProject(obj)
      break
    case 'ITEM':
      for (const i in obj.contents) {
        if (obj.contents[i].token === 'SOURCE') {
          if (obj.contents[i].params[0] === 'MIDI') {
            obj = new ReaperMidiItem(obj)
          } else if (obj.contents[i].params[0] === 'WAVE') {
            obj = new ReaperAudioItem(obj)
          }
        }
      }
      if (obj.params[0] === 'WAVE') {
        obj = new ReaperAudioItem(obj)
      } else if (obj.params[0] === 'MIDI') {
        obj = new ReaperMidiItem(obj)
      }
      break
    case 'VST':
      obj = new ReaperVst(obj)
      break
    case 'FXCHAIN':
      obj = new ReaperFXChain(obj)
      break
    default:
      break
  }

  for (const i in obj.contents) {
    obj.contents[i] = specialize(obj.contents[i])
  }
  return obj
}

module.exports = specialize
