# RPP Parser

Experimental file parser for the [Reaper](https://reaper.fm) Digital Audio Workstation.

Not ready for use.

`
$ npm install rppp
$ node
`

```
const rppp = require('rppp');
const result = rppp.parse('<HI "there" 1>');
const expect = {
    type: 'HI',
    lines: [
        { token: 'HI', params: ['there', 1] }
    ]
};
```

Recommended VS Code Plugin: [PEG.js Language by Futago-za Ryuu](https://marketplace.visualstudio.com/items?itemName=futagozaryuu.pegjs-syntax)
