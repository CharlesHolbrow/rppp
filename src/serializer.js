const { dump } = require(".");

// Base class for parsing objects that are not special.
class BaseSerializer {
    constructor (serializer) {
        this.serializer = serializer;
    }

    dumpObject(obj, indent = 0){
        var start = "  ".repeat(indent) + "<" + this.dumpStruct(obj) + '\n'
        var body = "";
        for (let o of obj.contents) {
            if (o.contents) {
                body += this.serializer.parseObject(o, indent + 1) + "\n";
            }
            else{
                body += this.dumpStruct(o, indent + 1) + "\n";
            }
        }
        var end = "  ".repeat(indent) + ">";
        return start + body + end;
    }

    dumpNum(i) {
        if (typeof i !== 'number') throw new Error('dumpNum was not passed a number');
        return i.toString();
    }

    dumpString(s, indent) {
        if (typeof s !== 'string') throw new Error('dumpString was not passed a string');
        
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

    dumpStruct(struct, indent = 0) {
        var specialStrings = this.findSpecialStrings(struct.params);
        var params = this.dumpParams(struct.params);
        var res = "  ".repeat(indent) + struct.token + params;

        res += this.dumpSpecialStrings(struct.token, specialStrings, indent+1);

        return res;
    }
}

//TODO: Implement an FXChain object handler
class VstSerializer extends BaseSerializer {
    dumpObject(obj, indent = 0) {

        var params = this.dumpParams(obj.params.slice(0, -5));

        // This part may not be needed if Reaper doesn't care if the strings are double quoted
        var vstInfo = obj.params.slice(end=-3);
        var nodq = obj.params.slice(-5, -4);
        var leftover = this.dumpParams(obj.params.slice(-4, -3));
        var res = "  ".repeat(indent) + obj.token + params + " " + nodq + leftover;

        var lines = [];
        var start = 0;
        var vst2 = obj.params.slice(-2)[0]
        for (var i = 0; i < vst2.length; i++){
            if (i % 128 == 0 && i != 0){
                lines.push(vst2.slice(start, i))
                start = i;
            }
        }
        if (vst2.length % 128 != 0) lines.push(vst2.slice(start, vst2.length))
        
        var start = "  ".repeat(indent) + "<" + res + '\n'
        var vst1 = "  ".repeat(indent + 1) + obj.params.slice(-3)[0] + '\n'
        
        var body = ""
        for (let line of lines) {
            body += "  ".repeat(indent+1) + line + '\n';
        }

        var vst3 = "  ".repeat(indent + 1) + obj.params.slice(-1)[0] + '\n'
        var end = "  ".repeat(indent) + ">";

        return start + vst1 + body + vst3 + end;

    }
}

class NotesSerializer extends BaseSerializer {
    dumpObject(obj, indent = 0) {
        let notes = obj.params[0].split('\n');
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
class Serializer {
    constructor () {
        // initialize the other serializers here
        this.base = new BaseSerializer(this);
        this.vst = new VstSerializer(this);
        this.notes = new NotesSerializer(this);
    }

    parseObject(obj, indent = 0 /* Internal Use Only */) {
        if (!obj.token) throw new Error('Objects need to have a token key');
        if (typeof obj.token !== 'string') throw new Error('obj.token has to have type string');
        if (!obj.params) throw new Error('Objects need to have a params key');
        if (!Array.isArray(obj.params)) throw new Error('obj.params has to have type Array');
        if (!obj.contents) throw new Error('Objects need to have a contents key');
        if (!Array.isArray(obj.contents)) throw new Error('obj.contents has to have type Array');

        /* 
        Currently only checks for two special tokens, VST and NOTES.
        */
        switch(obj.token) {
            case 'VST':
                return this.vst.dumpObject(obj, indent);
            case 'NOTES':
                return this.notes.dumpObject(obj, indent);
            default:
                return this.base.dumpObject(obj, indent);
        }
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
            case 'object':
                return this.parseObject(input);
            default:
                return this.parseObject(input);
        }
    }
}

module.exports = Serializer