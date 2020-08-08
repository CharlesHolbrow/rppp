{
  const { ReaperProject, Base, Vst, Track, AudioClip, Notes, Tests, FXChain } = require('./serializer.js');
}

/*
Objects look like this
```
<REAPER h
  ONE "hello"
  TWO 1 2 3
>
```
Objects always have at least one struct (`<>` is not valid)
*/
object =  (start? obj: special_object end? {
  return obj 
} ) 

/ (start header: struct contents: (struct/object)* end {
  return new Base({ token: header.token, params: header.params, contents });
})

/*
Tokens that require special parsing, e.g. VST, NOTES
*/
struct = (white* token:token params:params crlf start token crlf pipe_string: pi_string end { 
  params[0] = pipe_string; 
  return {token, params};
})

/*
example struct `ONE "hello" 1`
*/
/ (white* token:token params:params crlf? { return { token, params }; } )


/*
A token is the ALL upper case name that identifes a reaper structure.
Three example tokens: REAPER_PROJECT RIPPLE GROUPOVERRIDE
*/
token "token" = chars:[A-Z_0-9]+ { return chars.join(''); }

/*
Parsing for special tokens
*/
special_object = NOTES / TRACK / REAPER_PROJECT / AUDIOCLIP / FXCHAIN / VST
FXCHAIN = "FXCHAIN" params: params crlf contents: (VST/struct/object)* {
  return new FXChain({ token: "FXCHAIN", params, contents}); 
}

VST = BYPASSparams: (white* "BYPASS" p: params crlf {return p;})?
      start? "VST" VSTparams: params crlf white* base64data: multiline_string end? 
      PRESETNAMEparams: (white* "PRESETNAME" p: params crlf {return p;})?
      FLOATPOSparams: (white* "FLOATPOS" p: params crlf {return p;})?
      FXIDparams: (white* "FXID" p: params crlf {return p;})?
      WAKparams:(white* "WAK" p: params crlf {return p;})?
{ 
  const returnObject = {token: "VST", externalAttributes: {}}
  if (BYPASSparams) returnObject.externalAttributes["BYPASS"] = BYPASSparams;
  if (PRESETNAMEparams) returnObject.externalAttributes["PRESETNAME"] = PRESETNAMEparams;
  if (FLOATPOSparams) returnObject.externalAttributes["FLOATPOS"] = FLOATPOSparams;
  if (FXIDparams) returnObject.externalAttributes["FXID"] = FXIDparams;
  if (WAKparams) returnObject.externalAttributes["WAK"] = WAKparams;
  
  VSTparams.push(base64data[0], base64data.slice(1, -1).join(''), base64data.slice(-1)[0])
  returnObject.params = VSTparams;

  return new Vst(returnObject);
}


NOTES = "NOTES" crlf note: pi_string { 
  return new Notes({ token: "NOTES", params: [ note ]}); 
}
TRACK = "TRACK" params:params crlf contents: (struct/object)* { 
  return new Track({token: "TRACK", params: params, contents})
}
REAPER_PROJECT = "REAPER_PROJECT" params:params crlf contents: (struct/object)* { 
  return new ReaperProject({token: "REAPER_PROJECT", params: params, contents})
}
AUDIOCLIP = "ITEM" params:params crlf contents:(struct/object)* & {
  for(let line of contents){
    if(line.token === "SOURCE" && line.params[0] === "WAVE") return true;
  }
  return false;
} {
  return new AudioClip({token: "ITEM", params: params, contents})
}

/*
Parameters are everything after the token.
       token <- | -> params
`<REAPER_PROJECT 0.1 "6.13/OSX64" 1596463823`
This rule expects every param to be preceeded by a space
*/
param  "param"  = space p:(decimal !char_nosp / int !char_nosp / string !char_nosp)  { return p[0]; }
params "params" = param*
/*
Some parameters span multiple lines
*/
whiteline = white* line: line {return line}
multiline_string = lines: whiteline* { return lines }

/*
Supports strings that start with ", ' and `. 
Supports strings that start with numbers but contain non-digits.
*/
string "string" = '"' chars:char_nodq* '"' { return chars.join(''); } / bt_string
bt_string       = '`' chars:char_nobt* '`' { return chars.join(''); } / sq_string
sq_string       = "'" chars:char_nosq* "'" { return chars.join(''); } / nq_string
nq_string       = chars:char_nosp* { return chars.join(''); } 

// Pipe strings for notes and strings that contain all three delimiters
pi_string       = lines: pline+ { return lines.join('\n'); }
pline = white * '|' str: line { return str }
line = chars: char* crlf { return chars.join('') }

char_nodq       = !'"' c:char { return c }
char_nobt       = !'`' c:char { return c }
char_nosq       = !"'" c:char { return c }
char_nosp       = !' ' c:char { return c }
char            = [a-z 0-9!.,:@#$%^&*(){}_+/="'|`-]i

/* */
decimal = txt:$(int "." digit*) { return parseFloat(txt); }
int     = txt:$("0" / ("-"? [1-9] digit*)) { return parseInt(txt); }
digit   = [0-9]
space   = " "
white   = space / "\t"
start   = white* "<"
end     = white* ">" white* crlf?
crlf    = "\n" / "\r\n"
