const parser = require('./parser')
const objects = require('./reaper-objects')
const base = require('./reaper-base')
const specialize = require('./specialize')
const { Vst2LineOne, BitMask } = require('./vst-utils')

module.exports = {
  Vst2LineOne,
  BitMask,
  parse: parser.parse,
  base: base,
  objects: objects,
  specialize: specialize
}
