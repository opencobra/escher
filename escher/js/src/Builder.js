define(['Utils', 'BuildInput', 'ZoomContainer', 'Map', 'CobraModel', 'Brush', 'CallbackManager', 'ui', 'SearchBar', 'Settings', 'SettingsBar', 'TextEditInput', 'QuickJump', 'data_styles'], function(utils, BuildInput, ZoomContainer, Map, CobraModel, Brush, CallbackManager, ui, SearchBar, Settings, SettingsBar, TextEditInput, QuickJump, data_styles) {
    /** A Builder object contains all the ui and logic to generate a map builder or viewer.

     Arguments
     ---------

     map_data: The data for a map, to be passed to escher.Map.from_data().

     model_data: The data for a cobra model, to be passed to
     escher.CobraModel().

     options: An object.

     identifiers_on_map: Either 'bigg_id' (default) or 'name'.

     unique_map_id: A unique ID that will be used to UI elements don't interfere
     when multiple maps are in the same HTML document.

     reaction_data: An object with reaction ids for keys and reaction data
     points for values.

     reaction_styles:

     reaction_compare_style: (Default: 'diff') How to compare to
     datasets. Can be either 'fold, 'log2_fold', or 'diff'.

     reaction_domain:

     reaction_color_range:

     reaction_size_range:

     reaction_no_data_color:

     reaction_no_data_size:

     gene_data: An object with Gene ids for keys and gene data points for
     values.

     and_method_in_gene_reaction_rule: (Default: mean) When evaluating a
     gene reaction rule, use this function to evaluate AND rules. Can be
     'mean' or 'min'.

     metabolite_data: An object with metabolite ids for keys and metabolite
     data points for values.

     metabolite_compare_style: (Default: 'diff') How to compare to
     datasets. Can be either 'fold', 'log2_fold' or 'diff'.

     highlight_missing_color: A color to apply to components that are not
     the in cobra model, or null to apply no color. Default: 'red'.

     local_host: The host used to load maps for quick_jump. E.g.,
     http://localhost:7778.

     quick_jump: A list of map names that can be reached by
     selecting them from a quick jump menu on the map.

     first_load_callback: A function to run after loading.

     */
    var Builder = utils.make_class();
    Builder.prototype = { init: init,
                          load_map: load_map,
                          load_model: load_model,
                          set_mode: set_mode,
                          view_mode: view_mode,
                          build_mode: build_mode,
                          brush_mode: brush_mode,
                          zoom_mode: zoom_mode,
                          rotate_mode: rotate_mode,
                          text_mode: text_mode,
                          set_reaction_data: set_reaction_data,
                          set_metabolite_data: set_metabolite_data,
                          set_gene_data: set_gene_data,
                          update_data: update_data,
                          _toggle_direction_buttons: _toggle_direction_buttons,
                          _setup_menu: _setup_menu,
                          _setup_simple_zoom_buttons: _setup_simple_zoom_buttons,
                          _setup_status: _setup_status,
                          _setup_quick_jump: _setup_quick_jump,
                          _setup_modes: _setup_modes,
                          _get_keys: _get_keys,
                          _setup_confirm_before_exit: _setup_confirm_before_exit };

    return Builder;

    // definitions
    function init(map_data, model_data, options) {

        this.map_data = map_data;
        this.model_data = model_data;

        // default sel
        var sel = null;
        if (!('selection' in options) || options['selection'] === null)
            sel = d3.select('body').append('div');

        // set defaults
        this.options = utils.set_options(options, {
            // location
            selection: sel,
            // view options
            menu: 'all',
            scroll_behavior: 'pan',
            enable_editing: true,
            enable_keys: true,
            enable_search: true,
            fill_screen: false,
            // map, model, and styles
            css: null,
            starting_reaction: null,
            never_ask_before_quit: false,
            identifiers_on_map: 'bigg_id',
            unique_map_id: null,
            // applied data
            // reaction
            auto_reaction_domain: true,
            reaction_data: null,
            reaction_styles: ['color', 'size', 'text'],
            reaction_compare_style: 'log2_fold',
            reaction_domain: [-10, 0, 10],
            reaction_color_range: ['rgb(200,200,200)', 'rgb(150,150,255)', 'purple'],
            reaction_size_range: [4, 8, 12],
            reaction_no_data_color: 'rgb(220,220,220)',
            reaction_no_data_size: 4,
            // gene
            gene_data: null,
            and_method_in_gene_reaction_rule: 'mean',
            // metabolite
            metabolite_data: null,
            metabolite_styles: ['color', 'size', 'text'],
            metabolite_compare_style: 'log2_fold',
            auto_metabolite_domain: true,
            metabolite_domain: [-10, 0, 10],
            metabolite_color_range: ['green', 'white', 'red'],
            metabolite_size_range: [6, 8, 10],
            metabolite_no_data_color: 'white',
            metabolite_no_data_size: 6,
            // color reactions not in the model
            highlight_missing_color: 'red',
            // quick jump menu
            local_host: null,
            quick_jump: null,
            // callback
            first_load_callback: null
        });

        // check the location
        if (utils.check_for_parent_tag(this.options.selection, 'svg')) {
            throw new Error('Builder cannot be placed within an svg node '+
                            'becuase UI elements are html-based.');
        }

        // Initialize the settings
        var set_option = function(option, new_value) {
            this.options[option] = new_value;
        }.bind(this),
            get_option = function(option) {
                return this.options[option];
            }.bind(this);
        this.settings = new Settings(set_option, get_option);

        // set up this callback manager
        this.callback_manager = CallbackManager();
        if (this.options.first_load_callback !== null)
            this.callback_manager.set('first_load', this.options.first_load_callback);

        // load the model, map, and update data in both
        this.load_model(this.model_data, false);
        this.load_map(this.map_data, false);
        this.update_data(true, true);

        // setting callbacks
        // TODO enable atomic updates. Right now, every time
        // the menu closes, everything is drawn.
        this.settings.status_bus
            .onValue(function(x) {
                if (x == 'accepted') {
                    this.update_data(true, true, ['reaction', 'metabolite'], false);
                    if (this.map !== null) {
                        this.map.draw_all_nodes();
                        this.map.draw_all_reactions();
                    }
                }
            }.bind(this));

        this.callback_manager.run('first_load', this);
    }

    // Definitions
    function load_model(model_data, should_update_data) {
        /** Load the cobra model from model data

         Arguments
         ---------

         model_data: The data for a cobra model, to be passed to
         escher.CobraModel().

         should_update_data: (Boolean, default true) Whether the data in the
         model should be updated.

         */

        if (should_update_data === undefined)
            should_update_data = true;

        // Check the cobra model
        if (model_data === null) {
            console.warn('No cobra model was loaded.');
            this.cobra_model = null;
        } else {
            this.cobra_model = CobraModel(model_data);

            // TODO this doesn't seem like the best solution
            if (this.map !== null && this.map !== undefined)
                this.map.cobra_model = this.cobra_model;

            if (should_update_data)
                this.update_data(true, false);
        }
    }

    function load_map(map_data, should_update_data) {
        /** Load a map for the loaded data. Also reloads most of the builder content.

         Arguments
         ---------

         map_data: The data for a map, to be passed to escher.Map.from_data().

         should_update_data: (Boolean, default true) Whether the data in the
         model should be updated.

         */

        if (should_update_data === undefined)
            should_update_data = true;

        // Begin with some definitions
        var selectable_click_enabled = true,
            shift_key_on = false;

        // remove the old builder
        utils.remove_child_nodes(this.options.selection);

        // set up the svg
        var svg = utils.setup_svg(this.options.selection, this.options.selection_is_svg,
                                  this.options.fill_screen);

        // se up the zoom container
        this.zoom_container = new ZoomContainer(svg, this.options.selection,
                                                this.options.scroll_behavior);
        var zoomed_sel = this.zoom_container.zoomed_sel;

        if (map_data!==null) {
            // import map
            this.map = Map.from_data(map_data,
                                     svg,
                                     this.options.css,
                                     zoomed_sel,
                                     this.zoom_container,
                                     this.settings,
                                     this.cobra_model,
                                     this.options.enable_search);
            this.zoom_container.reset();
        } else {
            // new map
            this.map = new Map(svg,
                               this.options.css,
                               zoomed_sel,
                               this.zoom_container,
                               this.settings,
                               this.cobra_model,
                               null,
                               this.options.enable_search);
        }

        // set the data for the map
        if (should_update_data)
            this.update_data(false, true);

        // set up the reaction input with complete.ly
        this.build_input = BuildInput(this.options.selection, this.map,
                                      this.zoom_container);

        // set up the text edit input
        this.text_edit_input = TextEditInput(this.options.selection, this.map,
                                             this.zoom_container);

        // set up the Brush
        this.brush = new Brush(zoomed_sel, false, this.map, '.canvas-group');

        // set up the modes
        this._setup_modes(this.map, this.brush, this.zoom_container);

        var s = this.options.selection
                .append('div').attr('class', 'search-menu-container')
                .append('div').attr('class', 'search-menu-container-inline'),
            menu_div = s.append('div'),
            search_bar_div = s.append('div'),
            button_div = this.options.selection.append('div');

        // set up the search bar
        this.search_bar = SearchBar(search_bar_div, this.map.search_index,
                                    this.map);
        // set up the hide callbacks
        this.search_bar.callback_manager.set('show', function() {
            this.settings_bar.toggle(false);
        }.bind(this));

        // set up the settings
        var settings_div = this.options.selection.append('div');
        this.settings_bar = SettingsBar(settings_div, this.settings,
                                        this.map);
        this.settings_bar.callback_manager.set('show', function() {
            this.search_bar.toggle(false);
        }.bind(this));

        // set up key manager
        var keys = this._get_keys(this.map, this.zoom_container,
                                  this.search_bar, this.settings_bar,
                                  this.options.enable_editing);
        this.map.key_manager.assigned_keys = keys;
        // tell the key manager about the reaction input and search bar
        this.map.key_manager.input_list = [this.build_input, this.search_bar,
                                           this.settings_bar, this.text_edit_input];
        // make sure the key manager remembers all those changes
        this.map.key_manager.update();
        // turn it on/off
        this.map.key_manager.toggle(this.options.enable_keys);

        // set up menu and status bars
        if (this.options.menu=='all') {
            this._setup_menu(menu_div, button_div, this.map, this.zoom_container, this.map.key_manager, keys,
                             this.options.enable_editing, this.options.enable_keys);
        } else if (this.options.menu=='zoom') {
            this._setup_simple_zoom_buttons(button_div, keys);
        }

        // setup selection box
        if (map_data!==null) {
            this.map.zoom_extent_canvas();
        } else {
            if (this.options.starting_reaction!==null && this.cobra_model !== null) {
                // Draw default reaction if no map is provided
                var size = this.zoom_container.get_size();
                var start_coords = { x: size.width / 2,
                                     y: size.height / 4 };
                this.map.new_reaction_from_scratch(this.options.starting_reaction, start_coords, 90);
                this.map.zoom_extent_nodes();
            } else {
                this.map.zoom_extent_canvas();
            }
        }

        // status in both modes
        var status = this._setup_status(this.options.selection, this.map);

        // set up quick jump
        if (this.options.quick_jump !== null) {
            this._setup_quick_jump(this.options.selection,
                                   this.options.quick_jump);
        }

        // start in zoom mode for builder, view mode for viewer
        if (this.options.enable_editing)
            this.zoom_mode();
        else
            this.view_mode();

        // confirm before leaving the page
        if (this.options.enable_editing && !this.options.never_ask_before_quit)
            this._setup_confirm_before_exit();

        // draw
        this.map.draw_everything();
    }

    function set_mode(mode) {
        this.search_bar.toggle(false);
        // input
        this.build_input.toggle(mode=='build');
        this.build_input.direction_arrow.toggle(mode=='build');
        if (this.options.menu=='all' && this.options.enable_editing)
            this._toggle_direction_buttons(mode=='build');
        // brush
        this.brush.toggle(mode=='brush');
        // zoom
        this.zoom_container.toggle_zoom(mode=='zoom' || mode=='view');
        // resize canvas
        this.map.canvas.toggle_resize(mode=='zoom' || mode=='brush');
        // behavior
        this.map.behavior.toggle_rotation_mode(mode=='rotate');
        this.map.behavior.toggle_selectable_click(mode=='build' || mode=='brush' || mode=='rotate');
        this.map.behavior.toggle_selectable_drag(mode=='brush' || mode=='rotate');
        this.map.behavior.toggle_label_drag(mode=='brush');
        this.map.behavior.toggle_label_click(mode=='brush');
        this.map.behavior.toggle_text_label_edit(mode=='text');
        this.map.behavior.toggle_bezier_drag(mode=='brush');
        // edit selections
        if (mode=='view' || mode=='text')
            this.map.select_none();
        if (mode=='rotate')
            this.map.deselect_text_labels();
        // console.log('starting draw');
        this.map.draw_everything();
        // console.log('finished draw');
    }
    function view_mode() {
        this.callback_manager.run('view_mode');
        this.set_mode('view');
    }
    function build_mode() {
        this.callback_manager.run('build_mode');
        this.set_mode('build');
    }
    function brush_mode() {
        this.callback_manager.run('brush_mode');
        this.set_mode('brush');
    }
    function zoom_mode() {
        this.callback_manager.run('zoom_mode');
        this.set_mode('zoom');
    }
    function rotate_mode() {
        this.callback_manager.run('rotate_mode');
        this.set_mode('rotate');
    }
    function text_mode() {
        this.callback_manager.run('text_mode');
        this.set_mode('text');
    }

    function set_reaction_data(data) {
        this.options.reaction_data = data;
        this.update_data(true, true, 'reaction');
    }
    function set_gene_data(data) {
        this.options.gene_data = data;
        this.update_data(true, true, 'reaction');
    }
    function set_metabolite_data(data) {
        this.options.metabolite_data = data;
        this.update_data(true, true, 'metabolite');
    }

    function update_data(update_model, update_map, kind, should_draw) {
        /** Set data and settings for the model.

         Arguments
         ---------

         update_model: (Boolean) Update data for the model.

         update_map: (Boolean) Update data for the map.

         kind: (Optional, Default: all) An array defining which data is being
         updated that can include any of: ['reaction', 'metabolite'].

         should_draw: (Optional, Default: true) Whether to redraw the update
         sections of the map.

         */

        // defaults
        if (kind === undefined)
            kind = ['reaction', 'metabolite'];
        if (should_draw === undefined)
            should_draw = true;

        // metabolite data
        var update_metabolite_data = (kind.indexOf('metabolite') != -1);
        if (update_metabolite_data) {
            var data_object = data_styles.import_and_check(this.options.metabolite_data,
                                                           'metabolite_data');
            if (update_model && this.cobra_model !== null) {
                this.cobra_model.apply_metabolite_data(data_object,
                                                       this.options.metabolite_styles,
                                                       this.options.metabolite_compare_style);
            }
            if (update_map && this.map !== null) {
                this.map.apply_metabolite_data_to_map(data_object);
                if (should_draw)
                    this.map.draw_all_nodes();
            }
        }

        // reaction data overrides gene data
        var update_reaction_data = (kind.indexOf('reaction') != -1);

        // reaction data
        if (update_reaction_data) {
            if (this.options.reaction_data !== null) {
                data_object = data_styles.import_and_check(this.options.reaction_data,
                                                           'reaction_data');

                // only update the model if there is not going to be gene data
                if (update_model && this.cobra_model !== null) {
                    this.cobra_model.apply_reaction_data(data_object,
                                                         this.options.reaction_styles,
                                                         this.options.reaction_compare_style);
                }
                if (update_map && this.map !== null) {
                    this.map.apply_reaction_data_to_map(data_object);
                    if (should_draw)
                        this.map.draw_all_reactions();
                }
            } else if (this.options.gene_data !== null) {
                // collect reactions from map and model
                var all_reactions = {};
                if (this.cobra_model !== null)
                    utils.extend(all_reactions, this.cobra_model.reactions);
                // extend, overwrite
                if (this.map !== null)
                    utils.extend(all_reactions, this.map.reactions, true);

                // this object has reaction keys and values containing associated genes
                data_object = data_styles.import_and_check(this.options.gene_data,
                                                           'gene_data',
                                                           all_reactions);

                // update the model if data is applied to reactions
                if (update_model && this.cobra_model !== null) {
                    this.cobra_model.apply_gene_data(data_object,
                                                     this.options.reaction_styles,
                                                     this.options.identifiers_on_map,
                                                     this.options.reaction_compare_style,
                                                     this.options.and_method_in_gene_reaction_rule);
                }
                if (update_map && this.map !== null) {
                    this.map.apply_gene_data_to_map(data_object);
                    if (should_draw)
                        this.map.draw_all_reactions();
                }
            } else {
                // clear the data
                // only update the model if there is not going to be gene data
                if (update_model && this.cobra_model !== null) {
                    this.cobra_model.apply_reaction_data(null,
                                                         this.options.reaction_styles,
                                                         this.options.reaction_compare_style);
                }
                if (update_map && this.map !== null) {
                    this.map.apply_reaction_data_to_map(null);
                    if (should_draw)
                        this.map.draw_all_reactions();
                }
            }
        }
    }

    function _setup_menu(menu_selection, button_selection, map, zoom_container,
                         key_manager, keys, enable_editing, enable_keys) {
        var menu = menu_selection.attr('id', 'menu')
                .append('ul')
                .attr('class', 'nav nav-pills');
        // map dropdown
        ui.dropdown_menu(menu, 'Map')
            .button({ key: keys.save,
                      text: 'Save as JSON',
                      key_text: (enable_keys ? ' (Ctrl+S)' : null) })
            .button({ text: 'Load map JSON',
                      key_text: (enable_keys ? ' (Ctrl+O)' : null),
                      input: { assign: key_manager.assigned_keys.load,
                               key: 'fn',
                               fn: load_map_for_file.bind(this),
                               pre_fn: function() {
                                   map.set_status('Loading map...');
                               },
                               failure_fn: function() {
                                   map.set_status('');
                               }}
                    })
            .button({ key: keys.save_svg,
                      text: 'Export as SVG',
                      key_text: (enable_keys ? ' (Ctrl+Shift+S)' : null) })
            .button({ key: keys.clear_map,
                      text: 'Clear map' });
        // model dropdown
        ui.dropdown_menu(menu, 'Model')
            .button({ text: 'Load COBRA model JSON',
                      key_text: (enable_keys ? ' (Ctrl+M)' : null),
                      input: { assign: key_manager.assigned_keys.load_model,
                               key: 'fn',
                               fn: load_model_for_file.bind(this),
                               pre_fn: function() {
                                   map.set_status('Loading model...');
                               },
                               failure_fn: function() {
                                   map.set_status('');
                               } }
                    });

        // data dropdown
        var data_menu = ui.dropdown_menu(menu, 'Data')
                .button({ input: { assign: key_manager.assigned_keys.load_reaction_data,
                                   key: 'fn',
                                   fn: load_reaction_data_for_file.bind(this),
                                   accept_csv: true },
                          text: 'Load reaction data' })
                .button({ key: keys.clear_reaction_data,
                          text: 'Clear reaction data' })
                .button({ input: { fn: load_gene_data_for_file.bind(this),
                                   accept_csv: true  },
                          text: 'Load gene data' })
                .button({ key: keys.clear_gene_data,
                          text: 'Clear gene data' })
                .button({ input: { fn: load_metabolite_data_for_file.bind(this),
                                   accept_csv: true  },
                          text: 'Load metabolite data' })
                .button({ key: keys.clear_metabolite_data,
                          text: 'Clear metabolite data' })
                .button({ key: keys.show_settings,
                          text: 'Settings',
                          key_text: (enable_keys ? ' (Ctrl+,)' : null) });

        // edit dropdown
        var edit_menu = ui.dropdown_menu(menu, 'Edit', true);
        if (enable_editing) {
            edit_menu
                .button({ key: keys.zoom_mode,
                          id: 'zoom-mode-menu-button',
                          text: 'Pan mode',
                          key_text: (enable_keys ? ' (Z)' : null) })
                .button({ key: keys.brush_mode,
                          id: 'brush-mode-menu-button',
                          text: 'Select mode',
                          key_text: (enable_keys ? ' (V)' : null) })
                .button({ key: keys.build_mode,
                          id: 'build-mode-menu-button',
                          text: 'Add reaction mode',
                          key_text: (enable_keys ? ' (N)' : null) })
                .button({ key: keys.rotate_mode,
                          id: 'rotate-mode-menu-button',
                          text: 'Rotate mode',
                          key_text: (enable_keys ? ' (R)' : null) })
                .button({ key: keys.text_mode,
                          id: 'text-mode-menu-button',
                          text: 'Text mode',
                          key_text: (enable_keys ? ' (T)' : null) })
                .divider()
                .button({ key: keys.delete,
                          text: 'Delete',
                          key_text: (enable_keys ? ' (Del)' : null) })
                .button({ key: keys.undo,
                          text: 'Undo',
                          key_text: (enable_keys ? ' (Ctrl+Z)' : null) })
                .button({ key: keys.redo,
                          text: 'Redo',
                          key_text: (enable_keys ? ' (Ctrl+Shift+Z)' : null) })
                .divider()
                .button({ key: keys.align_label_left,
                          text: 'Label(s) align left' })
                .button({ key: keys.align_label_center,
                          text: 'Label(s) align center' })
                .button({ key: keys.align_label_right,
                          text: 'Label(s) align right' })
                .divider()
                .button({ key: keys.make_primary,
                          text: 'Make primary metabolite',
                          key_text: (enable_keys ? ' (P)' : null) })
                .button({ key: keys.cycle_primary,
                          text: 'Cycle primary metabolite',
                          key_text: (enable_keys ? ' (C)' : null) })
                .button({ key: keys.select_all,
                          text: 'Select all',
                          key_text: (enable_keys ? ' (Ctrl+A)' : null) })
                .button({ key: keys.select_none,
                          text: 'Select none',
                          key_text: (enable_keys ? ' (Ctrl+Shift+A)' : null) })
                .button({ key: keys.invert_selection,
                          text: 'Invert selection' });
        } else {
            edit_menu.button({ key: keys.view_mode,
                               id: 'view-mode-menu-button',
                               text: 'View mode' });
        }

        // view dropdown
        var view_menu = ui.dropdown_menu(menu, 'View', true)
                .button({ key: keys.zoom_in,
                          text: 'Zoom in',
                          key_text: (enable_keys ? ' (Ctrl and +)' : null) })
                .button({ key: keys.zoom_out,
                          text: 'Zoom out',
                          key_text: (enable_keys ? ' (Ctrl and -)' : null) })
                .button({ key: keys.extent_nodes,
                          text: 'Zoom to nodes',
                          key_text: (enable_keys ? ' (Ctrl+0)' : null) })
                .button({ key: keys.extent_canvas,
                          text: 'Zoom to canvas',
                          key_text: (enable_keys ? ' (Ctrl+1)' : null) })
                .button({ key: keys.search,
                          text: 'Find',
                          key_text: (enable_keys ? ' (Ctrl+F)' : null) });
        if (enable_editing) {
            view_menu.button({ key: keys.toggle_beziers,
                               id: 'bezier-button',
                               text: 'Show control points',
                               key_text: (enable_keys ? ' (B)' : null) });
            map.callback_manager
                .set('toggle_beziers.button', function(on_off) {
                    menu.select('#bezier-button').select('.dropdown-button-text')
                        .text((on_off ? 'Hide' : 'Show') +
                              ' control points' +
                              (enable_keys ? ' (B)' : ''));
                });
        }

        var button_panel = button_selection.append('ul')
                .attr('class', 'nav nav-pills nav-stacked')
                .attr('id', 'button-panel');

        // buttons
        ui.individual_button(button_panel.append('li'),
                             { key: keys.zoom_in,
                               icon: 'glyphicon glyphicon-plus-sign',
                               classes: 'btn btn-default',
                               tooltip: 'Zoom in',
                               key_text: (enable_keys ? ' (Ctrl and +)' : null) });
        ui.individual_button(button_panel.append('li'),
                             { key: keys.zoom_out,
                               icon: 'glyphicon glyphicon-minus-sign',
                               classes: 'btn btn-default',
                               tooltip: 'Zoom out',
                               key_text: (enable_keys ? ' (Ctrl and -)' : null) });
        ui.individual_button(button_panel.append('li'),
                             { key: keys.extent_canvas,
                               icon: 'glyphicon glyphicon-resize-full',
                               classes: 'btn btn-default',
                               tooltip: 'Zoom to canvas',
                               key_text: (enable_keys ? ' (Ctrl+1)' : null) });

        // mode buttons
        if (enable_editing) {
            ui.radio_button_group(button_panel.append('li'))
                .button({ key: keys.zoom_mode,
                          id: 'zoom-mode-button',
                          icon: 'glyphicon glyphicon-move',
                          tooltip: 'Pan mode',
                          key_text: (enable_keys ? ' (Z)' : null) })
                .button({ key: keys.brush_mode,
                          id: 'brush-mode-button',
                          icon: 'glyphicon glyphicon-hand-up',
                          tooltip: 'Select mode',
                          key_text: (enable_keys ? ' (V)' : null) })
                .button({ key: keys.build_mode,
                          id: 'build-mode-button',
                          icon: 'glyphicon glyphicon-plus',
                          tooltip: 'Add reaction mode',
                          key_text: (enable_keys ? ' (N)' : null) })
                .button({ key: keys.rotate_mode,
                          id: 'rotate-mode-button',
                          icon: 'glyphicon glyphicon-repeat',
                          tooltip: 'Rotate mode',
                          key_text: (enable_keys ? ' (R)' : null) })
                .button({ key: keys.text_mode,
                          id: 'text-mode-button',
                          icon: 'glyphicon glyphicon-font',
                          tooltip: 'Text mode',
                          key_text: (enable_keys ? ' (T)' : null) });

            // arrow buttons
            this.direction_buttons = button_panel.append('li');
            var o = ui.button_group(this.direction_buttons)
                    .button({ key: keys.direction_arrow_left,
                              icon: 'glyphicon glyphicon-arrow-left',
                              tooltip: 'Direction arrow (←)' })
                    .button({ key: keys.direction_arrow_right,
                              icon: 'glyphicon glyphicon-arrow-right',
                              tooltip: 'Direction arrow (→)' })
                    .button({ key: keys.direction_arrow_up,
                              icon: 'glyphicon glyphicon-arrow-up',
                              tooltip: 'Direction arrow (↑)' })
                    .button({ key: keys.direction_arrow_down,
                              icon: 'glyphicon glyphicon-arrow-down',
                              tooltip: 'Direction arrow (↓)' });
        }

        // set up mode callbacks
        var select_button = function(id) {
            // toggle the button
            $(this.options.selection.node()).find('#' + id)
                .button('toggle');

            // menu buttons
            var ids = ['zoom-mode-menu-button', 'brush-mode-menu-button',
                       'build-mode-menu-button', 'rotate-mode-menu-button',
                       'view-mode-menu-button', 'text-mode-menu-button'];
            ids.forEach(function(this_id) {
                var b_id = this_id.replace('-menu', '');
                this.options.selection.select('#' + this_id)
                    .select('span')
                    .classed('glyphicon', b_id == id)
                    .classed('glyphicon-ok', b_id == id);
            }.bind(this));
        };
        this.callback_manager.set('zoom_mode', select_button.bind(this, 'zoom-mode-button'));
        this.callback_manager.set('brush_mode', select_button.bind(this, 'brush-mode-button'));
        this.callback_manager.set('build_mode', select_button.bind(this, 'build-mode-button'));
        this.callback_manager.set('rotate_mode', select_button.bind(this, 'rotate-mode-button'));
        this.callback_manager.set('view_mode', select_button.bind(this, 'view-mode-button'));
        this.callback_manager.set('text_mode', select_button.bind(this, 'text-mode-button'));

        // definitions
        function load_map_for_file(error, map_data) {
            /** Load a map. This reloads the whole builder.

             */

            if (error) {
                console.warn(error);
                this.map.set_status('Error loading map: ' + error, 2000);
                return;
            }

            try {
                check_map(map_data);
                this.load_map(map_data);
                this.map.set_status('Loaded map ' + map_data[0].map_id, 3000);
            } catch (e) {
                console.warn(e);
                this.map.set_status('Error loading map: ' + e, 2000);
            }

            // definitions
            function check_map(data) {
                /** Perform a quick check to make sure the map is mostly valid.

                 */

                if (!('map_id' in data[0] && 'reactions' in data[1] &&
                      'nodes' in data[1] && 'canvas' in data[1]))
                    throw new Error('Bad map data.');
            }
        }
        function load_model_for_file(error, data) {
            /** Load a cobra model. Redraws the whole map if the
             highlight_missing option is true.

             */
            if (error) {
                console.warn(error);
                this.map.set_status('Error loading model: ' + error, 2000);
                return;
            }

            try {
                this.load_model(data);
                this.build_input.toggle(false);
                if ('id' in data)
                    this.map.set_status('Loaded model ' + data.id, 3000);
                else
                    this.map.set_status('Loaded model (no model id)', 3000);
                if (this.settings.highlight_missing!==null) {
                    this.map.draw_everything();
                }
            } catch (e) {
                console.warn(e);
                this.map.set_status('Error loading model: ' + e, 2000);
            }

        }
        function load_reaction_data_for_file(error, data) {
            if (error) {
                console.warn(error);
                this.map.set_status('Could not parse file as JSON or CSV', 2000);
                return;
            }
            // turn off gene data
            if (data !== null)
                this.set_gene_data(null);

            this.set_reaction_data(data);
        }
        function load_metabolite_data_for_file(error, data) {
            if (error) {
                console.warn(error);
                this.map.set_status('Could not parse file as JSON or CSV', 2000);
                return;
            }
            this.set_metabolite_data(data);
        }
        function load_gene_data_for_file(error, data) {
            if (error) {
                console.warn(error);
                this.map.set_status('Could not parse file as JSON or CSV', 2000);
                return;
            }
            // turn off reaction data
            if (data !== null)
                this.set_reaction_data(null);

            this.set_gene_data(data);
        }
    }

    function _setup_simple_zoom_buttons(button_selection, keys) {
        var button_panel = button_selection.append('div')
                .attr('id', 'simple-button-panel');

        // buttons
        ui.individual_button(button_panel.append('div'),
                             { key: keys.zoom_in,
                               text: '+',
                               classes: 'simple-button',
                               tooltip: 'Zoom in (Ctrl +)' });
        ui.individual_button(button_panel.append('div'),
                             { key: keys.zoom_out,
                               text: '–',
                               classes: 'simple-button',
                               tooltip: 'Zoom out (Ctrl -)' });
        ui.individual_button(button_panel.append('div'),
                             { key: keys.extent_canvas,
                               text: '↔',
                               classes: 'simple-button',
                               tooltip: 'Zoom to canvas (Ctrl 1)' });

    }

    function _toggle_direction_buttons(on_off) {
        if (on_off===undefined)
            on_off = !this.direction_buttons.style('visibility')=='visible';
        this.direction_buttons.style('visibility', on_off ? 'visible' : 'hidden');
    }

    function _setup_status(selection, map) {
        var status_bar = selection.append('div').attr('id', 'status');
        map.callback_manager.set('set_status', function(status) {
            status_bar.text(status);
        });
        return status_bar;
    }

    function _setup_quick_jump(selection, options) {
        // make the quick jump object
        this.quick_jump = QuickJump(selection, options);

        // function to load a map
        var load_map = function(new_map_name, current_map) {
            this.map.set_status('Loading map ' + new_map_name + ' ...');
            var url = utils.name_to_url(new_map_name, this.options.local_host);
            d3.json(url, function(error, data) {
                if (error)
                    throw new Error('Could not load data: ' + error)
                // update the url with the new map
                var new_url = window.location.href
                        .replace(/(map_name=)([^&]+)(&|$)/, '$1' + new_map_name + '$3')
                window.history.pushState('not implemented', new_map_name, new_url);
                // now reload
                this.load_map(data);
                this.map.set_status('');
            }.bind(this));
        }.bind(this);

        // set the callback
        this.quick_jump.callback_manager.set('switch_maps', load_map);
    }

    function _setup_modes(map, brush, zoom_container) {
        // set up zoom+pan and brush modes
        var was_enabled = {};
        map.callback_manager.set('start_rotation', function() {
            was_enabled.brush = brush.enabled;
            brush.toggle(false);
            was_enabled.zoom = zoom_container.zoom_on;
            zoom_container.toggle_zoom(false);
            was_enabled.selectable_click = map.behavior.selectable_click!=null;
            map.behavior.toggle_selectable_click(false);
            was_enabled.label_click = map.behavior.label_click!=null;
            map.behavior.toggle_label_click(false);
        });
        map.callback_manager.set('end_rotation', function() {
            brush.toggle(was_enabled.brush);
            zoom_container.toggle_zoom(was_enabled.zoom);
            map.behavior.toggle_selectable_click(was_enabled.selectable_click);
            map.behavior.toggle_label_click(was_enabled.label_click);
            was_enabled = {};
        });
    }

    function _get_keys(map, zoom_container, search_bar, settings_bar, enable_editing) {
        var keys = {
            save: { key: 83, modifiers: { control: true }, // ctrl-s
                    target: map,
                    fn: map.save },
            save_svg: { key: 83, modifiers: { control: true, shift: true },
                        target: map,
                        fn: map.save_svg },
            load: { key: 79, modifiers: { control: true }, // ctrl-o
                    fn: null }, // defined by button
            clear_map: { target: map,
                         fn: function() { this.clear_map(); }},
            load_model: { key: 77, modifiers: { control: true }, // ctrl-m
                          fn: null }, // defined by button
            load_reaction_data: { fn: null }, // defined by button
            clear_reaction_data: { target: this,
                                   fn: function() { this.set_reaction_data(null); }},
            load_metabolite_data: { fn: null }, // defined by button
            clear_metabolite_data: { target: this,
                                     fn: function() { this.set_metabolite_data(null); }},
            load_gene_data: { fn: null }, // defined by button
            clear_gene_data: { target: this,
                               fn: function() { this.set_gene_data(null); }},
            zoom_in: { key: 187, modifiers: { control: true }, // ctrl +
                       target: zoom_container,
                       fn: zoom_container.zoom_in },
            zoom_out: { key: 189, modifiers: { control: true }, // ctrl -
                        target: zoom_container,
                        fn: zoom_container.zoom_out },
            extent_nodes: { key: 48, modifiers: { control: true }, // ctrl-0
                            target: map,
                            fn: map.zoom_extent_nodes },
            extent_canvas: { key: 49, modifiers: { control: true }, // ctrl-1
                             target: map,
                             fn: map.zoom_extent_canvas },
            search: { key: 70, modifiers: { control: true }, // ctrl-f
                      fn: search_bar.toggle.bind(search_bar, true) },
            view_mode: { fn: this.view_mode.bind(this),
                         ignore_with_input: true },
            show_settings: { key: 188, modifiers: { control: true }, // Ctrl ,
                             fn: settings_bar.toggle.bind(settings_bar) }
        };
        if (enable_editing) {
            utils.extend(keys, {
                build_mode: { key: 78, // n
                              fn: this.build_mode.bind(this),
                              ignore_with_input: true },
                zoom_mode: { key: 90, // z
                             fn: this.zoom_mode.bind(this),
                             ignore_with_input: true },
                brush_mode: { key: 86, // v
                              fn: this.brush_mode.bind(this),
                              ignore_with_input: true },
                rotate_mode: { key: 82, // r
                               fn: this.rotate_mode.bind(this),
                               ignore_with_input: true },
                text_mode: { key: 84, // t
                             fn: this.text_mode.bind(this),
                             ignore_with_input: true },
                toggle_beziers: { key: 66,
                                  target: map,
                                  fn: map.toggle_beziers,
                                  ignore_with_input: true  }, // b
                delete: { key: 8, modifiers: { control: true }, // ctrl-backspace
                          target: map,
                          fn: map.delete_selected,
                          ignore_with_input: true },
                delete_del: { key: 46, modifiers: { control: false }, // Del
                              target: map,
                              fn: map.delete_selected,
                              ignore_with_input: true },
                // align labels
                align_label_left: { fn: map.align_selected_labels.bind(map, 'left') },
                align_label_center: { fn: map.align_selected_labels.bind(map, 'center') },
                align_label_right: { fn: map.align_selected_labels.bind(map, 'right') },
                // metabolites
                make_primary: { key: 80, // p
                                target: map,
                                fn: map.make_selected_node_primary,
                                ignore_with_input: true },
                cycle_primary: { key: 67, // c
                                 target: map,
                                 fn: map.cycle_primary_node,
                                 ignore_with_input: true },
                direction_arrow_right: { key: 39, // right
                                         fn: this.build_input.direction_arrow.right
                                         .bind(this.build_input.direction_arrow),
                                         ignore_with_input: true },
                direction_arrow_down: { key: 40, // down
                                        fn: this.build_input.direction_arrow.down
                                        .bind(this.build_input.direction_arrow),
                                        ignore_with_input: true },
                direction_arrow_left: { key: 37, // left
                                        fn: this.build_input.direction_arrow.left
                                        .bind(this.build_input.direction_arrow),
                                        ignore_with_input: true },
                direction_arrow_up: { key: 38, // up
                                      fn: this.build_input.direction_arrow.up
                                      .bind(this.build_input.direction_arrow),
                                      ignore_with_input: true },
                undo: { key: 90, modifiers: { control: true },
                        target: map.undo_stack,
                        fn: map.undo_stack.undo },
                redo: { key: 90, modifiers: { control: true, shift: true },
                        target: map.undo_stack,
                        fn: map.undo_stack.redo },
                select_all: { key: 65, modifiers: { control: true }, // Ctrl Shift a
                              fn: map.select_all.bind(map) },
                select_none: { key: 65, modifiers: { control: true, shift: true }, // Ctrl Shift a
                               fn: map.select_none.bind(map) },
                invert_selection: { fn: map.invert_selection.bind(map) }
            });
        }
        return keys;
    }

    function _setup_confirm_before_exit() {
        /** Ask if the user wants to exit the page (to avoid unplanned refresh).

         */

        window.onbeforeunload = function(e) {
            // If we haven't been passed the event get the window.event
            e = e || window.event;
            return 'You may have unsaved changes.';
        };
    }
});
