import {describe, it, beforeEach} from "vitest";
import {assert} from 'chai'

import Draw from "../Draw";
import d3Body from "./helpers/d3Body";
import {select as d3_select} from 'd3-selection'

const draw = new Draw()

function get_all_attrs (selection, attr) {
  return selection.nodes().map(n => d3_select(n).attr(attr))
}

describe('Draw', function () {
  it('create_reaction', function () {
    const parent_sel = d3Body.append('div')

    // set up
    const d_sel = parent_sel
          .selectAll('.reaction')
          .data([{ reaction_id: '1234' }, { reaction_id: '5678' }])

    // run create_reaction
    const e_sel = draw.create_reaction.bind(draw)(d_sel.enter())

    // check length
    assert.strictEqual(e_sel.size(), 2)
    // check ids
    assert.sameMembers(get_all_attrs(e_sel, 'id'), [ 'r1234', 'r5678' ])
    // check classes
    assert.isTrue(get_all_attrs(e_sel, 'class').every(c => c === 'reaction'))
    // check label
    assert.strictEqual(e_sel.selectAll('.reaction-label').size(), 2)

    parent_sel.remove()
  })
})
