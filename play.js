// Simple script for experimenting from a REPL. To use:
//
// $ node
// > .load play.js

const fs = require('fs')
const path = require('path')
const rppp = require('.')

const rppEmptyStr = fs.readFileSync(path.join('rpp-examples', 'empty.RPP'), 'utf-8')
let rppEmpty = rppp.parse(rppEmptyStr)
rppEmpty = rppp.specialize(rppEmpty)

const rppZebra2Str = fs.readFileSync(path.join('rpp-examples', 'vst2-zebra2.RPP'), 'utf-8')
let rppZebra2 = rppp.parse(rppZebra2Str)
rppZebra2 = rppp.specialize(rppZebra2)

const zebra2 = rppZebra2
  .getOrCreateStructByToken('TRACK')
  .getOrCreateStructByToken('FXCHAIN')
  .getOrCreateStructByToken('VST')

console.log('"rppEmpty"  loaded:', rppEmpty.token, rppEmpty.params)
console.log('"rppZebra2" loaded:', rppZebra2.token, rppZebra2.params)
console.log('"zebra2"     found:', zebra2.params.slice(0, 7).concat([zebra2.params[7].slice(0, 10) + '...', zebra2.params[8]]))
