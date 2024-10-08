import { describe, it} from "vitest";
import { assert } from 'chai'
import DataMenu from "../DataMenu";
import d3Body from './helpers/d3Body'

describe('DataMenu', () => {
  it('initializes',() => {
    const sel = d3Body.append('div')
    const data_menu = new DataMenu({ selection: sel })
    assert.ok(data_menu)
    assert.strictEqual(sel.selectAll('select').size(), 1)
  })
})
