/** @jsx h */
import { h, Component } from 'preact'
import Dropdown from './Dropdown'
import MenuButton from './MenuButton'

/**
 * MenuBar implements generic Dropdown and MenuButton objects to create the
 * Builder menu bar. Currently re-renders every time an edit mode is chosen.
 * This can be changed once Builder is ported to Preact.
 */
class MenuBar extends Component {
  componentWillMount () {
    this.props.sel.selectAll('.escher-zoom-container')
        .on('touchend.menuBar', () => this.setState({ dropdownVisible: false }))
        .on('click.menuBar', () => this.setState({ dropdownVisible: false }))
  }

  componentWillUnmount () {
    this.props.sel.selectAll('.escher-zoom-container')
        .on('touchend.menuBar', null)
        .on('click.menuBar', null)
  }

  render () {
    const enableKeys = this.props.settings.get('enable_keys')
    const disabledButtons = this.props.settings.get('disabled_buttons')
    const beziersEnabled = this.props.map.beziers_enabled
    const fullScreenButtonEnabled = this.props.settings.get('full_screen_button')

    return (
      <ul className='menu-bar'>
        <Dropdown name='Map' dropdownVisible={this.props.dropdownVisible}>
          <MenuButton
            name={'Save map JSON' + (enableKeys ? ' (Ctrl+S)' : '')}
            onClick={() => this.props.saveMap()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Load map JSON' + (enableKeys ? ' (Ctrl+O)' : '')}
            onClick={file => this.props.loadMap(file)}
            assignKey={this.props.assignKeyLoadMap}
            type='load'
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Import Background' + (enableKeys ? ' (Ctrl+I)' : '')}
            fileInputProcessor={file => this.props.import_background(file)}
            accept="image/*"
            type='load'
            assignKey={this.props.assignKeyImportBackground}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Clear Background' + (enableKeys ? ' (Ctrl+Shift+I)' : '')}
            onClick={() => this.props.clear_background()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Export as SVG' + (enableKeys ? ' (Ctrl+Shift+S)' : '')}
            onClick={() => this.props.save_svg()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Export as PNG' + (enableKeys ? ' (Ctrl+Shift+P)' : '')}
            onClick={() => this.props.save_png()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Export as GIF' + (enableKeys ? ' (Ctrl+Shift+G)' : '')}
            onClick={() => this.props.save_gif()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name='Clear map'
            onClick={() => this.props.clear_map()}
            disabledButtons={disabledButtons}
          />
        </Dropdown>
        <Dropdown name='Model' dropdownVisible={this.props.dropdownVisible}>
          <MenuButton
            name={'Load COBRA model JSON' + (enableKeys ? ' (Ctrl+M)' : '')}
            onClick={file => this.props.loadModel(file)}
            assignKey={this.props.assignKeyLoadModel}
            type='load'
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name='Update names and gene reaction rules using model'
            onClick={() => this.props.updateRules()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name='Clear model'
            onClick={() => this.props.clearModel()}
            disabledButtons={disabledButtons}
          />
        </Dropdown>
        <Dropdown name='Data' dropdownVisible={this.props.dropdownVisible}>
          <MenuButton
            name='Load reaction data'
            onClick={d => this.props.setReactionData(d)}
            type='load'
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name='Clear reaction data'
            onClick={() => this.props.clearReactionData()}
            disabledButtons={disabledButtons}
          />
          <li name='divider' />
          <MenuButton
            name='Load gene data'
            onClick={d => this.props.setGeneData(d)}
            type='load'
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name='Clear gene data'
            onClick={() => this.props.clearGeneData()}
            disabledButtons={disabledButtons}
          />
          <li name='divider' />
          <MenuButton
            name='Load metabolite data'
            onClick={d => this.props.setMetaboliteData(d)}
            type='load'
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name='Clear metabolite data'
            onClick={() => this.props.clearMetaboliteData()}
            disabledButtons={disabledButtons}
          />
        </Dropdown>
        <Dropdown
          name='Edit'
          rightMenu='true'
          dropdownVisible={this.props.dropdownVisible}
          disabledEditing={!this.props.settings.get('enable_editing')}
        >
          <MenuButton
            name={'Pan mode' + (enableKeys ? ' (Z)' : '')}
            checkMark={this.props.mode === 'zoom'}
            onClick={() => this.props.setMode('zoom')}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Select mode' + (enableKeys ? ' (V)' : '')}
            checkMark={this.props.mode === 'brush'}
            onClick={() => this.props.setMode('brush')}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Add reaction mode' + (enableKeys ? ' (N)' : '')}
            checkMark={this.props.mode === 'build'}
            onClick={() => this.props.setMode('build')}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Rotate mode' + (enableKeys ? ' (R)' : '')}
            checkMark={this.props.mode === 'rotate'}
            onClick={() => this.props.setMode('rotate')}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Text mode' + (enableKeys ? ' (T)' : '')}
            checkMark={this.props.mode === 'text'}
            onClick={() => this.props.setMode('text')}
            disabledButtons={disabledButtons}
          />
          <li name='divider' />
          <MenuButton
            name={'Delete' + (enableKeys ? ' (Del)' : '')}
            onClick={() => this.props.deleteSelected()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Undo' + (enableKeys ? ' (Ctrl+Z)' : '')}
            onClick={() => this.props.undo()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Redo' + (enableKeys ? ' (Ctrl+Shift+Z)' : '')}
            onClick={() => this.props.redo()}
            disabledButtons={disabledButtons}
          />
          <li name='divider' />
          <MenuButton
            name={`Align vertical${enableKeys ? ' (Alt+L)' : ''}`}
            onClick={this.props.align_vertical}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={`Align horizontal${enableKeys ? ' (Shift+Alt+L)' : ''}`}
            onClick={this.props.align_horizontal}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Toggle primary/secondary' + (enableKeys ? ' (P)' : '')}
            onClick={() => this.props.togglePrimary()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Rotate reactant locations' + (enableKeys ? ' (C)' : '')}
            onClick={() => this.props.cyclePrimary()}
            disabledButtons={disabledButtons}
          />
          <li name='divider' />
          <MenuButton
            name={'Select all' + (enableKeys ? ' (Ctrl+A)' : '')}
            onClick={() => this.props.selectAll()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={'Select none' + (enableKeys ? ' (Ctrl+Shift+A)' : '')}
            onClick={() => this.props.selectNone()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name='Invert selection'
            onClick={() => this.props.invertSelection()}
            disabledButtons={disabledButtons}
          />
        </Dropdown>
        <Dropdown name='View' rightMenu='true' dropdownVisible={this.props.dropdownVisible}>
          <MenuButton
            name={`Zoom in${enableKeys ? ' (+)' : ''}`}
            onClick={() => this.props.zoom_in()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={`Zoom out${enableKeys ? ' (-)' : ''}`}
            onClick={() => this.props.zoom_out()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={`Zoom to nodes${enableKeys ? ' (0)' : ''}`}
            onClick={() => this.props.zoomExtentNodes()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={`Zoom to canvas${enableKeys ? ' (1)' : ''}`}
            onClick={() => this.props.zoomExtentCanvas()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={`Find${enableKeys ? ' (F)' : ''}`}
            onClick={() => this.props.search()}
            disabledButtons={disabledButtons}
          />
          <MenuButton
            name={`${beziersEnabled ? 'Hide' : 'Show'} control points${enableKeys ? ' (B)' : ''}`}
            onClick={() => this.props.toggleBeziers()}
            disabledButtons={disabledButtons}
          />
          <li name='divider' />
          {/* TODO use preact X to combine the following 2 blocks */}
          {fullScreenButtonEnabled &&
            <MenuButton
              name={'Full screen'}
              onClick={() => this.props.full_screen()}
              checkMark={this.props.isFullScreen}
              disabledButtons={disabledButtons}
            />
          }
          {fullScreenButtonEnabled &&
            <li name='divider' />
          }
          <MenuButton
            name={`Settings${enableKeys ? ' (,)' : ''}`}
            onClick={() => this.props.renderSettingsMenu()}
            disabledButtons={disabledButtons}
            type='settings'
          />
        </Dropdown>
        <div className="switch-container">
          <label className="switch tooltip">
            <input type="checkbox"
                   onClick={() => {
                     this.props.settings.set('show_reaction_data_animation', !this.props.settings.get('show_reaction_data_animation'))
                     this.props.settings.acceptChanges()
                   }}
                   checked={this.props.settings.get('show_reaction_data_animation')}
            />
            <span className="slider"></span>
            <span className="tooltiptext">Show flux visualization( animation NOT available in Safari).</span>
          </label>
        </div>
        <a className="helpButton" target="#" href='https://escher.readthedocs.org'>?</a>
      </ul>
    )
  }
}

export default MenuBar
