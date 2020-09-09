/**
 * @typedef {Object} ReaData
 * @property {string} token Reaper token such as VST, TRACK, or NAME
 * @property {any[]} params ex. ["hi", 5000]]
 * @param {any[]} contents
 * @param {any[]} b64Chunks
 */

const { splitBase64String } = require('./base64')

// Base class for parsing objects that are not special.
class ReaperBase {
  /**
   * @param {ReaData} obj
   */
  constructor ({ token, params = [], contents = [], b64Chunks = [] } = {}) {
    if (!token) throw new TypeError('ReaperBase needs a .token string')
    if (typeof token !== 'string') throw new TypeError('ReaperBase .token must be a string')
    if (!Array.isArray(params)) throw new TypeError('ReaperBase .params must be an Array')
    if (!Array.isArray(contents)) throw new TypeError('ReaperBase .contents must be a Array')
    if (!Array.isArray(b64Chunks)) throw new TypeError('ReaperBase .b64Chunks must be a Array')

    this.token = token
    this.params = params
    this.contents = contents

    /**
     * @member {string|object} b64Chunks[] Each item in the array will represent
     * a b64 chunk. When an object has multiple chunks (VSTs have 3), each chunk
     * will be stored as a single string even if it's textual representation
     * spans multiple lines. The dump method is responsible for splitting up
     * long b64 strings.
     *
     * IMPORTANT: Any objects in .b64Chunks MUST have a .toString() method.
     */
    this.b64Chunks = b64Chunks
  }

  /**
   * Gets the `index`'th struct with token `token` and returns the object.
   * If the `index`'th struct was not found, then create a token and push
   * it to the end of the contents array.
   * @param {string} token
   * @param {number} index
   */
  getOrCreateStructByToken (token, index = 0) {
    let found = 0
    for (const obj of this.contents) {
      if (obj.token === token) {
        if (found === index) {
          return obj
        }
        found += 1
      }
    }
    return this.createStruct(token, this.contents.length)
  }

  /**
   * Creates a struct with token `token` at index `index`.
   * @param {string} token
   * @param {number} index
   */
  createStruct (token, index = 0) {
    var obj = { token: token, params: [] }
    this.contents.splice(index, 0, obj)
    return this.contents[index]
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
    const start = '  '.repeat(indent) + '<' + ReaperBase.dumpStruct(this.token, this.params) + '\n'
    let body = ''
    // Output Sub Objects
    for (const o of this.contents) {
      if (o.contents) {
        body += o.dump(indent + 1) + '\n'
      } else {
        body += ReaperBase.dumpStruct(o.token, o.params, indent + 1) + '\n'
      }
    }

    body += this.dumpB64Chunks(indent + 1)

    var end = '  '.repeat(indent) + '>'
    return start + body + end
  }

  dumpB64Chunks (indent = 0) {
    let body = ''

    // Output base64 chunks, splitting long lines if needed
    if (this.b64Chunks.length) {
      const indentStr = '  '.repeat(indent)
      const b64Lines = this.b64Chunks
        .map(b64 => splitBase64String(typeof b64 === 'string' ? b64 : b64.toString()))
        .flat()

      body += indentStr + b64Lines.join('\n' + indentStr) + '\n'
    }

    return body
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
