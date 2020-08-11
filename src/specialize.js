const ReaperBase = require('./reaper-base');
const {
    ReaperProject,
    ReaperVst,
    ReaperTrack,
    ReaperAudioItem,
    ReaperNotes,
    Tests,
    ReaperMidiItem,
    ReaperFXChain
} = require('./reaper-objects');
const reaperObjects = require('./reaper-objects');

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
            obj = new ReaperNotes(obj);
        case 'TRACK':
            obj = new ReaperTrack(obj);
        case 'REAPER_PROJECT':
            obj = new ReaperProject(obj);
        case 'ITEM':
            if (obj.params[0] === 'WAVE') {
                obj = new ReaperAudioItem(obj);
            } else if (obj.params[0] === 'MIDI'){
                obj = new ReaperMidiItem(obj);
            }
        case 'VST':
            obj = new ReaperVst(obj);
        case 'FXCHAIN':
            obj = new ReaperFXChain(obj);
    }

    for (let i in obj.contents) {
        obj.contents[i] = specialize(obj.contents[i]);
    }
    return obj;
}

module.exports = specialize;