const parser = require('./parser')
const objects = require('./reaper-objects')
const specialize = require('./specialize')
const { VstB64, BitMask } = require('./vst-utils')
const ReaperBase = require('./reaper-base')

/**
 * @param {string} rppString a .RPP formatted object or struct to parse
 * @returns {(import('./reaper-base').ReaData|ReaperBase)}
 */
function parse (rppString) {
  return parser.parse(rppString)
}

/**
 * This is stricter than rppp.parse and is guaranteed to return a ReaperBase
 * instance.
 * @param {string} rppString a .RPP formatted object to parse
 * @returns {ReaperBase}
 */
function parseAndSpecialize (rppString) {
  const parsedProject = parse(rppString)
  if (!(parsedProject instanceof ReaperBase)) throw new Error('rppp.parseObject failed to create a ReaperBase instance. If you are trying to parse a struct, use rppp.parse')
  return specialize(parsedProject)
}

module.exports = {
  VstB64,
  BitMask,
  parse,
  parseAndSpecialize,
  base: ReaperBase, // included for backwards compatibility
  ReaperBase,
  objects: objects,
  specialize: specialize
}
