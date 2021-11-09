{
  const ReaperBase = require('./reaper-base.js');
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
object = (start o: multiline_objects end {
  return o;
})
/ (start header: struct contents: (struct/object)* end {
  return new ReaperBase({ token: header.token, params: header.params, contents });
})

struct = (white* token_1:token params:params crlf start token_2:token crlf pipe_string: pi_string end 
& {
  return token_1 === token_2;
} { 
  params[0] = pipe_string; 
  return {token: token_1, params};
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

multiline_objects = NOTES / VST / CFG
VST = "VST" params: params crlf vstA:b64 vstB:b64 vstC:b64
{ 
  const b64Chunks = [vstA, vstB, vstC]
  return new ReaperBase({ token: "VST", params, b64Chunks });
}
NOTES = "NOTES" crlf note: pi_string { 
  return new ReaperBase({ token: "NOTES", params: [ note ]}); 
}
CFG = token:cfg_token params:params crlf b64Chunks:b64* {
  return new ReaperBase({ token, params, b64Chunks })
}
// Add CFG object that contain base64 content to `cfg`:
cfg_token = "RECORD_CFG" / "APPLYFX_CFG" / "RENDER_CFG"

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
char            = [a-zA-Z 0-9!.,:@#$%^&*(){}<>[\]_+/="'|`-]

/* */
decimal = txt:$(int "." digit*) { return parseFloat(txt); }
int     = txt:$("0" / ("-"? [1-9] digit*)) { return parseInt(txt); }
digit   = [0-9]
space   = " "
white   = space / "\t"
start   = white* "<"
end     = white* ">" white* crlf?
crlf    = "\n" / "\r\n"

/*
Note that base64 strings in reaper may wrap to new lines, and have additional
whitepsace at the beginning of each newline.
*/
b64 = fullLines:b64_full_line* lastLine: b64_short_line {
  return fullLines.join('') + lastLine
}

b64_short_line = line:b_line & { // every b64 chunk ends with a short line
  return line.length < 128
} { return line }

b64_full_line = line:b_line & {
  return line.length >= 128
} { return line }

b_line = white* chars:b* e1:'='?  e2:'='?  crlf {
  return chars.join('') + (e1 || '') + (e2 || '');
}

b = $[a-zA-Z0-9+\/]
