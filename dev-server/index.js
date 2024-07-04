// import map from '../docs/_static/example_data/S5_iJO1366.Glycolysis_PPP_AA_Nucleotides.json'
import map from '../docs/_static/example_data/RECON1_FIT_data.json'
// import model from '../docs/_static/example_data/iJO1366.json'
import model from '../docs/_static/example_data/PPPmodel.json'
// import reaction_data from '../docs/_static/example_data/all_csv_data.json'
import reaction_data from '../docs/_static/example_data/related_data.json'
import { Builder, libs } from '../src/main'

window.builder = new Builder( // eslint-disable-line no-new
  map,
  model,
  null,
  libs.d3_select('#root'),
  {
    fill_screen: true,
    never_ask_before_quit: true,
    scroll_behavior: 'zoom',
    reaction_data,
    show_reaction_data_animation: true
  }
)
