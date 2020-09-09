const parser = require('./parser')
const objects = require('./reaper-objects')
const base = require('./reaper-base')
const specialize = require('./specialize')
const { VstB64, BitMask } = require('./vst-utils')

module.exports = {
  VstB64,
  BitMask,
  parse: parser.parse,
  base: base,
  objects: objects,
  specialize: specialize
}
