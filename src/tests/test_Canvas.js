import Canvas from '../Canvas'
import { describe, it, beforeEach, afterEach } from 'vitest'
import { assert } from 'chai'
import d3Body from './helpers/d3Body'

describe('Canvas', () => {
  let svg

  beforeEach(() => { svg = d3Body.append('svg') })

  afterEach(() => { svg.remove() })

  it('lets pointer events pass through the background image', () => {
    const canvas = new Canvas(svg, { x: 0, y: 0, width: 100, height: 100 })

    assert.strictEqual(canvas.selection.select('#canvas-background').attr('pointer-events'), 'none')
  })
})
