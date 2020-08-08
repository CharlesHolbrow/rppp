const rppp = require('./src/index')
const fs = require('fs')

let emptys = fs.readFileSync(__dirname + "/rpp-examples/audio-file-x4.RPP", 'utf8');
let project = new rppp.parse(emptys)

project.addTrack('1')
project.addTrack('2')
project.contents[project.contents.length - 1].addAudioClip(2, 0.10179138321995, __dirname + '/rpp-examples/media/909-kick.wav')

console.log(project.contents[project.contents.length - 1].contents[1].contents)