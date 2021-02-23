# RPP Parser

Package for parsing and programmatically constructing files for the [Reaper](https://reaper.fm) Digital Audio Workstation.

```
$ npm install rppp
```

## Parsing
This library parses Reaper Files into a tree of `objects` and `structs`. 

As an example, `structs` look like this:
```
POSITION 2 1 4
```
They have a `token`, `"POSITION"`, and a list of `params`, `[2, 1, 4]`, and are parsed into javascript objects with the `rppp.parse()` function which returns something like this:
```javascript
{ token: 'POSITION', params: [2, 1, 4] }
```

`objects` look like this:
```
<ITEM
  POSITION 2
  LENGTH 10.2
  <SOURCE WAVE
    FILE "filename"
  >
>
```

and are parsed into javascript objects that look like this:

```javascript
new ReaperBase({
  token: 'ITEM',
  params: [],
  contents: [
    { token: 'POSITION', params: [2] },
    { token: 'LENGTH', params: [10.2] },
    new ReaperBase({
      token: 'SOURCE',
      params: ['WAVE'],
      contents: [
        { token: 'FILE', params: ['filename'] }
      ]
    })
  ]
});
```

`objects` are just structs with an additional contents array that can contain other structs or objects. They are also given the ReaperBase prototype, which supports three functions:

```javascript
getOrCreateStructByToken(token, index) // Gets the index'th struct with a specified token and returns the object. If the `index`'th struct was not found, then create a token and push it to the end of the contents array.
add(obj) // Adds an object to the contents array of the current object.
dump() // Dumps the current object into a string in the RPP format.
```

Some Reaper objects have special formatting in RPP files, so the `rppp.specialize()` function can be called on an object to change their prototype to one with special support for dumping objects of that type.

Some specialized objects also have helper methods for configuring their parameters.

Currently, the specialize function supports the following prototypes:
```javascript
ReaperProject //PROJECT 
ReaperTrack //TRACK
ReaperNotes //NOTES
ReaperMidiItem //ITEM (MIDI)
ReaperAudioItem //ITEM (AUDIO)
ReaperVst //VST
ReaperFXChain //FXCHAIN
ReaperVolumeAutomation //VOLENV2
ReaperPanAutomation //PANENV2
ReaperWidthAutomation //WIDTHENV2
ReaperTempoTimeSigAutomation //TEMPOENVEX
```

### Example:
```javascript
const rppp = require('rppp');
const base = rppp.parse(
`<ITEM
  POSITION 2
  LENGTH 10.2
  <SOURCE WAVE
    FILE "filename"
  >
>`);

const result = rppp.specialize(base);

const expect = new ReaperAudioItem({
  token: 'ITEM',
  params: [],
  contents: [
    { token: 'POSITION', params: [2] },
    { token: 'LENGTH', params: [10.2] },
    new ReaperBase({
      token: 'SOURCE',
      params: ['WAVE'],
      contents: [
        { token: 'FILE', params: ['filename'] }
      ]
    })
  ]
});
```

## Constructing
This package also allows one to construct an RPP file from scratch using the specified prototypes.

### Example: 
This returns a string in the form of an RPP file which can be loaded into Reaper. It contains a track with the name 'hello'.
```javascript
const rppp = require('rppp');

const project = new rppp.objects.ReaperProject();
project.addTrack(new rppp.objects.ReaperTrack()); // ReaperProject supports `addTrack`.
project.getOrCreateStructByToken('TRACK').add({
  token: 'NAME',
  params: [ 'hello' ],
});

console.log(project.dump());
```

# Development
Recommended VS Code Plugin: [PEG.js Language by Futago-za Ryuu](https://marketplace.visualstudio.com/items?itemName=futagozaryuu.pegjs-syntax)

The `npm test` script will compile the parser AND run the tests.
