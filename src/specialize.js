const ReaperBase = require('./reaper-base')
const rea = require('./reaper-objects')
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
      obj = new rea.ReaperNotes(obj)
      break
    case 'TRACK':
      obj = new rea.ReaperTrack(obj)
      break
    case 'REAPER_PROJECT':
      obj = new rea.ReaperProject(obj)
      break
    case 'ITEM':
      for (const i in obj.contents) {
        if (obj.contents[i].token === 'SOURCE') {
          if (obj.contents[i].params[0] === 'MIDI') {
            obj = new rea.ReaperMidiItem(obj)
          } else if (obj.contents[i].params[0] === 'WAVE') {
            obj = new rea.ReaperAudioItem(obj)
          }
        }
      }
      if (obj.params[0] === 'WAVE') {
        obj = new rea.ReaperAudioItem(obj)
      } else if (obj.params[0] === 'MIDI') {
        obj = new rea.ReaperMidiItem(obj)
      }
      break
    case 'VST':
      obj = new rea.ReaperVst(obj)
      break
    case 'FXCHAIN':
      obj = new rea.ReaperFXChain(obj)
      break
    case 'VOLENV2':
      obj = new rea.ReaperVolumeAutomation(obj)
      break
    case 'PANENV2':
      obj = new rea.ReaperPanAutomation(obj)
      break
    case 'WIDTHENV2':
      obj = new rea.ReaperWidthAutomation(obj)
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
