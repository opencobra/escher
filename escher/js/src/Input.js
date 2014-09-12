define(["utils",  "lib/complete.ly", "Map", "ZoomContainer", "CallbackManager", "draw", "DirectionArrow"], function(utils, completely, Map, ZoomContainer, CallbackManager, draw, DirectionArrow) {
    /**
     */

    var Input = utils.make_class();
    // instance methods
    Input.prototype = { init: init,
			setup_map_callbacks: setup_map_callbacks,
			setup_zoom_callbacks: setup_zoom_callbacks,
			is_visible: is_visible,
			toggle: toggle,
			show_dropdown: show_dropdown,
			hide_dropdown: hide_dropdown,
			place_at_selected: place_at_selected,
			place: place,
			reload_at_selected: reload_at_selected,
			reload: reload,
			toggle_start_reaction_listener: toggle_start_reaction_listener,
			hide_target: hide_target,
			show_target: show_target };

    return Input;

    // definitions
    function init(selection, map, zoom_container) {
	// set up container
	var new_sel = selection.append("div").attr("id", "rxn-input");
	// set up complete.ly
	var c = completely(new_sel.node(), { backgroundColor: "#eee" });
	d3.select(c.input)
	// .attr('placeholder', 'Reaction ID -- Flux')
	    .on('input', function() {
		this.value = this.value
		    // .replace("/","")
		    .replace(" ","")
		    .replace("\\","")
		    .replace("<","");
	    });
	this.selection = new_sel;
	this.completely = c;
	// close button
	new_sel.append('button').attr('class', "button input-close-button")
	    .text("×").on('click', function() { this.hide_dropdown(); }.bind(this));

	if (map instanceof Map) {
	    this.map = map;

	    // set up the reaction direction arrow
	    var default_angle = 90; // degrees
	    this.direction_arrow = new DirectionArrow(map.sel);
	    this.direction_arrow.set_rotation(default_angle);

	    this.setup_map_callbacks(map);
	} else {
	    console.error('Cannot set the map. It is not an instance of builder/Map');
	}
	if (zoom_container instanceof ZoomContainer) {
	    this.zoom_container = zoom_container;
	    this.setup_zoom_callbacks();
	} else {
	    console.error('Cannot set the zoom_container. It is not an instance of ' +
			  'builder/ZoomContainer');
	}

	// set up reaction input callbacks
	this.callback_manager = new CallbackManager();

	// toggle off
	this.toggle(false);
	this.target_coords = null;
    }
    function setup_map_callbacks(map) {
	// input
	map.callback_manager.set('select_metabolite_with_id.input', function(selected_node, coords) {
	    if (this.is_active) this.reload(selected_node, coords, false);
	    this.hide_target();
	}.bind(this));
	map.callback_manager.set('select_metabolite.input', function(count, selected_node, coords) {
	    this.hide_target();
	    if (count == 1 && this.is_active && coords) {
		this.reload(selected_node, coords, false);
	    } else {
		this.toggle(false);
	    }
	}.bind(this));

	// svg export
	map.callback_manager.set('before_svg_export', function() {
	    this.direction_arrow.hide();
	    this.hide_target();
	}.bind(this));
    }
    function setup_zoom_callbacks() {
	this.zoom_container.callback_manager.set('zoom.input', function() {
	    if (this.is_active) {
		this.place_at_selected();
	    }
	}.bind(this));
    }
    function is_visible() {
	return this.selection.style('display') != 'none';
    }
    function toggle(on_off) {
	if (on_off===undefined) this.is_active = !this.is_active;
	else this.is_active = on_off;
	if (this.is_active) {
	    this.toggle_start_reaction_listener(true);
	    if (this.target_coords!==null) this.show_dropdown(this.target_coords);
	    else this.reload_at_selected();
	    this.map.set_status('Click on the canvas or an existing metabolite');
	    this.direction_arrow.show();
	    // escape key
	    this.escape = this.map.key_manager
		.add_escape_listener(function() { this.hide_dropdown(); }.bind(this));
	} else {
	    this.toggle_start_reaction_listener(false);
	    this.selection.style("display", "none");
            this.completely.input.blur();
            this.completely.hideDropDown();
	    this.map.set_status(null);
	    this.direction_arrow.hide();
	    if (this.escape)
		this.escape.clear();
	    this.escape = null;
	}
    }
    function show_dropdown(coords) {
	this.selection.style("display", "block");
        this.completely.input.blur();
	this.completely.repaint();
	this.completely.setText("");
        this.completely.input.focus();
    }
    function hide_dropdown() {
	this.selection.style("display", "none");
        this.completely.hideDropDown();
    }
    function place_at_selected() {
        /** Place autocomplete box at the first selected node.
	 
         */

	// get the selected node
	this.map.deselect_text_labels();
	var selected_node = this.map.select_single_node();
	if (selected_node==null) return;
	var coords = { x: selected_node.x, y: selected_node.y };
	this.place(coords);
    }
    function place(coords) {
	var d = {x: 240, y: 0},
	    window_translate = this.map.zoom_container.window_translate,
	    window_scale = this.map.zoom_container.window_scale,
	    map_size = this.map.get_size();
        var left = Math.max(20,
			    Math.min(map_size.width - 270,
				     (window_scale * coords.x + window_translate.x - d.x)));
        var top = Math.max(20,
			   Math.min(map_size.height - 40,
				    (window_scale * coords.y + window_translate.y - d.y)));
        this.selection.style('position', 'absolute')
            .style('display', 'block')
            .style('left',left+'px')
            .style('top',top+'px');

	this.direction_arrow.set_location(coords);
	this.direction_arrow.show();
    }

    function reload_at_selected() {
        /** Reload data for autocomplete box and redraw box at the first
	 selected node.
	 
         */
	// get the selected node
	this.map.deselect_text_labels();
	var selected_node = this.map.select_single_node();
	if (selected_node==null) return false;
	var coords = { x: selected_node.x, y: selected_node.y };
	// reload the reaction input
	this.reload(selected_node, coords, false);
	return true;
    }
    function reload(selected_node, coords, starting_from_scratch) {
        /** Reload data for autocomplete box and redraw box at the new
         coordinates.
	 
         */

	if (selected_node===undefined && !starting_from_scratch)
	    console.error('No selected node, and not starting from scratch');

	this.place(coords);

        // blur
        this.completely.input.blur();
        this.completely.repaint(); //put in place()?

	if (this.map.cobra_model===null) {
	    this.completely.setText('Cannot add: No model.');
	    return;
	}

        // Find selected reaction
        var suggestions = [],
	    cobra_reactions = this.map.cobra_model.reactions,
	    cobra_metabolites = this.map.cobra_model.metabolites,
	    reactions = this.map.reactions,
	    has_reaction_data = this.map.has_reaction_data(),
	    reaction_data = this.map.reaction_data,
	    reaction_data_styles = this.map.reaction_data_styles;
        for (var reaction_id in cobra_reactions) {
            var reaction = cobra_reactions[reaction_id];

            // ignore drawn reactions
            if (already_drawn(reaction_id, reactions)) continue;

	    // check segments for match to selected metabolite
	    for (var metabolite_id in reaction.metabolites) {

		// if starting with a selected metabolite, check for that id
		if (starting_from_scratch || metabolite_id==selected_node.bigg_id) {
		    // don't add suggestions twice
		    if (reaction_id in suggestions) continue;
		    if (has_reaction_data) {
			suggestions[reaction_id] = { reaction_data: reaction.data,
						     string: (reaction_id + ': ' +
							      reaction.data_string) };
		    } else {
	    		suggestions[reaction_id] = { string: reaction_id };
		    }
		}
	    }
        }

        // Generate the array of reactions to suggest and sort it
	var strings_to_display = [],
	    suggestions_array = utils.make_array(suggestions, 'reaction_abbreviation');
	if (has_reaction_data) {
	    suggestions_array.sort(function(x, y) {
		return Math.abs(y.reaction_data) - Math.abs(x.reaction_data);
	    });
	} else {
	    suggestions_array.sort(function(x, y) {
		return (x.string.toLowerCase() < y.string.toLowerCase() ? -1 : 1);
	    });
	}
	suggestions_array.forEach(function(x) {
	    strings_to_display.push(x.string);
	});

        // set up the box with data, searching for first num results
        var num = 20,
            complete = this.completely;
        complete.options = strings_to_display;
        if (strings_to_display.length==1) complete.setText(strings_to_display[0]);
        else complete.setText("");
	complete.onChange = function(txt) {
	    if (txt.length==0) {
		complete.options = strings_to_display;
		complete.repaint();
		return;
	    }
	    var v = strings_to_display.map(function(x) {
		if (x.toLowerCase().indexOf(txt.toLowerCase())==0)
		    return txt+x.slice(txt.length);
		else return null;
	    }).filter(function(x) { return x!==null; });
	    complete.options = v;
	    complete.repaint();
	};
	var direction_arrow = this.direction_arrow,
	    map = this.map;
        complete.onEnter = function() {
	    var text = this.getText();
	    this.setText("");
	    suggestions_array.forEach(function(x) {
		if (x.string.toLowerCase()==text.toLowerCase()) {
		    if (starting_from_scratch) {
			map.new_reaction_from_scratch(x.reaction_abbreviation,
							   coords,
							   direction_arrow.get_rotation());
		    } else {
			map.new_reaction_for_metabolite(x.reaction_abbreviation,
							     selected_node.node_id,
							     direction_arrow.get_rotation());
		    }
		}
	    });
        };
        complete.repaint();
        this.completely.input.focus();

	//definitions
	function already_drawn(bigg_id, reactions) {
            for (var drawn_id in reactions) {
		if (reactions[drawn_id].bigg_id==bigg_id) 
		    return true;
	    }
            return false;
	};
    }
    function toggle_start_reaction_listener(on_off) {
	/** Toggle listening for a click to place a new reaction on the canvas.

	 */
        if (on_off===undefined)
            this.start_reaction_listener = !this.start_reaction_listener;
        else if (this.start_reaction_listener==on_off)
            return;
        else
            this.start_reaction_listener = on_off;
        
        if (this.start_reaction_listener) {;
            this.map.sel.on('click.start_reaction', function(node) {
		// TODO fix this hack
		if (this.direction_arrow.dragging) return;
                // reload the reaction input
                var coords = { x: d3.mouse(node)[0],
			       y: d3.mouse(node)[1] };
                // unselect metabolites
		this.map.deselect_nodes();
		this.map.deselect_text_labels();
		// reload the reaction input
                this.reload(null, coords, true);
		// generate the target symbol
		this.show_target(this.map, coords);
            }.bind(this, this.map.sel.node()));
            this.map.sel.classed('start-reaction-cursor', true);
        } else {
            this.map.sel.on('click.start_reaction', null);
            this.map.sel.classed('start-reaction-cursor', false);
	    this.hide_target();
        }
    }

    function hide_target() {
	if (this.target_coords)
	    this.map.sel.selectAll('.start-reaction-target').remove();
	this.target_coords = null;
    }
    function show_target(map, coords) {
        var s = map.sel.selectAll('.start-reaction-target').data([12, 5]);
        s.enter().append('circle')
            .classed('start-reaction-target', true)
            .attr('r', function(d) { return d; })
            .style('stroke-width', 4);
        s.style('visibility', 'visible')
            .attr('transform', 'translate('+coords.x+','+coords.y+')');
	this.target_coords = coords;
    }
});
