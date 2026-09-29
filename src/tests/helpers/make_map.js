import Map from '../../Map'
import Settings from '../../Settings'
import d3Body from './d3Body'
import get_map from './get_map'

/**
 * Build a Map in a fresh svg, with the settings streams that Map requires.
 * The map's group is given the 'canvas-group' class, as Builder does.
 */
export default function makeMap () {
  const svg = d3Body.append('svg')
  const sel = svg.append('g').attr('class', 'canvas-group')
  const requiredOptions = {
    reaction_scale: [],
    reaction_scale_preset: null,
    metabolite_scale: [],
    metabolite_scale_preset: null,
    reaction_styles: [],
    reaction_compare_style: 'diff',
    metabolite_styles: [],
    metabolite_compare_style: 'diff',
    cofactors: []
  }
  const requiredConditionalOptions = ['reaction_scale', 'metabolite_scale']
  const map = Map.from_data(get_map(), svg, null, sel, null,
                            new Settings(requiredOptions, requiredConditionalOptions),
                            null, true)
  return { svg, sel, map }
}
