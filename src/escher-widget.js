/* global requestAnimationFrame */

import Builder from './Builder.jsx'
import { select as d3Select } from 'd3-selection'
import _ from 'underscore'

// These options can be set without explicitly redrawing the map. List is
// probably not complete.
const NO_DRAW_OPTIONS = [
  'menu',
  'scroll_behavior',
  'use_3d_transform',
  'enable_editing',
  'enable_keys',
  'full_screen_button',
  // these already redraw
  'reaction_data',
  'metabolite_data',
  'gene_data'
]

const WITH_API_FUNCTIONS = {
  reaction_data: 'set_reaction_data',
  metabolite_data: 'set_metabolite_data',
  gene_data: 'set_gene_data'
}

const parseJson = json => json ? JSON.parse(json) : null

/**
 * anywidget front end for the Escher Builder (see py/escher/plots.py).
 *
 * anywidget calls render({ model, el }) for each view of the widget, and calls
 * the returned function when the view is removed.
 */
function render ({ model, el }) {
  // everything to undo when the view is removed
  const listeners = []
  const unsubscribers = []
  const listen = (eventName, callback) => {
    model.on(eventName, callback)
    listeners.push([eventName, callback])
  }

  // Give the container an explicit height before the Builder measures it
  const sel = d3Select(el).append('div').style('width', '100%')
  const setHeight = () => {
    const height = `${model.get('height')}px`
    el.style.display = 'block'
    el.style.height = height
    sel.style('height', height)
  }
  setHeight()

  // Options set in Python. Unset (null) options use the JavaScript defaults.
  const optionNames = model.get('_option_names')
  const options = {}
  optionNames.forEach(key => {
    const val = model.get(key)
    if (val !== null && val !== undefined) options[key] = val
  })

  // Hover and click update selected_*; only clicks update selected_*_event.
  // The event_id continues from the current value so that it keeps
  // increasing across all views of the widget.
  const setSelection = (kind, biggId, isClick) => {
    if (!biggId) return
    model.set(`selected_${kind}`, biggId)
    if (isClick) {
      const lastEvent = model.get(`selected_${kind}_event`) || {}
      model.set(`selected_${kind}_event`, {
        bigg_id: biggId,
        event_id: (lastEvent.event_id || 0) + 1
      })
    }
    model.save_changes()
  }

  const reactionDatumForElement = element => {
    let node = element
    while (node) {
      if (node.__data__ && node.__data__.bigg_id) return node.__data__
      node = node.parentNode
    }
    return null
  }

  const wireReactionClicks = builder => {
    builder.map.sel.selectAll('.reaction-label,.segment')
      .on('click.escher_widget', function (event, d) {
        const reaction = (d && d.bigg_id) ? d : reactionDatumForElement(this)
        if (reaction) setSelection('reaction', reaction.bigg_id, true)
      })
  }

  const firstLoad = builder => {
    const map = builder.map

    // Zoom to fit once the browser has laid out the container. During
    // render() the container can still measure 0 x 0.
    requestAnimationFrame(() => map.zoom_extent_canvas())

    // Only listen to keyboard shortcuts while the mouse is over the map, so
    // typing elsewhere in the notebook is unaffected.
    map.key_manager.toggle(false)
    el.addEventListener('mouseenter', () => map.key_manager.toggle(true))
    el.addEventListener('mouseleave', () => map.key_manager.toggle(false))
    unsubscribers.push(() => map.key_manager.toggle(false))

    // reset map and model json in widget
    builder.callback_manager.set('clear_map.escher_widget', () => {
      model.set('_loaded_map_json', null)
      model.save_changes()
    })
    builder.callback_manager.set('clear_model.escher_widget', () => {
      model.set('_loaded_model_json', null)
      model.save_changes()
    })

    // selections
    map.callback_manager.set('select_selectable.escher_widget', (count, node) => {
      if (node && node.node_type === 'metabolite') {
        setSelection('metabolite', node.bigg_id, true)
      }
    })
    map.callback_manager.set('show_tooltip.escher_widget', (type, d) => {
      if ((type === 'reaction_object' || type === 'reaction_label') && d) {
        setSelection('reaction', d.bigg_id, false)
      }
    })
    wireReactionClicks(builder)
    const rewireClicks = () => wireReactionClicks(builder)
    map.draw.callback_manager.set('update_reaction.escher_widget', rewireClicks)
    map.draw.callback_manager.set('update_reaction_label.escher_widget', rewireClicks)

    // update functions
    listen('change:height', () => {
      setHeight()
      requestAnimationFrame(() => builder.map.zoom_extent_canvas())
    })
    listen('change:_loaded_map_json', () => {
      builder.load_map(parseJson(model.get('_loaded_map_json')))
    })
    listen('change:_loaded_model_json', () => {
      builder.load_model(parseJson(model.get('_loaded_model_json')))
    })

    // apply an option set in Python
    const applyOption = key => {
      const val = model.get(key)
      // stop if hasn't changed
      if (_.isEqual(val, builder.settings.get(key))) return
      if (key in WITH_API_FUNCTIONS) {
        builder[WITH_API_FUNCTIONS[key]](val)
      } else {
        builder.settings.set(key, val)
      }
      // default to drawing everything, unless it's a common option where
      // that's not necessary
      if (!NO_DRAW_OPTIONS.includes(key)) {
        builder.map.draw_everything()
      }
    }

    // sync options in both directions (changes made in JavaScript are synced
    // only after they have been accepted)
    optionNames.forEach(key => {
      const stream = builder.settings.acceptedStreams[key]
      if (!stream) return

      if (model.get(key) === null) {
        // report the JavaScript default for options that are unset in Python
        model.set(key, builder.settings.get(key))
        model.save_changes()
      } else {
        // catch up on changes made in Python while the map was loading
        applyOption(key)
      }

      listen(`change:${key}`, () => applyOption(key))

      unsubscribers.push(stream.onValue(val => {
        // avoid a loop with a deep comparison
        if (!_.isEqual(val, model.get(key))) {
          model.set(key, val)
          model.save_changes()
        }
      }))
    })
  }

  new Builder( // eslint-disable-line no-new
    parseJson(model.get('_loaded_map_json')),
    parseJson(model.get('_loaded_model_json')),
    model.get('embedded_css'),
    sel,
    { ...options, first_load_callback: firstLoad }
  )

  return () => {
    listeners.forEach(([eventName, callback]) => model.off(eventName, callback))
    unsubscribers.forEach(unsubscribe => unsubscribe())
  }
}

export default { render }
