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
object = start lines:struct+ end {
  return { type: lines[0].token, lines };
}


/*
example struct `ONE "hello" 1`
*/
struct = white* token:token params:params crlf? { return { token, params }; }


/*
A token is the ALL upper case name that identifes a reaper structure.
Three example tokens: REAPER_PROJECT RIPPLE GROUPOVERRIDE
*/
token "token" = chars:[A-Z_]+ { return chars.join(''); }


/*
Parameters are everything after the token.
       token <- | -> params
`<REAPER_PROJECT 0.1 "6.13/OSX64" 1596463823`
This rule expects every param to be preceeded by a space
*/
param  "param"  = space p:(string / int) { return p; }
params "params" = param*


/*
For now, only handle double quote strings with a small character subset.
See `rpp-examples/tricky-strings.RPP` for other examples of strings.

TODO: Handle other strings types
*/
string "string" = '"' chars:char* '"' { return chars.join(''); }
char            = [a-z 0-9]i

/* */
int   = txt:$("0" / ([1-9] digit*)) { return parseInt(txt); }
digit = [0-9]
space = " "
white = space / "\t"
start = white* "<"
end   = ">" white* crlf?
crlf  = "\n"
