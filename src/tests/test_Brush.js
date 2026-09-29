import { describe, it, beforeEach, afterEach } from 'vitest'
import { assert } from 'chai'
import 'intersection-observer'
import Brush from '../Brush'
import d3Body from './helpers/d3Body'
import makeMap from './helpers/make_map'

describe('Brush', () => {
  let svg, map

  beforeEach(() => {
    ({ svg, map } = makeMap())
  })

  afterEach(() => {
    d3Body.selectAll('*').remove()
  })

  it('inserts its container right after the canvas group', () => {
    const brush = new Brush(svg, false, map, '.canvas-group')
    const canvasGroup = svg.select('.canvas-group').node()
    assert.strictEqual(canvasGroup.nextSibling, brush.brushSel.node())
    assert.strictEqual(brush.brushSel.attr('id'), 'brush-container')
  })

  it('toggles the brush on and off', () => {
    const brush = new Brush(svg, false, map, '.canvas-group')
    assert.isTrue(brush.brushSel.select('.overlay').empty())

    brush.toggle(true)
    assert.isFalse(brush.brushSel.select('.overlay').empty())

    brush.toggle(false)
    assert.isTrue(brush.brushSel.selectAll('*').empty())
  })
})
