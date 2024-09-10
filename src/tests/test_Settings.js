import {describe, it} from "mocha";
import {assert} from 'chai'

const Settings = require('../Settings').default

describe('Settings', () => {
  it('initializes', () => {
    // new settings object
    const options = {
      selection: null,
      menu: 'all',
      scroll_behavior: 'pan',
      enable_editing: true,
      reaction_styles: [ 'color', 'size', 'text' ],
      reaction_scale: [
        { type: 'min', color: '#c8c8c8', size: 4 },
        { type: 'value', value: 0, color: '#9696ff', size: 8 },
        { type: 'max', color: '#4b009f', size: 12 }
      ]
    }
    const settings = new Settings(options, Object.keys(options))
    const name = 'reaction_styles'
    const val = [ 'new_style' ]
    let fired = null
    // set up the callback
    settings.streams[name].onValue(val => { fired = val })
    // push a new value
    settings.set(name, val)
    // make sure the callback fired
    assert.deepEqual(fired, val)
    // make sure the new value was set
    assert.deepEqual(settings.get('reaction_styles'), val)
  })
})
