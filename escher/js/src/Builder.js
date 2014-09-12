define(["utils", "Input", "ZoomContainer", "Map", "CobraModel", "Brush", "CallbackManager", "ui", "SearchBar", "Settings", "SettingsBar"], function(utils, Input, ZoomContainer, Map, CobraModel, Brush, CallbackManager, ui, SearchBar, Settings, SettingsBar) {
    /** A Builder object contains all the ui and logic to generate a map builder or viewer.

     Builder(options)

     options: An object.

     */
    var Builder = utils.make_class();
    Builder.prototype = { init: init,
			  reload_builder: reload_builder,
			  set_mode: set_mode,
			  view_mode: view_mode,
			  build_mode: build_mode,
			  brush_mode: brush_mode,
			  zoom_mode: zoom_mode,
			  rotate_mode: rotate_mode,
			  _toggle_direction_buttons: _toggle_direction_buttons,
			  _setup_menu: _setup_menu,
			  _setup_simple_zoom_buttons: _setup_simple_zoom_buttons,
			  _setup_status: _setup_status,
			  _setup_modes: _setup_modes,
			  _get_keys: _get_keys };

    return Builder;

    // definitions
    function init(options) {
	// set defaults
	this.options = utils.set_options(options, {
	    // location
	    selection: d3.select("body").append("div"),
	    // view options
	    menu: 'all',
	    scroll_behavior: 'pan',
	    enable_editing: true,
	    enable_keys: true,
	    enable_search: true,
	    fillScreen: false,
	    // map, model, and styles
	    map_path: null,
	    map: null,
	    cobra_model_path: null,
	    cobra_model: null,
	    css_path: null,
	    css: null,
	    starting_reaction: null,
	    // applied data
	    auto_reaction_domain: true,
	    reaction_data_path: null,
	    reaction_data: null,
	    reaction_styles: ['color', 'size', 'abs', 'text'],
	    reaction_domain: [-10, 0, 10],
	    reaction_color_range: ['rgb(200,200,200)', 'rgb(150,150,255)', 'purple'],
	    reaction_size_range: [4, 8, 12],
	    metabolite_data: null,
	    metabolite_data_path: null,
	    metabolite_styles: ['color', 'size', 'text'],
	    auto_metabolite_domain: true,
	    metabolite_domain: [-10, 0, 10],
	    metabolite_color_range: ['green', 'white', 'red'],
	    metabolite_size_range: [6, 8, 10]
	});

	// initialize the settings
	this.settings = new Settings(
	    { reaction: this.options.reaction_styles,
	      metabolite: this.options.metabolite_styles },
	    { reaction: this.options.auto_reaction_domain,
	      metabolite: this.options.auto_metabolite_domain },
	    { reaction: this.options.reaction_domain,
	      metabolite: this.options.metabolite_domain },
	    { reaction: { color: this.options.reaction_color_range,
			  size: this.options.reaction_size_range },
	      metabolite: { color: this.options.metabolite_color_range,
			    size: this.options.metabolite_size_range } }
	);

	if (utils.check_for_parent_tag(this.options.selection, 'svg')) {
	    throw new Error("Builder cannot be placed within an svg node "+
			    "becuase UI elements are html-based.");
	}

	var files_to_load = [{ file: this.options.map_path, 
			       value: this.options.map,
			       callback: set_map_data },
			     { file: this.options.cobra_model_path, 
			       value: this.options.cobra_model,
			       callback: set_cobra_model },
			     { file: this.options.css_path, 
			       value: this.options.css,
			       callback: set_css },
			     { file: this.options.reaction_data_path, 
			       value: this.options.reaction_data,
			       callback: set_reaction_data },
			     { file: this.options.metabolite_data_path, 
			       value: this.options.metabolite_data,
			       callback: set_metabolite_data } ];
	utils.load_files(this, files_to_load, reload_builder);
	return;

	// definitions
	function set_map_data(error, map_data) {
	    if (error) console.warn(error);
	    this.options.map_data = map_data;
	}
	function set_cobra_model(error, cobra_model) {
	    if (error) console.warn(error);
	    this.options.cobra_model = cobra_model;
	}
	function set_css(error, css) {
	    if (error) console.warn(error);
	    this.options.css = css;
	}
	function set_reaction_data(error, data) {
	    if (error) console.warn(error);
	    this.options.reaction_data = data;
	}
	function set_metabolite_data(error, data) {
	    if (error) console.warn(error);
	    this.options.metabolite_data = data;
	}
    }

    // Definitions
    function reload_builder() {
	/** Load the svg container and draw a loaded map if provided.
	 
	 */

	// Begin with some definitions
	var node_click_enabled = true,
	    shift_key_on = false;

	// set up this callback manager
	this.callback_manager = CallbackManager();

	// Check the cobra model
	var cobra_model_obj = null;
	if (this.options.cobra_model!==null) {
	    cobra_model_obj = CobraModel(this.options.cobra_model);
	} else {
	    console.warn('No cobra model was loaded.');
	}

	// remove the old builder
	utils.remove_child_nodes(this.options.selection);

	// set up the svg
	var svg = utils.setup_svg(this.options.selection, this.options.selection_is_svg,
				  this.options.fill_screen);
	
	// se up the zoom container
	this.zoom_container = new ZoomContainer(svg, this.options.selection,
						this.options.scroll_behavior);
	var zoomed_sel = this.zoom_container.zoomed_sel;

	if (this.options.map_data!==null) {
	    // import map
	    this.map = Map.from_data(this.options.map_data,
				     svg, this.options.css,
				     zoomed_sel,
				     this.zoom_container,
				     this.settings,
				     this.options.reaction_data,
				     this.options.metabolite_data,
				     cobra_model_obj,
				     this.options.enable_search);
	    this.zoom_container.reset();
	} else {
	    // new map
	    this.map = new Map(svg, this.options.css, zoomed_sel,
			       this.zoom_container,
			       this.settings,
			       this.options.reaction_data,
			       this.options.metabolite_data,
			       cobra_model_obj,
			       null,
			       this.options.enable_search);
	}

	// set up the reaction input with complete.ly
	this.reaction_input = Input(this.options.selection, this.map,
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
	    settings_div = s.append('div'),
	    button_div = this.options.selection.append('div');

	// set up the search bar
	this.search_bar = SearchBar(search_bar_div, this.map.search_index, 
				    this.map);
	// set up the settings
	this.settings_page = SettingsBar(settings_div, this.settings, 
					 this.map);
	// set up the hide callbacks
	this.search_bar.callback_manager.set('show', function() {
	    this.settings_page.toggle(false);
	}.bind(this));
	this.settings_page.callback_manager.set('show', function() {
	    this.search_bar.toggle(false);
	}.bind(this));

	// set up key manager
	var keys = this._get_keys(this.map, this.zoom_container,
				  this.search_bar, this.settings_page,
				  this.options.enable_editing);
	this.map.key_manager.assigned_keys = keys;
	// tell the key manager about the reaction input and search bar
	this.map.key_manager.input_list = [this.reaction_input, this.search_bar,
					   this.settings_page];
	// make sure the key manager remembers all those changes
	this.map.key_manager.update();
	// turn it on/off
	this.map.key_manager.toggle(this.options.enable_keys);
	
	// set up menu and status bars
	if (this.options.menu=='all') {
	    this._setup_menu(menu_div, button_div, this.map, this.zoom_container, this.map.key_manager, keys,
			     this.options.enable_editing);
	} else if (this.options.menu=='zoom') {
	    this._setup_simple_zoom_buttons(button_div, keys);
	}
	var status = this._setup_status(this.options.selection, this.map);

	// setup selection box
	if (this.options.map_data!==null) {
	    this.map.zoom_extent_canvas();
	} else {
	    if (this.options.starting_reaction!==null && cobra_model_obj!==null) {
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

	// start in zoom mode for builder, view mode for viewer
	if (this.options.enable_editing)
	    this.zoom_mode();
	else
	    this.view_mode();

	// draw
	this.map.draw_everything();
    }

    function set_mode(mode) {
	this.search_bar.toggle(false);
	// input
	this.reaction_input.toggle(mode=='build');
	this.reaction_input.direction_arrow.toggle(mode=='build');
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
	this.map.behavior.toggle_node_click(mode=='build' || mode=='brush');
	this.map.behavior.toggle_node_drag(mode=='brush');
	this.map.behavior.toggle_text_label_click(mode=='brush');
	this.map.behavior.toggle_label_drag(mode=='brush');
	if (mode=='view')
	    this.map.select_none();
	this.map.draw_everything();
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
    function _setup_menu(menu_selection, button_selection, map, zoom_container,
			 key_manager, keys, enable_editing) {
	var menu = menu_selection.attr('id', 'menu')
		.append("ul")
		.attr("class", "nav nav-pills");
	// map dropdown
	ui.dropdown_menu(menu, 'Map')
	    .button({ key: keys.save,
		      text: "Save as JSON (Ctrl s)" })
	    .button({ text: "Load map JSON (Ctrl o)",
		      input: { assign: key_manager.assigned_keys.load,
			       key: 'fn',
			       fn: load_map_for_file.bind(this) }
		    })
	    .button({ key: keys.save_svg,
		      text: "Export as SVG (Ctrl Shift s)" })
	    .button({ key: keys.clear_map,
		      text: "Clear map" });
	// model dropdown
	ui.dropdown_menu(menu, 'Model')
	    .button({ text: 'Load COBRA model JSON (Ctrl m)',
		      input: { assign: key_manager.assigned_keys.load_model,
			       key: 'fn',
			       fn: load_model_for_file.bind(this) }
		    });

	// data dropdown
	var data_menu = ui.dropdown_menu(menu, 'Data')
		.button({ input: { assign: key_manager.assigned_keys.load_reaction_data,
				   key: 'fn',
				   fn: load_reaction_data_for_file.bind(this) },
			  text: "Load reaction data" })
		.button({ key: keys.clear_reaction_data,
			  text: "Clear reaction data" })
		.button({ input: { fn: load_metabolite_data_for_file.bind(this) },
			  text: "Load metabolite data" })
		.button({ key: keys.clear_metabolite_data,
			  text: "Clear metabolite data" })
		.button({ key: keys.show_settings,
			  text: "Settings (Ctrl ,)" });
	
	// edit dropdown 
	var edit_menu = ui.dropdown_menu(menu, 'Edit', true);
	if (enable_editing) {	   
	    edit_menu.button({ key: keys.build_mode,
			       id: 'build-mode-menu-button',
			       text: "Add reaction mode (n)" })
		.button({ key: keys.zoom_mode,
			  id: 'zoom-mode-menu-button',
			  text: "Pan mode (z)" })
		.button({ key: keys.brush_mode,
			  id: 'brush-mode-menu-button',
			  text: "Select mode (v)" })
		.button({ key: keys.rotate_mode,
			  id: 'rotate-mode-menu-button',
			  text: "Rotate mode (r)" })
		.divider()
		.button({ key: keys.delete,
			  // icon: "glyphicon glyphicon-trash",
			  text: "Delete (Ctrl Del)" })
		.button({ key: keys.undo, 
			  text: "Undo (Ctrl z)" })
		.button({ key: keys.redo,
			  text: "Redo (Ctrl Shift z)" }) 
		.button({ key: keys.make_primary,
			  text: "Make primary metabolite (p)" })
		.button({ key: keys.cycle_primary,
			  text: "Cycle primary metabolite (c)" })
		.button({ key: keys.select_none,
			  text: "Select none (Ctrl Shift a)" });
	} else {
	    edit_menu.button({ key: keys.view_mode,
			       id: 'view-mode-menu-button',
			       text: "View mode" });
	}

	// view dropdown
	var view_menu = ui.dropdown_menu(menu, 'View', true)
		.button({ key: keys.zoom_in,
			  text: "Zoom in (Ctrl +)" })
		.button({ key: keys.zoom_out,
			  text: "Zoom out (Ctrl -)" })
		.button({ key: keys.extent_nodes,
			  text: "Zoom to nodes (Ctrl 0)"
			})
		.button({ key: keys.extent_canvas,
			  text: "Zoom to canvas (Ctrl 1)" })
		.button({ key: keys.search,
			  text: "Find (Ctrl f)" });
	if (enable_editing) {
	    view_menu.button({ key: keys.toggle_beziers,
			       id: "bezier-button",
			       text: "Show control points (b)"});	    
	    map.callback_manager
		.set('toggle_beziers.button', function(on_off) {
		    menu.select('#bezier-button').select('.dropdown-button-text')
			.text((on_off ? 'Hide' : 'Show') + ' control points (b)');
		});
	}
	
	var button_panel = button_selection.append("ul")
		.attr("class", "nav nav-pills nav-stacked")
		.attr('id', 'button-panel');

	// buttons
	ui.individual_button(button_panel.append('li'),
			     { key: keys.zoom_in,
			       icon: "glyphicon glyphicon-plus-sign",
			       classes: 'btn btn-default',
			       tooltip: "Zoom in (Ctrl +)" });
	ui.individual_button(button_panel.append('li'),
			     { key: keys.zoom_out,
			       icon: "glyphicon glyphicon-minus-sign",
			       classes: 'btn btn-default',
			       tooltip: "Zoom out (Ctrl -)" });
	ui.individual_button(button_panel.append('li'),
			     { key: keys.extent_canvas,
			       icon: "glyphicon glyphicon-resize-full",
			       classes: 'btn btn-default',
			       tooltip: "Zoom to canvas (Ctrl 1)" });

	// mode buttons
	if (enable_editing) {
	    ui.radio_button_group(button_panel.append('li'))
		.button({ key: keys.build_mode,
			  id: 'build-mode-button',
			  icon: "glyphicon glyphicon-plus",
			  tooltip: "Add reaction mode (n)" })
		.button({ key: keys.zoom_mode,
			  id: 'zoom-mode-button',
			  icon: "glyphicon glyphicon-move",
			  tooltip: "Pan mode (z)" })
		.button({ key: keys.brush_mode,
			  id: 'brush-mode-button',
			  icon: "glyphicon glyphicon-hand-up",
			  tooltip: "Select mode (v)" })
		.button({ key: keys.rotate_mode,
			  id: 'rotate-mode-button',
			  icon: "glyphicon glyphicon-repeat",
			  tooltip: "Rotate mode (r)" });

	    // arrow buttons
	    this.direction_buttons = button_panel.append('li');
	    var o = ui.button_group(this.direction_buttons)
		    .button({ key: keys.direction_arrow_left,
			      icon: "glyphicon glyphicon-arrow-left",
			      tooltip: "Direction arrow (←)" })
		    .button({ key: keys.direction_arrow_right,
			      icon: "glyphicon glyphicon-arrow-right",
			      tooltip: "Direction arrow (→)" })
		    .button({ key: keys.direction_arrow_up,
			      icon: "glyphicon glyphicon-arrow-up",
			      tooltip: "Direction arrow (↑)" })
		    .button({ key: keys.direction_arrow_down,
			      icon: "glyphicon glyphicon-arrow-down",
			      tooltip: "Direction arrow (↓)" });
	}

	// set up mode callbacks
	var select_menu_button = function(id) {
	    var ids = ['#build-mode-menu-button',
		       '#zoom-mode-menu-button',
		       '#brush-mode-menu-button',
		       '#rotate-mode-menu-button',
		       '#view-mode-menu-button'];
	    for (var i=0, l=ids.length; i<l; i++) {
		var the_id = ids[i];
		d3.select(the_id)
		    .select('span')
		    .classed('glyphicon', the_id==id)
		    .classed('glyphicon-ok', the_id==id);
	    }
	};
	this.callback_manager.set('build_mode', function() {
	    $('#build-mode-button').button('toggle');
	    select_menu_button('#build-mode-menu-button');
	});
	this.callback_manager.set('zoom_mode', function() {
	    $('#zoom-mode-button').button('toggle');
	    select_menu_button('#zoom-mode-menu-button');
	});
	this.callback_manager.set('brush_mode', function() {
	    $('#brush-mode-button').button('toggle');
	    select_menu_button('#brush-mode-menu-button');
	});
	this.callback_manager.set('rotate_mode', function() {
	    $('#rotate-mode-button').button('toggle');
	    select_menu_button('#rotate-mode-menu-button');
	});
	this.callback_manager.set('view_mode', function() {
	    $('#view-mode-button').button('toggle');
	    select_menu_button('#view-mode-menu-button');
	});

	// definitions
	function load_map_for_file(error, map_data) {
	    if (error) console.warn(error);
	    this.options.map_data = map_data;
	    this.reload_builder();
	}
	function load_model_for_file(error, data) {
	    if (error) console.warn(error);
	    var cobra_model_obj = CobraModel(data);
	    this.map.set_model(cobra_model_obj);
	    this.reaction_input.toggle(false);
	}
	function load_reaction_data_for_file(error, data) {
	    if (error) console.warn(error);
	    this.map.set_reaction_data(data);
	}
	function load_metabolite_data_for_file(error, data) {
	    if (error) console.warn(error);
	    this.map.set_metabolite_data(data);
	}
    }

    function _setup_simple_zoom_buttons(button_selection, keys) {
	var button_panel = button_selection.append("div")
		.attr('id', 'simple-button-panel');

	// buttons
	ui.individual_button(button_panel.append('div'),
			     { key: keys.zoom_in,
			       text: "+",
			       classes: "simple-button",
			       tooltip: "Zoom in (Ctrl +)" });
	ui.individual_button(button_panel.append('div'),
			     { key: keys.zoom_out,
			       text: "–",
			       classes: "simple-button",
			       tooltip: "Zoom out (Ctrl -)" });
	ui.individual_button(button_panel.append('div'),
			     { key: keys.extent_canvas,
			       text: "↔",
			       classes: "simple-button",
			       tooltip: "Zoom to canvas (Ctrl 1)" });

    }

    function _toggle_direction_buttons(on_off) {
	if (on_off===undefined)
	    on_off = !this.direction_buttons.style('visibility')=='visible';
	this.direction_buttons.style('visibility', on_off ? 'visible' : 'hidden');
    }

    function _setup_status(selection, map) {
	var status_bar = selection.append("div").attr("id", "status");
	map.callback_manager.set('set_status', function(status) {
	    status_bar.text(status);
	});
	return status_bar;
    }

    function _setup_modes(map, brush, zoom_container) {
	// set up zoom+pan and brush modes
	var was_enabled = {};
	map.callback_manager.set('start_rotation', function() {
	    was_enabled.brush = brush.enabled;
	    brush.toggle(false);
	    was_enabled.zoom = zoom_container.zoom_on;
	    zoom_container.toggle_zoom(false);
	    was_enabled.node_click = map.behavior.node_click!=null;
	    map.behavior.toggle_node_click(false);
	});
	map.callback_manager.set('end_rotation', function() {
	    brush.toggle(was_enabled.brush);
	    zoom_container.toggle_zoom(was_enabled.zoom);
	    map.behavior.toggle_node_click(was_enabled.node_click);
	    was_enabled = {};
	});
    }

    function _get_keys(map, zoom_container, search_bar, settings_page, enable_editing) {
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
	    clear_reaction_data: { target: map,
				   fn: function() { this.set_reaction_data(null); }},
	    load_metabolite_data: { fn: null }, // defined by button
	    clear_metabolite_data: { target: map,
				     fn: function() { this.set_metabolite_data(null); }},
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
			 ignore_with_input: true }
	};
	if (enable_editing) {
	    utils.extend(keys, {
		build_mode: { key: 78, // n
			      target: this,
			      fn: this.build_mode,
			      ignore_with_input: true },
		zoom_mode: { key: 90, // z 
			     target: this,
			     fn: this.zoom_mode,
			     ignore_with_input: true },
		brush_mode: { key: 86, // v
			      target: this,
			      fn: this.brush_mode,
			      ignore_with_input: true },
		rotate_mode: { key: 82, // r
			       target: this,
			       fn: this.rotate_mode,
			       ignore_with_input: true },
		toggle_beziers: { key: 66,
				  target: map,
				  fn: map.toggle_beziers,
				  ignore_with_input: true  }, // b
		delete: { key: 8, modifiers: { control: true }, // ctrl-backspace
			  target: map,
			  fn: map.delete_selected,
			  ignore_with_input: true },
		delete_del: { key: 46, modifiers: { control: true }, // ctrl-del
			      target: map,
			      fn: map.delete_selected,
			      ignore_with_input: true },
		make_primary: { key: 80, // p
				target: map,
				fn: map.make_selected_node_primary,
				ignore_with_input: true },
		cycle_primary: { key: 67, // c
				 target: map,
				 fn: map.cycle_primary_node,
				 ignore_with_input: true },
		direction_arrow_right: { key: 39, // right
					 fn: this.reaction_input.direction_arrow.right
					 .bind(this.reaction_input.direction_arrow),
					 ignore_with_input: true },
		direction_arrow_down: { key: 40, // down
					fn: this.reaction_input.direction_arrow.down
					.bind(this.reaction_input.direction_arrow),
					ignore_with_input: true },
		direction_arrow_left: { key: 37, // left
					fn: this.reaction_input.direction_arrow.left
					.bind(this.reaction_input.direction_arrow),
					ignore_with_input: true },
		direction_arrow_up: { key: 38, // up
				      fn: this.reaction_input.direction_arrow.up
				      .bind(this.reaction_input.direction_arrow),
				      ignore_with_input: true },
		undo: { key: 90, modifiers: { control: true },
			target: map.undo_stack,
			fn: map.undo_stack.undo },
		redo: { key: 90, modifiers: { control: true, shift: true },
			target: map.undo_stack,
			fn: map.undo_stack.redo },
		select_none: { key: 65, modifiers: { control: true, shift: true }, // Ctrl Shift a
			       target: map,
			       fn: map.select_none },
		show_settings: { key: 188, modifiers: { control: true }, // Ctrl ,
				 fn: settings_page.toggle.bind(settings_page) }
	    });
	}
	return keys;
    }
});
