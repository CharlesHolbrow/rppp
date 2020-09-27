const ReaperBase = require('./reaper-base')
const rea = require('./reaper-objects')

/**
 * @typedef {Object} ReaData
 * @property {string} token Reaper token such as VST, TRACK, or NAME
 * @property {string[]} params ex. ["hi", 5000]
 * @property {ReaData[]} [contents] optional contents
 */
function specialize (obj) {
  if (!(obj instanceof ReaperBase)) return obj;

  switch (obj.token) {
    case 'NOTES':
      obj = new rea.ReaperNotes(obj);
      break;
    case 'TRACK':
      obj = new rea.ReaperTrack(obj);
      break;
    case 'REAPER_PROJECT':
      obj = new rea.ReaperProject(obj);
      break;
    case 'ITEM':
      obj = new rea.ReaperItem(obj);
      break;
    case 'SOURCE':
      switch(obj.params[0]){
        case 'WAVE':
          obj = new rea.ReaperAudioSource(obj);
          break;
        case 'MIDI':
          obj = new rea.ReaperMidiSource(obj);
          break;
      }
      break;
    case 'VST':
      obj = new rea.ReaperVst(obj);
      break;
    case 'FXCHAIN':
      obj = new rea.ReaperFXChain(obj);
      break;
    case 'VOLENV2':
      obj = new rea.ReaperVolumeAutomation(obj);
      break;
    case 'PANENV2':
      obj = new rea.ReaperPanAutomation(obj);
      break;
    case 'WIDTHENV2':
      obj = new rea.ReaperWidthAutomation(obj);
      break;
    default:
      break;
  }

  for (const i in obj.contents) {
    obj.contents[i] = specialize(obj.contents[i]);
  }
  return obj;
}

module.exports = specialize;
