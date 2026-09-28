import Behavior from '../Behavior'
import { describe, it, beforeEach, afterEach, vi } from 'vitest'
import { assert } from 'chai'
import d3Body from './helpers/d3Body'

function assertSelectableClickAttrsOn (behavior) {
  assert.isFunction(behavior.selectableMousedown)
  assert.isFunction(behavior.selectableClick)
  assert.isFunction(behavior.nodeMouseover)
  assert.isFunction(behavior.nodeMouseout)
}

function assertSelectableClickAttrsOff (behavior) {
  assert.strictEqual(behavior.selectableMousedown, null)
  assert.strictEqual(behavior.selectableClick, null)
  assert.strictEqual(behavior.nodeMouseover, null)
  assert.strictEqual(behavior.nodeMouseout, null)
}

function assertSelectableDragAttrsOn (behavior) {
  assert.notStrictEqual(behavior.selectableDrag, behavior.emptyBehavior)
  assert.notStrictEqual(behavior.bezierDrag, behavior.emptyBehavior)
}

function assertSelectableDragAttrsOff (behavior) {
  assert.strictEqual(behavior.selectableDrag, behavior.emptyBehavior)
  assert.strictEqual(behavior.bezierDrag, behavior.emptyBehavior)
}

function assertLabelDragAttrsOn (behavior) {
  assert.notStrictEqual(behavior.reactionLabelDrag, behavior.emptyBehavior)
  assert.notStrictEqual(behavior.nodeLabelDrag, behavior.emptyBehavior)
}

function assertLabelDragAttrsOff (behavior) {
  assert.strictEqual(behavior.reactionLabelDrag, behavior.emptyBehavior)
  assert.strictEqual(behavior.nodeLabelDrag, behavior.emptyBehavior)
}

function assertLabelMouseoverAttrsOn (behavior) {
  assert.isNotNull(behavior.nodeLabelMouseover)
  assert.isNotNull(behavior.nodeLabelTouch)
  assert.isNotNull(behavior.nodeLabelMouseout)
  assert.isNotNull(behavior.reactionLabelMouseover)
  assert.isNotNull(behavior.reactionLabelTouch)
  assert.isNotNull(behavior.reactionLabelMouseout)
  assert.isNotNull(behavior.geneLabelMouseover)
  assert.isNotNull(behavior.geneLabelTouch)
  assert.isNotNull(behavior.geneLabelMouseout)
}

function assertLabelMouseoverAttrsOff (behavior) {
  assert.isNull(behavior.nodeLabelMouseover)
  assert.isNull(behavior.nodeLabelTouch)
  assert.isNull(behavior.nodeLabelMouseout)
  assert.isNull(behavior.reactionLabelMouseover)
  assert.isNull(behavior.reactionLabelTouch)
  assert.isNull(behavior.reactionLabelMouseout)
  assert.isNull(behavior.geneLabelMouseover)
  assert.isNull(behavior.geneLabelTouch)
  assert.isNull(behavior.geneLabelMouseout)
}

function assertObjectMouseoverAttrsOn (behavior) {
  assert.isNotNull(behavior.nodeObjectMouseover)
  assert.isNotNull(behavior.nodeObjectMouseout)
  assert.isNotNull(behavior.reactionObjectMouseover)
  assert.isNotNull(behavior.reactionObjectMouseout)
}

function assertObjectMouseoverAttrsOff (behavior) {
  assert.isNull(behavior.nodeObjectMouseover)
  assert.isNull(behavior.nodeObjectMouseout)
  assert.isNull(behavior.reactionObjectMouseover)
  assert.isNull(behavior.reactionObjectMouseout)
}

describe('Behavior', () => {
  const map = { sel: d3Body }
  let behavior

  beforeEach(() => { behavior = new Behavior(map, null) })

  it('loads the map', () => {
    assert.strictEqual(behavior.map, map)
  })

  it('toggleSelectableClick', () => {
    behavior.toggleSelectableClick(true)
    assertSelectableClickAttrsOn(behavior)
    behavior.toggleSelectableClick(false)
    assertSelectableClickAttrsOff(behavior)
  })

  it('toggleSelectableDrag', () => {
    behavior.toggleSelectableDrag(true)
    assertSelectableDragAttrsOn(behavior)
    behavior.toggleSelectableDrag(false)
    assertSelectableDragAttrsOff(behavior)
  })

  it('toggleLabelDrag', () => {
    behavior.toggleLabelDrag(true)
    assertLabelDragAttrsOn(behavior)
    behavior.toggleLabelDrag(false)
    assertLabelDragAttrsOff(behavior)
  })

  it('toggleLabelMouseover', () => {
    behavior.toggleLabelMouseover(true)
    assertLabelMouseoverAttrsOn(behavior)
    behavior.toggleLabelMouseover(false)
    assertLabelMouseoverAttrsOff(behavior)
  })

  it('toggleObjectMouseover', () => {
    behavior.toggleObjectMouseover(true)
    assertObjectMouseoverAttrsOn(behavior)
    behavior.toggleObjectMouseover(false)
    assertObjectMouseoverAttrsOff(behavior)
  })

  describe('getSelectableDrag', () => {
    let svg

    beforeEach(() => {
      // the start handler schedules a move-to-back with setTimeout
      vi.useFakeTimers()
      svg = d3Body.append('svg')
      const nodes = [
        { node_id: '1', bigg_id: 'atp_c' },
        { node_id: '2', bigg_id: 'atp_c' },
        { node_id: '3', bigg_id: 'adp_c' }
      ]
      svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .append('circle')
        .attr('class', 'node-circle metabolite-circle')
    })

    afterEach(() => {
      vi.useRealTimers()
      svg.remove()
    })

    it('marks a matching metabolite for combining when dragged over it', () => {
      const drag = behavior.getSelectableDrag({ sel: svg }, null)
      const circles = svg.selectAll('.metabolite-circle').nodes()
      const startEvent = { x: 0, y: 0, sourceEvent: { stopPropagation: () => {} } }
      drag.on('start').call(circles[0], startEvent)

      const mouseover = el => el.dispatchEvent(new window.MouseEvent('mouseover'))
      mouseover(circles[1])
      mouseover(circles[2])
      assert.isTrue(circles[1].classList.contains('node-to-combine'))
      assert.isFalse(circles[2].classList.contains('node-to-combine'))
    })

    it('can undo a plain node drag', () => {
      const node = { x: 100, y: 200, label_x: 110, label_y: 210, connected_segments: [] }
      let undo = null
      const map = {
        sel: svg,
        nodes: { 1: node },
        reactions: {},
        beziers: {},
        select_selectable: () => {},
        get_selected_node_ids: () => [],
        get_selected_text_label_ids: () => [],
        draw_these_nodes: () => {},
        draw_these_reactions: () => {},
        draw_these_text_labels: () => {}
      }
      const undoStack = { push: (undoFn, redoFn) => { undo = undoFn } }
      const drag = behavior.getSelectableDrag(map, undoStack)
      const circle = svg.select('.metabolite-circle').node()
      const sourceEvent = { stopPropagation: () => {} }

      drag.on('start').call(circle, { x: 0, y: 0, sourceEvent })
      drag.on('drag').call(circle, { x: 10, y: 5, sourceEvent }, circle.__data__)
      drag.on('end').call(circle, { sourceEvent })
      assert.deepEqual([node.x, node.y], [110, 205])

      undo()
      assert.deepEqual([node.x, node.y], [100, 200])
    })
  })
})
