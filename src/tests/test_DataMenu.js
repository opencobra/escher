import { describe, it} from "mocha";
import { assert } from 'chai'
var DataMenu = require('../DataMenu')
var d3Body = require('./helpers/d3Body')

describe('DataMenu', () => {
  it('initializes',() => {
    const sel = d3Body.append('div')
    const data_menu = new DataMenu({ selection: sel })
    assert.ok(data_menu)
    assert.strictEqual(sel.selectAll('select').size(), 1)
  })
})
