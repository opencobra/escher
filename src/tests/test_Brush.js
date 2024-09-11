import { describe, it} from "mocha";
import { assert } from 'chai'
const d3Body = require('./helpers/d3Body')
const get_map = require('./helpers/get_map')
const Brush = require('../Brush')
const Map = require('../Map').default
const Settings = require('../Settings')

function getMap () {
  const svg = d3Body.append('svg')
  const sel = svg.append('g')
  // streams are required for these options
  const required_options = { reaction_scale: [],
                             metabolite_scale: [],
                             reaction_styles: [],
                             reaction_compare_style: 'diff',
                             metabolite_styles: [],
                             metabolite_compare_style: 'diff',
                             cofactors: [], }
  const required_conditional_options = [ 'reaction_scale',
                                         'metabolite_scale', ]
  const set_option = (key, val) => { required_options[key] = val }
  const get_option = (key) => required_options[key]

  return Map.from_data(get_map(), svg, null, sel, null,
                       new Settings(set_option, get_option,
                                    Object.keys(required_options),
                                    required_conditional_options),
                       null, true)
}

// waiting on fix for d3 + jsdom issue
// describe('Brush', () => {
//   it('d3 + jsdom issue', () => {
//     // throws syntax error
//     d3Body.select(d3Body.append('div').node())
//   })

//   it('initializes', () => {
//     const svg = d3Body.append('svg')
//     const g = svg.append('g')
//     svg.append('g')
//     const map = getMap()
//     const brush = Brush(svg, true, map, g)
//     brush.toggle(true)
//   })
// })
