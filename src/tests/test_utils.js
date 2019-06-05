import * as utils from '../utils'
import * as dataStyles from '../dataStyles'
import d3Body from './helpers/d3Body'

import { describe, it } from 'mocha'
import { assert } from 'chai'

describe('utils.setOptions', () => {
  it('defaults to null', () => {
    const options = utils.setOptions({ a: undefined,
                                       b: null }, {})
    for (let x in options) {
      assert.strictEqual(options[x], null)
    }
  })

  it('can require floats and does not overwrite', () => {
    const options = utils.setOptions({ a: '5px', b: 'asdfwe' },
                                     { a: 6, b: 7 },
                                     { a: true, b: true })

    assert.strictEqual(options.a, 5)
    assert.strictEqual(options.b, 7)
  })
})

// TODO waiting on result of
// http://stackoverflow.com/questions/41812098/using-d3-request-from-node
// describe('utils.loadTheFile', () => {
//   before(() => {
//     test_server.listen(8000)
//   })

//   after(() => {
//     test_server.close()
//   })

//   it('loads json', done => {
//     utils.loadTheFile(
//       { my: 'this' },
//       'http://localhost:8000/test_file.json',
//       function (e, d) {
//         assert.deepEqual(this, { my: 'this' })
//         assert.isNull(e)
//         assert.deepEqual(d, { test: 'data' })
//         done()
//       }
//     )
//   })

//   it('loads css', done => {
//     utils.loadTheFile({my: 'this'}, 'js/src/tests/data/test_file.css', function(e, d) {
//       assert.deepEqual(this, {my: 'this'})
//       assert.isNull(e)
//       assert.strictEqual(d, 'test\ndata\n')
//       done()
//     })
//   })

//   it('takes value', done => {
//     utils.loadTheFile({my: 'this'}, null, function(e, d) {
//       assert.deepEqual(this, {my: 'this'})
//       assert.isNull(e)
//       assert.strictEqual(d, 'value')
//       done()
//     }, 'value')
//   })

//   it('no filename', done => {
//     utils.loadTheFile({my: 'this'}, null, function(e, d) {
//       assert.deepEqual(this, {my: 'this'})
//       assert.strictEqual(e, 'No filename')
//       assert.isNull(d)
//       done()
//     })
//   })

//   it('unrecognized file type', done => {
//     utils.loadTheFile({my: 'this'}, 'js/src/tests/data/bad_path', function(e, d, f) {
//       assert.deepEqual(this, {my: 'this'})
//       assert.strictEqual(e, 'Unrecognized file type')
//       assert.isNull(d)
//       done()
//     })
//   })
// })

// describe('utils.loadFiles', () => {
//   it('loads multiple files', done => {
//     let first = false
//     let second = false
//     const files = [
//       {
//         file: 'js/src/tests/data/test_file.json',
//         callback: function(e, d, f) { first = d; }
//       },
//       {
//         file: 'js/src/tests/data/test_file.css',
//         callback: function(e, d, f) { second = d; }
//       },
//     ]
//     utils.loadFiles({my: 'this'}, files, function() {
//       assert.deepEqual(this, {my: 'this'})
//       assert.deepEqual(first, {'test': 'data'})
//       assert.strictEqual(second, 'test\ndata\n')
//       done()
//     })
//   })

//   it('callback if empty', done => {
//     utils.loadFiles(null, [], () => {
//       done()
//     })
//   })

//   it('loads same file twice', done => {
//     let first = false
//     let second = false
//     const files = [
//       {
//         file: 'test_file.json',
//         callback: () => { first = true; }
//       },
//       {
//         file: 'test_file.json',
//         callback: () => { second = true; }
//       },
//     ]
//     utils.loadFiles(null, files, () => {
//       assert.isTrue(first)
//       assert.isTrue(second)
//       done()
//     })
//   })
// })

describe('utils.makeClass', () => {
  it('works with our without "new"', () => {
    const MyClass = utils.makeClass()
    const obj1 = new MyClass()
    const obj2 = MyClass()

    assert.isTrue(obj1 instanceof MyClass)
    assert.isTrue(obj2 instanceof MyClass)
    assert.strictEqual(obj1.constructor, MyClass)
    assert.strictEqual(obj2.constructor, MyClass)
  })
})

describe('utils.classWithOptionalNew', () => {
  it('takes existing class and makes "new" optional', () => {
    class C {
      constructor (a) {
        this.a = a
      }
    }
    const MyClass = utils.classWithOptionalNew(C)
    const obj1 = new MyClass('b')
    const obj2 = MyClass('b')
    const obj3 = new MyClass // eslint-disable-line new-parens
    assert.isTrue(obj1 instanceof MyClass)
    assert.isTrue(obj2 instanceof MyClass)
    assert.isTrue(obj3 instanceof MyClass)
    assert.strictEqual(obj1.a, 'b')
    assert.strictEqual(obj2.a, 'b')
  })
})

it('utils.compareArrays', () => {
  assert.strictEqual(utils.compareArrays([1, 2], [1, 2]), true)
  assert.strictEqual(utils.compareArrays([1, 2], [3, 2]), false)
})

describe('utils.arrayToObject', () => {
  it('converts array of objects to object of arrays', () => {
    // single
    const a = [{a: 1, b: 2}]
    const out = utils.arrayToObject(a)
    assert.deepEqual(out, { a: [1], b: [2] })
  })
  it('adds null for missing values', () => {
    // multiple
    const a = [{a: 1, b: 2}, {b: 3, c: 4}]
    const out = utils.arrayToObject(a)
    assert.deepEqual(out, {
      a: [1, null],
      b: [2, 3],
      c: [null, 4]
    })
  })
})

describe('utils.clone', () => {
  it('deep copies objects', () => {
    const first = { a: 140, b: [ 'c', 'd' ] }
    const second = utils.clone(first)
    first.a += 1
    assert.strictEqual(second.a, 140)
    assert.notStrictEqual(first.b, second.b)
  })
})

describe('utils.extend', () => {
  it('adds attributes of second object to first', () => {
    // extend
    const one = {a: 1, b: 2}
    const two = {c: 3}
    utils.extend(one, two)
    assert.deepEqual(one, {a: 1, b: 2, c: 3})
  })
  it('does not overwrite by default', () => {
    const one = {'a': 1, 'b': 2}
    const two = {'b': 3}
    assert.throws(utils.extend.bind(null, one, two))
  })
  it('overwrites with optional argument', () => {
    const one = {'a': 1, 'b': 2}
    const two = {'b': 3}
    utils.extend(one, two, true)
    assert.deepEqual(one, {'a': 1, 'b': 3})
  })
})

describe('utils.loadJsonOrCsv', () => {
  it('loads JSON', done => {
    utils.loadJsonOrCsv(
      null,
      dataStyles.csv_converter,
      (error, value) => {
        if (error) console.warn(error)
        assert.deepEqual(value, {'GAPD': 100})
        done()
      },
      null,
      null,
      {target: {result: '{"GAPD":100}'}})
  })
  it('loads CSV', done => {
    utils.loadJsonOrCsv(
      null,
      dataStyles.csv_converter,
      (error, value) => {
        if (error) console.warn(error)
        assert.deepEqual(value, [{'GAPD': '100'}])
        done()
      },
      null,
      null,
      {target: {result: 'reaction,value\nGAPD,100\n'}})
  })
})

describe('utils.angleNorm', () => {
  const vals = [ 6.5, 6, 3.3, 0.2, -3.3, -6.0, -6.5 ]
  vals.forEach(val => {
    it(`forces domain to -pi to pi: ${val}`, () => {
      const res = utils.angleNorm(val)
      assert.isTrue(res < Math.PI)
      assert.isTrue(res > -Math.PI)
    })
  })
})

describe('utils.toDegrees', () => {
  it('returns degrees', () => {
    assert.strictEqual(utils.toDegrees(Math.PI / 2), 90)
    assert.strictEqual(utils.toDegrees(Math.PI), 180)
    assert.strictEqual(utils.toDegrees(-Math.PI), -180)
  })
})

describe('utils.toRadiansNorm', () => {
  it('returns radians between -PI and PI', () => {
    assert.strictEqual(utils.toRadiansNorm(90), Math.PI / 2)
    assert.strictEqual(utils.toRadiansNorm(-90), -Math.PI / 2)
    assert.strictEqual(utils.toRadiansNorm(-270), Math.PI / 2)
    assert.strictEqual(utils.toRadiansNorm(270), -Math.PI / 2)
  })
})

describe('utils.compartmentalize', () => {
  it('adds compartment', () => {
    assert.deepEqual(utils.compartmentalize('atp', 'c1'), 'atp_c1')
  })
})

describe('utils.decompartmentalize', () => {
  it('gets compartment', () => {
    assert.deepEqual(utils.decompartmentalize('atp_c1'), [ 'atp', 'c1' ])
  })

  it('returns null compartment if not found', () => {
    assert.deepEqual(utils.decompartmentalize('atp'), [ 'atp', null ])
  })
})

it('utils.mean', () => {
  assert.strictEqual(utils.mean([1, 2, 3]), 2)
})

it('utils.median', () => {
  assert.strictEqual(utils.median([1, 8, 3, 1, 10]), 3)
  assert.strictEqual(utils.median([1, 8, 3, 1, 10, 11]), 5.5)
  assert.strictEqual(utils.median([ 6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49]), 40)
})

it('utils.quartiles', () => {
  assert.deepEqual(utils.quartiles([10]), [10, 10, 10])
  assert.deepEqual(utils.quartiles([5, 10]), [5, 7.5, 10])
  assert.deepEqual(utils.quartiles([1, 8, 3, 1, 10]), [1, 3, 9])
  assert.deepEqual(utils.quartiles([ 6, 7, 15, 36, 39, 40, 41, 42, 43, 47, 49]),
                   [15, 40, 43])
})

it('utils.randomCharacters', () => {
  for (let i = 5; i < 10; i++) {
    assert.strictEqual(utils.randomCharacters(i).length, i)
  }
})

it('utils.checkForParentTag', () => {
  const sel = d3Body.append('div')
  assert.strictEqual(utils.checkForParentTag(sel, 'body'), true)
  assert.strictEqual(utils.checkForParentTag(sel.node(), 'body'), true)
  assert.strictEqual(utils.checkForParentTag(sel, 'BODY'), true)
  assert.strictEqual(utils.checkForParentTag(sel, 'svg'), false)
})

describe('utils.d3TransformCatch', () => {
  it('gets translate', () => {
    assert.deepEqual(utils.d3TransformCatch('translate  ( 20, 30  )'),
                     { translate: [ 20, 30 ], rotate: 0, scale: 0 })
  })

  it('gets translate, rotate, scale', () => {
    assert.deepEqual(
      utils.d3TransformCatch('translate  ( 0, -30.2  )rotate(5.1 ) scale(-3)'),
      { translate: [ 0, -30.2 ], rotate: 5.1, scale: -3.0 }
    )
  })
})

// describe('utils.check_browser', () => {
//   it('looks for browser name', () => {
//     global.navigator = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) ' +
//                          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
//                          appName: 'Netscape',
//                          appVersion: '5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 ' +
//                          '(KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36' }
//     assert.isTrue(utils.check_browser('chrome'))
//     assert.isFalse(utils.check_browser('safari'))
//   })

//   it('returns false if no navigator.userAgent', () => {
//     global.navigator = null
//     assert.isFalse(utils.check_browser('safari'))
//   })
// })
