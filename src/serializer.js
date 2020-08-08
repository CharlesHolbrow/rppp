const { dump } = require(".");
const parser = require("./parser")
const fs = require("fs")
const { getAudioDurationInSeconds } = require('get-audio-duration');
 
// Base class for parsing objects that are not special.
class BaseSerializer {
    constructor (obj) {
        if (!obj.token) throw new TypeError('Objects need to have a token key');
        if (typeof obj.token !== 'string') throw new TypeError('obj.token has to have type string');
        if (!obj.params) obj.params = [];
        
        if (!Array.isArray(obj.params)) throw new TypeError('obj.params has to have type Array');
        if (!obj.contents) obj.contents = [];
        if (!Array.isArray(obj.contents)) throw new TypeError('obj.contents has to have type Array');

        this.token = obj.token
        this.params = obj.params
        this.contents = obj.contents
    }

    dump(indent = 0){
        var start = "  ".repeat(indent) + "<" + this.dumpStruct(this.token, this.params) + '\n'
        var body = "";
        for (let o of this.contents) {
            if (o.contents) {
                body += o.dump(indent + 1) + "\n";
            }
            else{
                body += this.dumpStruct(o.token, o.params, indent + 1) + "\n";
            }
        }
        var end = "  ".repeat(indent) + ">";
        return start + body + end;
    }

    dumpNum(i) {
        if (typeof i !== 'number') throw new TypeError('dumpNum was not passed a number');
        return i.toString();
    }

    dumpString(s, indent) {
        if (typeof s !== 'string') throw new TypeError('dumpString was not passed a string');

        if (s.includes(' ') || s.length == 0 || s[0] == '"' || s[0] == '`' || s[0] == "'") {
            if (s.includes('"')) {
                if (s.includes("'")){
                    if (s.includes('`')){
                        return "`" + s.replace(/`/g, "'") + "`";
                    }
                    return "`" + s + "`";
                }
                return "'" + s + "'";
            }
            return '"' + s + '"';
        }
        return s
    }

    dumpSpecialStrings(token, special, indent) {
        var res = "";

        for (let s of special) {
            let start = "\n  ".repeat(indent) + "<" + token + '\n';
            let body = "  ".repeat(indent+1) + "|" + s + '\n';
            let end = "  ".repeat(indent) + ">";
            res += start + body + end;
        }
        return res;
    }

    dumpParams(params) {        
        var out = "";
        var specialStrings = [];
        for (let param of params){
            if (typeof param === 'number') out += " " + this.dumpNum(param);
            else out += " " + this.dumpString(param);
        }
        return out;
    }

    findSpecialStrings(params) {
        var specialStrings = [];
        for (let param of params){
            if (typeof param === 'string' && param.includes('"') && param.includes("'") && param.includes('`')) {
                specialStrings.push(param);
            }   
        }
        return specialStrings;
    }

    dumpStruct(token, params, indent = 0) {
        var specialStrings = this.findSpecialStrings(params);
        var sparams = this.dumpParams(params);
        var res = "  ".repeat(indent) + token + sparams;

        res += this.dumpSpecialStrings(token, specialStrings, indent+1);

        return res;
    }
}

class ReaperProjectSerializer extends BaseSerializer {
    // the constructor should create a parsed version of a empty reaper project
    constructor(obj) {
        if (obj) { super(obj); }
        else{
            let emptys = fs.readFileSync(__dirname + "/../rpp-examples/empty.RPP", 'utf8');
            let empty = parser.parse(emptys)
            super(empty);
        }
    }

    addTrack(name) {
        if (typeof name !== 'string') throw new TypeError("name has to be of type string")
        this.contents.push(new TrackSerializer({token: "TRACK", contents: [ {token: "NAME", params: [name]} ]}))
        return this;
    }
}

class TrackSerializer extends BaseSerializer {
    constructor (obj) {
        super(obj);
    }

    addMidiItem() {

    }

    addAudioItemFromObject (audioObj) {
        if (! (audioObj instanceof AudioItemSerializer)) throw new TypeError("audioObj has to be of type AudioItemSerializer")
        this.contents.push(audioObj);
        return this;
    }

    addAudioItem(position, length, filename) {
        if (typeof filename !== 'string') throw new TypeError("filename has to be of type string")
        if (typeof length !== 'number') throw new TypeError("position has to be of type number")
        if (typeof position !== 'number') throw new TypeError("position has to be of type number")
        
        this.contents.push(new AudioItemSerializer({
            token: 'ITEM',
            params: [],
            contents: [
                {token: 'POSITION', params: [ position ]},
                {token: 'LENGTH', params: [ length ]},
                new BaseSerializer({
                    token: 'SOURCE', 
                    params: ['WAVE'],
                    contents: [
                        {token: 'FILE', params: [filename]},
                    ]
                })
            ]
        }));
        return this;
    }
}

class AudioItemSerializer extends BaseSerializer {
    constructor (obj) {
        super(obj);
    }
}

class MidiItemSerializer extends BaseSerializer {
    constructor (obj) {
        super(obj);
    }
}

class FXChainSerializer extends BaseSerializer {
    constructor (obj) {
        super(obj);
    }

    addVst(vstObj) {
        if (! (vstObj instanceof VstSerializer)) throw new TypeError("vstObj has to be of type VstSerializer")
        this.contents.push(vstObj);
        return this;
    }
}

class VstSerializer extends BaseSerializer {
    constructor (obj) {
        super(obj);
        if (obj.externalAttributes) this.externalAttributes = obj.externalAttributes;
        else this.externalAttributes = {}
    }

    dumpExternalAttribute(attr, indent){
        if (typeof attr !== 'string') throw new TypeError ("attr must be of type string");
        if (this.externalAttributes[attr]){
            return this.dumpStruct(attr, this.externalAttributes[attr], indent) + '\n';
        }
        return "";
    }

    dump(indent = 0) {
        let params = this.dumpParams(this.params.slice(0, -3));
        let res = this.token + params;

        var lines = [];
        var startIdx = 0;
        let vst2 = this.params.slice(-2)[0]
        for (var i = 0; i < vst2.length; i++){
            if (i % 128 == 0 && i != 0){
                lines.push(vst2.slice(startIdx, i))
                startIdx = i;
            }
        }
        if (vst2.length % 128 != 0) lines.push(vst2.slice(startIdx, vst2.length))

        let BYPASS = this.dumpExternalAttribute("BYPASS", indent)
        let PRESETNAME = this.dumpExternalAttribute("PRESETNAME", indent)
        let FLOATPOS = this.dumpExternalAttribute("FLOATPOS", indent)
        let FXID = this.dumpExternalAttribute("FXID", indent)
        let WAK = this.dumpExternalAttribute("WAK", indent)
        
        let start = "  ".repeat(indent) + "<" + res + '\n'
        let vst1 = "  ".repeat(indent + 1) + this.params.slice(-3)[0] + '\n'
        
        var body = ""
        for (let line of lines) {
            body += "  ".repeat(indent+1) + line + '\n';
        }

        let vst3 = "  ".repeat(indent + 1) + this.params.slice(-1)[0] + '\n'
        let end = "  ".repeat(indent) + ">";

        let vstBody = start + vst1 + body + vst3 + end + '\n';

        return (BYPASS + vstBody + PRESETNAME + FLOATPOS + FXID + WAK).slice(0, -1);
    }
}

class NotesSerializer extends BaseSerializer {
    constructor (obj) {
        super(obj);
    }

    dump(indent = 0) {
        let notes = this.params[0].split('\n');
        var start = "  ".repeat(indent) + "<NOTES\n";
        var body = "";
        for (let line of notes) {
            body += "  ".repeat(indent+1) + '|' + line + '\n';
        }
        var end = "  ".repeat(indent) + ">";
        return start + body + end;
    }
}

/**
   * Serializes an object and outputs it as an RPP file. 
   */
class TestsSerializer {
    constructor () {
        // initialize the other serializers here
        this.base = new BaseSerializer({token: "TEST"});
        this.vst = new VstSerializer({token: "TEST"});
        this.notes = new NotesSerializer({token: "TEST"});
    }

    /**
     * Parses an object and dumps its representation as a string in RPP format.
     * @param {object} obj - An object of the following format containing information in an RPP file.
     * {
     *  token {string}: NAME OF TOKEN
     *  params {Array}: Object parameters
     *  contents {Array}: Array of structs or objects
     * }
     */
    dump (input, debugSettings) {
        switch (debugSettings.startRule) {
            case 'int':
                return this.base.dumpNum(input);
            case 'decimal':
                return this.base.dumpNum(input);
            case 'params':
                return this.base.dumpParams(input);
            case 'string':
                return this.base.dumpString(input);
            default:
                return input.dump();
        }
    }
}

module.exports = {
    ReaperProject: ReaperProjectSerializer,
    Base: BaseSerializer,
    Vst: VstSerializer,
    Track: TrackSerializer,
    AudioItem: AudioItemSerializer,
    Notes: NotesSerializer,
    Tests: TestsSerializer,
    MidiItem: MidiItemSerializer,
    FXChain: FXChainSerializer,
}