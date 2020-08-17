const ReaperBase = require('./reaper-base');

class ReaperAutomationTrack extends ReaperBase {
  constructor (obj) {
      super(obj);
  }

  addPoint(time, value, curveType){
    if (typeof time !== 'number') throw new TypeError('time has to be of type number');
    if (typeof value !== 'number') throw new TypeError('value has to be of type number');
    if (typeof curveType !== 'number') throw new TypeError('curveType has to be of type number');
    this.add({token: 'PT', params: [time, value, curveType]})
  }
}

module.exports = ReaperAutomationTrack;