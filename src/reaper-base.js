/**
 * @typedef {Object} ReaData
 * @property {string} token Reaper token such as VST, TRACK, or NAME
 * @property {string[]} params ex. ["hi", 5000]]
 * @property {ReaData[]} [contents] optional contents
 */

// Base class for parsing objects that are not special.
class ReaperBase {
  /**
     * @param {ReaData} obj
     */
  constructor (obj) {
    if (!obj.token) throw new TypeError('Objects need to have a token key')
    if (typeof obj.token !== 'string') throw new TypeError('obj.token has to have type string')
    if (!obj.params) obj.params = []

    if (!Array.isArray(obj.params)) throw new TypeError('obj.params has to have type Array')
    if (!obj.contents) obj.contents = []
    if (!Array.isArray(obj.contents)) throw new TypeError('obj.contents has to have type Array')

    this.token = obj.token
    this.params = obj.params
    this.contents = obj.contents
  }

  /**
   * Gets the `index`'th struct with token `token` and returns the object.
   * If the `index`'th struct was not found, then create a token and push 
   * it to the end of the contents array.
   * @param {string} token
   * @param {number} index
   */
  getOrCreateStructByToken (token, index = 0) {
    let found = 0;
    for (let obj of this.contents){
      if (obj.token === token){
        if (found === index) {
          return obj;
        }
        found += 1;
      }
    }
    return this.createStruct(token, this.contents.length);
  }

  /**
   * Creates a struct with token `token` at index `index`.
   * @param {string} token
   * @param {number} index
   */
  createStruct(token, index = 0){
    var obj = {'token': token, params: []};    
    this.contents.splice(index, 0, obj);
    return this.contents[index];
  }

  /**
     * Adds a ReaData object to the contents array of this object.
     * @param {ReaData} obj
     */
  add (obj) {
    if (!obj) throw new Error('An argument is needed to be added to the contents array')
    this.contents.push(obj)
    return this
  }

  dump (indent = 0) {
    var start = '  '.repeat(indent) + '<' + ReaperBase.dumpStruct(this.token, this.params) + '\n'
    var body = ''
    for (const o of this.contents) {
      if (o.contents) {
        body += o.dump(indent + 1) + '\n'
      } else {
        body += ReaperBase.dumpStruct(o.token, o.params, indent + 1) + '\n'
      }
    }
    var end = '  '.repeat(indent) + '>'
    return start + body + end
  }

  static dumpNum (i) {
    if (typeof i !== 'number') throw new TypeError('dumpNum was not passed a number')
    return i.toString()
  }

  static dumpString (s) {
    if (typeof s !== 'string') throw new TypeError('dumpString was not passed a string')

    if (s.includes(' ') || s.length === 0 || s[0] === '"' || s[0] === '`' || s[0] === "'") {
      if (s.includes('"')) {
        if (s.includes("'")) {
          if (s.includes('`')) {
            return '`' + s.replace(/`/g, "'") + '`'
          }
          return '`' + s + '`'
        }
        return "'" + s + "'"
      }
      return '"' + s + '"'
    }
    return s
  }

  static dumpParams (params) {
    var out = ''
    for (const param of params) {
      if (typeof param === 'number') out += ' ' + ReaperBase.dumpNum(param)
      else out += ' ' + ReaperBase.dumpString(param)
    }
    return out
  }

  static dumpStruct (token, params, indent = 0) {
    const findSpecialStrings = function (params) {
      var specialStrings = []
      for (const param of params) {
        if (typeof param === 'string' && param.includes('"') && param.includes("'") && param.includes('`')) {
          specialStrings.push(param)
        }
      }
      return specialStrings
    }

    const dumpSpecialStrings = function (token, special, indent) {
      var res = ''
      for (const s of special) {
        const start = '\n  '.repeat(indent) + '<' + token + '\n'
        const body = '  '.repeat(indent + 1) + '|' + s + '\n'
        const end = '  '.repeat(indent) + '>'
        res += start + body + end
      }
      return res
    }

    var specialStrings = findSpecialStrings(params)
    var sparams = ReaperBase.dumpParams(params)
    var res = '  '.repeat(indent) + token + sparams

    res += dumpSpecialStrings(token, specialStrings, indent + 1)

    return res
  }
}

module.exports = ReaperBase
