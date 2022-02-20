# RPP Parser

Package for parsing and programmatically constructing files for the [Reaper](https://reaper.fm) Digital Audio Workstation.

```
$ npm install rppp
```

## Parsing

This library parses Reaper Files structured JavaScript objects.

This divides the contents of a Reaper file two `structs` and `ReaperBase` instances.

### `struct` instances

A `.RPP` file contains, `structs` that look like this:

```
POSITION 2 1 4
```

When `rppp.parse(rppFileString)` encounters a struct while parsing a stringified `.RPP` file, it will convert it to a JavaScript Objects with a `.token`, (`"POSITION"`), and a list of `.params`, (`[2, 1, 4]`).

```javascript
{ token: 'POSITION', params: [2, 1, 4] }
```

### `ReaperBase` instances

`.RPP` files also have more complex data type that contain an ordered collection of content. In the `.RPP` file, these look like this:

```
<ITEM
  POSITION 2
  LENGTH 10.2
  <SOURCE WAVE
    FILE "filename"
  >
>
```

When `rppp.parse` encounters this data type it is parsed into `ReaperBase` class instances shown in example below. Note that that the `.contents` array main contains both `structs` and additional `ReaperBase` isntances:

```javascript
new ReaperBase({
  token: "ITEM",
  params: [],
  contents: [
    { token: "POSITION", params: [2] },
    { token: "LENGTH", params: [10.2] },
    new ReaperBase({
      token: "SOURCE",
      params: ["WAVE"],
      contents: [{ token: "FILE", params: ["filename"] }],
    }),
  ],
});
```

`ReaperBase` instances have the following helper methods:

```javascript
getOrCreateStructByToken(token, index); // Gets the index'th struct with a specified token and returns the object. If the `index`'th struct was not found, then create a token and push it to the end of the contents array.
add(obj); // Adds an object to the contents array of the current object.
dump(); // Dumps the current object into a string in the RPP format.
```

There are some additional helper methods for manipulating the speciffic Reaper object instances. The `rppp.specialize()` function recursively iterates over all contents of a `ReaperBase` instances, and returns a new JavaScript instances with additional helper methods for manipulating certain types of `RPP` data.

Currently, the specialize function supports the following prototypes:

```javascript
ReaperProject; //PROJECT
ReaperTrack; //TRACK
ReaperNotes; //NOTES
ReaperMidiItem; //ITEM (MIDI)
ReaperAudioItem; //ITEM (AUDIO)
ReaperVst; //VST
ReaperFXChain; //FXCHAIN
ReaperVolumeAutomation; //VOLENV2
ReaperPanAutomation; //PANENV2
ReaperWidthAutomation; //WIDTHENV2
ReaperTempoTimeSigAutomation; //TEMPOENVEX
```

### Example:

```javascript
const rppp = require("rppp");
const base = rppp.parse(
  `<ITEM
  POSITION 2
  LENGTH 10.2
  <SOURCE WAVE
    FILE "filename"
  >
>`
);

const result = rppp.specialize(base);

const expect = new ReaperAudioItem({
  token: "ITEM",
  params: [],
  contents: [
    { token: "POSITION", params: [2] },
    { token: "LENGTH", params: [10.2] },
    new ReaperBase({
      token: "SOURCE",
      params: ["WAVE"],
      contents: [{ token: "FILE", params: ["filename"] }],
    }),
  ],
});
```

## Constructing

This package also allows one to construct an RPP file from scratch using the specified prototypes.

### Example:

This returns a string in the form of an RPP file which can be loaded into Reaper. It contains a track with the name 'hello'.

```javascript
const rppp = require("rppp");

const project = new rppp.objects.ReaperProject();
project.addTrack(new rppp.objects.ReaperTrack()); // ReaperProject supports `addTrack`.
project.getOrCreateStructByToken("TRACK").add({
  token: "NAME",
  params: ["hello"],
});

console.log(project.dump());
```

# Development

Recommended VS Code Plugin: [PEG.js Language by Futago-za Ryuu](https://marketplace.visualstudio.com/items?itemName=futagozaryuu.pegjs-syntax)

```
npm run gen # generate the parser and typescript definitions
npm run test
```
