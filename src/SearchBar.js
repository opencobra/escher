/** SearchBar */

/** @jsx h */
import {h, Component} from 'preact'
import './SearchBar.css'

import _ from 'underscore'

class SearchBar extends Component {
  constructor (props) {
    super(props)
    this.state = {
      visible: props.visible,
      current: 0,
      searchItem: null,
      counter: '',
      clearEscape: this.props.map.key_manager.add_escape_listener(
        () => this.close(), true
      ),
      clearNext: this.props.map.key_manager.add_key_listener(
        ['enter', 'ctrl+g'], () => this.next(), false),
      clearPrevious: this.props.map.key_manager.add_key_listener(
        ['shift+enter', 'shift+ctrl+g'], () => this.previous(), false)
    }
  }

  componentWillReceiveProps (nextProps) {
    this.setState({
      ...nextProps,
      current: 0,
      results: null,
      searchItem: null,
      counter: '',
      clearEscape: this.props.map.key_manager.add_escape_listener(
        () => this.close(), true
      ),
      clearNext: this.props.map.key_manager.add_key_listener(
        ['enter', 'ctrl+g'], () => this.next(), false),
      clearPrevious: this.props.map.key_manager.add_key_listener(
        ['shift+enter', 'shift+ctrl+g'], () => this.previous(), false)
    })
  }

  componentDidUpdate () {
    this.inputRef.focus()
  }

  /**
   * Updates map focus and search bar counter when new search term is entered.
   * @param {string} value - Search term
   */
  handleInput (value) {
    if (!this.state.visible) { return }
    const results = this.dropDuplicates(this.props.map.search_index.find(value))
    let counter = ''
    if (results === null || !value) {
      this.props.map.highlight(null)
    } else if (results.length === 0) {
      counter = '0 / 0'
      this.props.map.highlight(null)
    } else {
      // Catches case where new search term shortens results to less than current index
      if (this.state.current >= results.length) {
        this.setState({
          current: 0
        })
      }
      counter = `${this.state.current + 1}/${results.length}`
      const r = results[this.state.current]
      if (r.type === 'reaction') {
        this.props.map.zoom_to_reaction(r.reaction_id)
        this.props.map.highlight_reaction(r.reaction_id)
      } else if (r.type === 'metabolite') {
        this.props.map.zoom_to_node(r.node_id)
        this.props.map.highlight_node(r.node_id)
      } else if (r.type === 'text_label') {
        this.props.map.zoom_to_text_label(r.text_label_id)
        this.props.map.highlight_text_label(r.text_label_id)
      } else {
        throw new Error('Bad search index data type: ' + r.type)
      }
    }
    this.setState({
      searchItem: value,
      current: 0,
      counter,
      results
    })
  }

  dropDuplicates (results) {
    const compKeys = {
      metabolite: {
        type: 'm',
        key: 'node_id'
      },
      reaction: {
        type: 'r',
        key: 'reaction_id'
      },
      text_label: {
        type: 't',
        key: 'text_label_id'
      }
    }
    return _.uniq(results, item => {
      // make a string for fast comparison
      const {type, key} = compKeys[item.type]
      return `${type}${item[key]}`
    })
  }

  next () {
    if (!(this.state.results && this.state.results.length > 0)) { return }
    this.update((this.state.current + 1) % this.state.results.length)
  }

  previous () {
    if (!(this.state.results && this.state.results.length > 0)) { return }
    this.update((this.state.current + this.state.results.length - 1) %
      this.state.results.length
    )
  }

  /**
   * Updates the map focus and search bar counter for when buttons are clicked.
   * @param {number} current - index of current search result
   */
  update (current) {
    this.setState({
      current,
      counter: `${current + 1}/${this.state.results.length}`
    })
    var r = this.state.results[current]
    if (r.type === 'reaction') {
      this.props.map.zoom_to_reaction(r.reaction_id)
      this.props.map.highlight_reaction(r.reaction_id)
    } else if (r.type === 'metabolite') {
      this.props.map.zoom_to_node(r.node_id)
      this.props.map.highlight_node(r.node_id)
    } else if (r.type === 'text_label') {
      this.props.map.zoom_to_text_label(r.text_label_id)
      this.props.map.highlight_text_label(r.text_label_id)
    } else {
      throw new Error('Bad search index data type: ' + r.type)
    }
  }

  close () {
    this.props.map.highlight(null)
    this.setState({visible: false})
    this.state.clearNext()
    this.state.clearPrevious()
    this.state.clearEscape()
  }

  is_visible () {
    return this.state.visible
  }

  render () {
    return (
      <div
        className='searchContainer'
        style={this.state.visible ? {display: 'inline-flex'} : {display: 'none'}}>
        <div className='searchPanel'>
          <input
            className='searchField'
            value={this.state.searchItem}
            onInput={event => this.handleInput(event.target.value)}
            ref={input => { this.inputRef = input }}
          />
          <button className='searchBarButton left btn' onClick={() => this.previous()}>
            <i className='icon-left-open' />
          </button>
          <button className='searchBarButton right btn' onClick={() => this.next()}>
            <i className='icon-right-open' />
          </button>
          <div className='searchCounter'>
            {this.state.counter}
          </div>
        </div>
        <button
          className='searchBarButton btn'
          onClick={() => this.close()}
        >
          <i className='icon-cancel' style={{marginTop: '-2px', verticalAlign: 'middle'}} />
        </button>
      </div>
    )
  }
}

export default SearchBar
