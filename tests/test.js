const mocha = require('mocha');
const should = require('should');
const parser = require('../src/parser-debug');

describe('parser', function() {

  describe('object rule', function() {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, {startRule: 'object'});

    // TODO: Check if reaper ever puts objects one line
    it('should parse a one line object', function() {
      parse('<TEST 1\n>').should.deepEqual({
        type: 'TEST',
        lines: [{ token: 'TEST', params: [1] }],
      });
    });

    it('should parse a multiline object with two structs', function() {
      parse(`<NAME "GUITAR"\n  VOLUME 11\n>`).should.deepEqual({
        type: 'NAME',
        lines: [
          {token: 'NAME',   params: ['GUITAR']},
          {token: 'VOLUME', params: [11]},
        ],
      });
    });
  }); // Describe object Rule

  describe('int rule', function() {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, {startRule: 'int'});

    it('should parse 0', function() { parse('0').should.deepEqual(0); });
    it('should parse 100', function() { parse('100').should.deepEqual(100); });
    it('should parse negative integers', function() { parse('-10').should.deepEqual(-10); });
  }) // Describe int rule

  describe('params rule', function() {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, {startRule: 'params'});

    const t01 = ' 0 1';
    it(`should parse "${t01}" as two ints`, function() {
      parse(t01).should.deepEqual([0, 1]);
    });

    const t02 = ' 5 10';
    it(`should parse "${t02}" as two ints`, function() {
      parse(t02).should.deepEqual([5, 10]);
    });

    const t03 = ' "ok" 1 2 3';
    it(`should parse "${t03}" as a string and three ints`, function() {
      parse(t03).should.deepEqual(['ok', 1, 2, 3]);
    });
  }); // describe params

  describe('string rule', function() {
    // To use a custom 'startRule', you must add it to the gen-debug npm script
    const parse = input => parser.parse(input, {startRule: 'string'});

    it('should parse double quoted strings', function() {
      parse('"Okay this is a string"').should.equal('Okay this is a string')
    });

    it('should uandle unquoted strings (strings that do not start w/ a space, quote, or backtick)', () => {
      parse('aString').should.equal('aString');
      parse('hel"lo').should.equal('hel"lo');
      parse('hello"').should.equal('hello"');
    });

    it('should handle non-alphanumeric characters', function() {
      parse('"! ok"').should.equal('! ok');
      parse('"ok !"').should.equal('ok !');
      parse('!@#$%^&*()_+').should.equal('!@#$%^&*()_+');
    });

    it('should handle strings beginning with quotes', function() {
      parse(`"''"`).should.equal(`''`);
      parse(`'"'`).should.equal(`"`);
      parse('"```"').should.equal('```');
      parse('`"`').should.equal('"');
    });

  }); // describe string rule
}); // describe parse
