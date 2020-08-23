const ReaperBase = require('./reaper-base');

class ReaperAutomationTrack extends ReaperBase {
  constructor (obj) {
      super(obj);
  }

  addPoint(time, value, curveType) {
    if (typeof time !== 'number') throw new TypeError('time has to be of type number');
    if (typeof value !== 'number') throw new TypeError('value has to be of type number');
    if (typeof curveType !== 'number') throw new TypeError('curveType has to be of type number');

    this.add({ token: 'PT', params: [time, value, curveType] });
  }

  addBezierPoint(time, value, bezierTension = 0) {
    if (typeof time !== 'number') throw new TypeError('time has to be of type number');
    if (typeof value !== 'number') throw new TypeError('value has to be of type number');
    if (typeof bezierTension !== 'number') throw new TypeError('bezierTension has to be of type number');

    // The meaning of these parameters is on the Reaper WIKI:
    // https://wiki.cockos.com/wiki/index.php/State_Chunk_Definitions#Envelope
    const tempoenvex = 0;
    const selected = 0;
    const unknown = 0;
    const curveType = 5;
    const params = [time, value, curveType, tempoenvex, selected, unknown, bezierTension];

    this.add({ token: 'PT', params });
  }
}

module.exports = ReaperAutomationTrack;