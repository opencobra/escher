import { describe, it, beforeEach, afterEach } from 'vitest'
import { assert } from 'chai'
import 'intersection-observer'
import BuildInput from '../BuildInput'
import ZoomContainer from '../ZoomContainer'
import d3Body from './helpers/d3Body'
import makeMap from './helpers/make_map'

describe('BuildInput', () => {
  let map, buildInput

  beforeEach(() => {
    ({ map } = makeMap())
    const container = d3Body.append('div')
    const zoomContainer = new ZoomContainer(container, 'none', false)
    buildInput = new BuildInput(container, map, zoomContainer, map.settings)
  })

  afterEach(() => {
    d3Body.selectAll('*').remove()
  })

  it('starts inactive and hidden', () => {
    assert.isFalse(buildInput.is_active)
    assert.isFalse(buildInput.is_visible())
  })

  it('stays hidden when turned on with nothing selected', () => {
    buildInput.toggle(true)
    assert.isTrue(buildInput.is_active)
    assert.isFalse(buildInput.is_visible())
    buildInput.toggle(false)
    assert.isFalse(buildInput.is_active)
  })

  it('flips on and off when toggled without an argument', () => {
    buildInput.toggle()
    assert.isTrue(buildInput.is_active)
    buildInput.toggle()
    assert.isFalse(buildInput.is_active)
  })
})
