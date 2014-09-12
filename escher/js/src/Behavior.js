define(["utils", "build"], function(utils, build) {
    /** Defines the set of click and drag behaviors for the map, and keeps track
     of which behaviors are activated.

     Has the following attributes:

     Behavior.node_click
     Behavior.node_drag
     Behavior.bezier_drag
     Behavior.label_drag
     */

    var Behavior = utils.make_class();
    Behavior.prototype = { init: init,
			   toggle_rotation_mode: toggle_rotation_mode,
			   turn_everything_on: turn_everything_on,
			   turn_everything_off: turn_everything_off,
			   toggle_node_click: toggle_node_click,
			   toggle_node_drag: toggle_node_drag,
			   toggle_text_label_click: toggle_text_label_click,
			   toggle_label_drag: toggle_label_drag,
			   get_node_drag: get_node_drag,
			   get_bezier_drag: get_bezier_drag,
			   get_reaction_label_drag: get_reaction_label_drag,
			   get_node_label_drag: get_node_label_drag,
			   get_text_label_drag: get_text_label_drag,
			   get_generic_drag: get_generic_drag };

    return Behavior;

    // definitions
    function init(map, undo_stack) {
	this.map = map;
	this.undo_stack = undo_stack;

	// make an empty function that can be called as a behavior and does nothing
	this.empty_behavior = function() {};

	// rotation mode operates separately from the rest
	this.rotation_mode_enabled = false;
	this.rotation_drag = d3.behavior.drag();

	// init empty
	this.node_click = null;
	this.node_mouseover = null;
	this.node_mouseout = null;
	this.node_drag = this.empty_behavior;
	this.bezier_drag = this.empty_behavior;
	this.reaction_label_drag = this.empty_behavior;
	this.node_label_drag = this.empty_behavior;
	this.text_label_click = null;
	this.text_label_drag = this.empty_behavior;
	this.turn_everything_on();
    }
    function turn_everything_on() {
	/** Toggle everything except rotation mode.

	 */
	this.toggle_node_click(true);
	this.toggle_node_drag(true);
	this.toggle_text_label_click(true);
	this.toggle_label_drag(true);
    }
    function turn_everything_off() {
	/** Toggle everything except rotation mode.

	 */
	this.toggle_node_click(false);
	this.toggle_node_drag(false);
	this.toggle_text_label_click(false);
	this.toggle_label_drag(false);
    }

    function toggle_rotation_mode(on_off) {
	/** Listen for rotation, and rotate selected nodes.

	 */
	if (on_off===undefined) {
	    this.rotation_mode_enabled = !this.rotation_mode_enabled;
	} else {
	    this.rotation_mode_enabled = on_off;
	}

	var selection_node = this.map.sel.selectAll('.node-circle'),
	    selection_background = this.map.sel.selectAll('#canvas');

	if (this.rotation_mode_enabled) {
	    this.map.callback_manager.run('start_rotation');
	    
	    var selected_nodes = this.map.get_selected_nodes();
	    if (Object.keys(selected_nodes).length == 0) {
		console.log('No selected nodes');
		return;
	    }
	    
	    // show center
	    this.center = average_location(selected_nodes);
	    show_center.call(this);

	    // this.set_status('Drag to rotate.');
	    var map = this.map,
		selected_node_ids = Object.keys(selected_nodes),
		reactions = this.map.reactions,
		nodes = this.map.nodes;

	    var start_fn = function(d) {
		// silence other listeners
		d3.event.sourceEvent.stopPropagation();
	    },
		drag_fn = function(d, displacement, total_displacement, location) {
		    var angle = utils.angle_for_event(displacement,
						location,
						this.center);
		    var updated = build.rotate_nodes(selected_nodes, reactions,
						     angle, this.center);
		    map.draw_these_nodes(updated.node_ids);
		    map.draw_these_reactions(updated.reaction_ids);
		}.bind(this),
		end_fn = function(d) {},
		undo_fn = function(d, displacement, location) {
		    // undo
		    var total_angle = utils.angle_for_event(displacement,
						      location,
						      this.center);

		    var these_nodes = {};
		    selected_node_ids.forEach(function(id) { these_nodes[id] = nodes[id]; });
		    var updated = build.rotate_nodes(these_nodes, reactions,
						     -total_angle, utils.clone(this.center));
		    map.draw_these_nodes(updated.node_ids);
		    map.draw_these_reactions(updated.reaction_ids);
		}.bind(this),
		redo_fn = function(d, displacement, location) {
		    // redo
		    var total_angle = utils.angle_for_event(displacement,
						      location,
						      this.center),
			these_nodes = {};
		    selected_node_ids.forEach(function(id) { these_nodes[id] = nodes[id]; });
		    var updated = build.rotate_nodes(these_nodes, reactions,
						     total_angle, utils.clone(this.center));
		    map.draw_these_nodes(updated.node_ids);
		    map.draw_these_reactions(updated.reaction_ids);
		}.bind(this);
	    this.rotation_drag = this.get_generic_drag(start_fn, drag_fn, end_fn,
						       undo_fn, redo_fn, this.map.sel);
	    selection_background.call(this.rotation_drag);


	} else {
	    // turn off all listeners
	    hide_center.call(this);
	    selection_node.on('mousedown.center', null);
	    selection_background.on('mousedown.center', null);
	    selection_background.on('mousedown.drag', null);
	    selection_background.on('touchstart.drag', null);
	    this.rotation_drag = null;
	}

	// definitions
	function show_center() {
	    var s = this.map.sel.selectAll('#rotation-center')
		    .data([0]),
		enter = s.enter()
		    .append('g').attr('id', 'rotation-center');
	    
	    enter.append('path').attr('d', 'M-22 0 L22 0')
		.attr('class', 'rotation-center-line');
	    enter.append('path').attr('d', 'M0 -22 L0 22')
		.attr('class', 'rotation-center-line');

	    s.attr('transform', 'translate('+this.center.x+','+this.center.y+')')
		.attr('visibility', 'visible');

	    s.call(d3.behavior.drag()
		   .on('drag', function(sel) {
		       var cur = d3.transform(sel.attr('transform')),
			   new_loc = [d3.event.dx + cur.translate[0],
				      d3.event.dy + cur.translate[1]];
		       sel.attr('transform', 'translate('+new_loc+')');
		       this.center = { x: new_loc[0], y: new_loc[1] };
		   }.bind(this, s)));
	    s.on('mouseover', function() {
		var current = parseFloat(this.selectAll('path').style('stroke-width'));
		this.selectAll('path').style('stroke-width', current*2+'px');
	    }.bind(s));
	    s.on('mouseout', function() {
		this.selectAll('path').style('stroke-width', null);
	    }.bind(s));
	}
	function hide_center(sel) {
	    this.map.sel.select('#rotation-center')
		.attr('visibility', 'hidden');
	}
	function average_location(nodes) {
	    var xs = [], ys = [];
	    for (var node_id in nodes) {
		var node = nodes[node_id];
		if (node.x !== undefined)
		    xs.push(node.x);
		if (node.y !== undefined)
		    ys.push(node.y);
	    }
	    return { x: utils.mean(xs),
		     y: utils.mean(ys) };
	}	
    }

    function toggle_node_click(on_off) {
	/** With no argument, toggle the node click on or off.

	 Pass in a boolean argument to set the on/off state.

	 */
	if (on_off===undefined) on_off = this.node_click==null;
	if (on_off) {
	    var map = this.map;
	    this.node_click = function(d) {
		map.select_metabolite(this, d);
		d3.event.stopPropagation();
	    };
	    this.node_mouseover = function(d) {	   
		d3.select(this).style('stroke-width', null);
		var current = parseFloat(d3.select(this).style('stroke-width'));
		d3.select(this).style('stroke-width', current*2+'px');
	    };
	    this.node_mouseout = function(d) {
		d3.select(this).style('stroke-width', null);
	    };
	} else {
	    this.node_click = null;
	    this.node_mouseover = null;
	    this.node_mouseout = null;
	    this.map.sel.select('#nodes')
		.selectAll('.node-circle').style('stroke-width', null);
	}
    }
    function toggle_text_label_click(on_off) {
	/** With no argument, toggle the node click on or off.

	 Pass in a boolean argument to set the on/off state.

	 */
	if (on_off===undefined) on_off = this.text_label_click==null;
	if (on_off) {
	    var map = this.map;
	    this.text_label_click = function(d) {
		map.select_text_label(this, d);
		d3.event.stopPropagation();
	    };
	} else {
	    this.text_label_click = null;
	}
    }
    function toggle_node_drag(on_off) {
	/** With no argument, toggle the node drag & bezier drag on or off.

	 Pass in a boolean argument to set the on/off state.

	 */
	if (on_off===undefined) on_off = this.node_drag===this.empty_behavior;
	if (on_off) {
	    this.node_drag = this.get_node_drag(this.map, this.undo_stack);
	    this.bezier_drag = this.get_bezier_drag(this.map, this.undo_stack);
	} else {
	    this.node_drag = this.empty_behavior;
	    this.bezier_drag = this.empty_behavior;
	}
    }
    function toggle_label_drag(on_off) {
	/** With no argument, toggle the label drag on or off.

	 Pass in a boolean argument to set the on/off state.

	 */
	if (on_off===undefined) on_off = this.label_drag===this.empty_behavior;
	if (on_off) {
	    this.reaction_label_drag = this.get_reaction_label_drag(this.map);
	    this.node_label_drag = this.get_node_label_drag(this.map);
	    this.text_label_drag = this.get_text_label_drag(this.map);
	} else {
	    this.reaction_label_drag = this.empty_behavior;
	    this.node_label_drag = this.empty_behavior;
	    this.text_label_drag = this.empty_behavior;
	}
    }

    function get_node_drag(map, undo_stack) {
	// define some variables
	var behavior = d3.behavior.drag(),
	    total_displacement = null,
	    nodes_to_drag = null,
	    reaction_ids = null,
	    the_timeout = null;

        behavior.on("dragstart", function () { 
	    // Note that dragstart is called even for a click event
	    var data = this.parentNode.__data__,
		bigg_id = data.bigg_id,
		node_group = this.parentNode;
	    // silence other listeners
	    d3.event.sourceEvent.stopPropagation();
	    // remember the total displacement for later
	    total_displacement = {};
	    // Move element to back (for the next step to work). Wait 200ms
	    // before making the move, becuase otherwise the element will be
	    // deleted before the click event gets called, and selection
	    // will stop working.
	    the_timeout = window.setTimeout(function() {
		node_group.parentNode.insertBefore(node_group,node_group.parentNode.firstChild);
	    }, 200);
	    // prepare to combine metabolites
	    map.sel.selectAll('.metabolite-circle')
		.on('mouseover.combine', function(d) {
		    if (d.bigg_id==bigg_id && d.node_id!=data.node_id) {
			d3.select(this).style('stroke-width', String(12)+'px')
			    .classed('node-to-combine', true);
		    }
		}).on('mouseout.combine', function(d) {
		    if (d.bigg_id==bigg_id) {
			map.sel.selectAll('.node-to-combine').style('stroke-width', String(2)+'px')
			    .classed('node-to-combine', false);
		    }
		});
	});
        behavior.on("drag", function() {
	    var grabbed_id = this.parentNode.__data__.node_id, 
		selected_ids = map.get_selected_node_ids();
	    nodes_to_drag = [];
	    // choose the nodes to drag
	    if (selected_ids.indexOf(grabbed_id)==-1) { 
		nodes_to_drag.push(grabbed_id);
	    } else {
		nodes_to_drag = selected_ids;
	    }
	    reaction_ids = [];
	    nodes_to_drag.forEach(function(node_id) {
		// update data
		var node = map.nodes[node_id],
		    displacement = { x: d3.event.dx,
				     y: d3.event.dy },
		    updated = build.move_node_and_dependents(node, node_id, map.reactions, displacement);
		reaction_ids = utils.unique_concat([reaction_ids, updated.reaction_ids]);
		// remember the displacements
		if (!(node_id in total_displacement))  total_displacement[node_id] = { x: 0, y: 0 };
		total_displacement[node_id] = utils.c_plus_c(total_displacement[node_id], displacement);
	    });
	    // draw
	    map.draw_these_nodes(nodes_to_drag);
	    map.draw_these_reactions(reaction_ids);
	});
	behavior.on("dragend", function() {
	    if (nodes_to_drag===null) {
		// Dragend can be called when drag has not been called. In this,
		// case, do nothing.
		total_displacement = null;
		nodes_to_drag = null;
		reaction_ids = null;
		the_timeout = null;
		return;
	    }
	    // look for mets to combine
	    var node_to_combine_array = [];
	    map.sel.selectAll('.node-to-combine').each(function(d) {
		node_to_combine_array.push(d.node_id);
	    });
	    if (node_to_combine_array.length==1) {
		// If a node is ready for it, combine nodes
		var fixed_node_id = node_to_combine_array[0],
		    dragged_node_id = this.parentNode.__data__.node_id,
		    saved_dragged_node = utils.clone(map.nodes[dragged_node_id]),
		    segment_objs_moved_to_combine = combine_nodes_and_draw(fixed_node_id,
									   dragged_node_id);
		undo_stack.push(function() {
		    // undo
		    // put the old node back
		    map.nodes[dragged_node_id] = saved_dragged_node;
		    var fixed_node = map.nodes[fixed_node_id],
			updated_reactions = [];
		    segment_objs_moved_to_combine.forEach(function(segment_obj) {
			var segment = map.reactions[segment_obj.reaction_id].segments[segment_obj.segment_id];
			if (segment.from_node_id==fixed_node_id) {
			    segment.from_node_id = dragged_node_id;
			} else if (segment.to_node_id==fixed_node_id) {
			    segment.to_node_id = dragged_node_id;
			} else {
			    console.error('Segment does not connect to fixed node');
			}
			// removed this segment_obj from the fixed node
			fixed_node.connected_segments = fixed_node.connected_segments.filter(function(x) {
			    return !(x.reaction_id==segment_obj.reaction_id && x.segment_id==segment_obj.segment_id);
			});
			if (updated_reactions.indexOf(segment_obj.reaction_id)==-1)
			    updated_reactions.push(segment_obj.reaction_id);
		    });
		    map.draw_these_nodes([dragged_node_id]);
		    map.draw_these_reactions(updated_reactions);
		}, function () {
		    // redo
		    combine_nodes_and_draw(fixed_node_id, dragged_node_id);
		});

	    } else {
		// otherwise, drag node
		
		// add to undo/redo stack
		// remember the displacement, dragged nodes, and reactions
		var saved_displacement = utils.clone(total_displacement), 
		    // BUG TODO this variable disappears!
		    // Happens sometimes when you drag a node, then delete it, then undo twice
		    saved_node_ids = utils.clone(nodes_to_drag),
		    saved_reaction_ids = utils.clone(reaction_ids);
		undo_stack.push(function() {
		    // undo
		    saved_node_ids.forEach(function(node_id) {
			var node = map.nodes[node_id];
			build.move_node_and_dependents(node, node_id, map.reactions,
						       utils.c_times_scalar(saved_displacement[node_id], -1));
		    });
		    map.draw_these_nodes(saved_node_ids);
		    map.draw_these_reactions(saved_reaction_ids);
		}, function () {
		    // redo
		    saved_node_ids.forEach(function(node_id) {
			var node = map.nodes[node_id];
			build.move_node_and_dependents(node, node_id, map.reactions,
						       saved_displacement[node_id]);
		    });
		    map.draw_these_nodes(saved_node_ids);
		    map.draw_these_reactions(saved_reaction_ids);
		});
	    }

	    // stop combining metabolites
	    map.sel.selectAll('.metabolite-circle')
		.on('mouseover.combine', null)
		.on('mouseout.combine', null);

	    // clear the timeout
	    window.clearTimeout(the_timeout);

	    // clear the shared variables
	    total_displacement = null;
	    nodes_to_drag = null;
	    reaction_ids = null;
	    the_timeout = null;
	});
	return behavior;

	// definitions
	function combine_nodes_and_draw(fixed_node_id, dragged_node_id) {
	    var dragged_node = map.nodes[dragged_node_id],
		fixed_node = map.nodes[fixed_node_id],
		updated_segment_objs = [];
	    dragged_node.connected_segments.forEach(function(segment_obj) {
		// change the segments to reflect
		var segment = map.reactions[segment_obj.reaction_id].segments[segment_obj.segment_id];
		if (segment.from_node_id==dragged_node_id) segment.from_node_id = fixed_node_id;
		else if (segment.to_node_id==dragged_node_id) segment.to_node_id = fixed_node_id;
		else return console.error('Segment does not connect to dragged node');
		// moved segment_obj to fixed_node
		fixed_node.connected_segments.push(segment_obj);
		updated_segment_objs.push(utils.clone(segment_obj));
		return null;
	    });
	    // delete the old node
	    map.delete_node_data([dragged_node_id]);
	    // turn off the class
	    map.sel.selectAll('.node-to-combine').classed('node-to-combine', false);
	    // draw
	    map.draw_everything();
	    // return for undo
	    return updated_segment_objs;
	}
    }
    function get_bezier_drag(map) {
	var move_bezier = function(reaction_id, segment_id, bezier, displacement) {
	    var segment = map.reactions[reaction_id].segments[segment_id];
	    segment['b'+bezier] = utils.c_plus_c(segment['b'+bezier], displacement);
	},
	    start_fn = function(d) {
	    },
	    drag_fn = function(d, displacement, total_displacement) {
		// draw
		move_bezier(d.reaction_id, d.segment_id, d.bezier, displacement);
		map.draw_these_reactions([d.reaction_id]);
	    },
	    end_fn = function(d) {
	    },
	    undo_fn = function(d, displacement) {
		move_bezier(d.reaction_id, d.segment_id, d.bezier,
			    utils.c_times_scalar(displacement, -1));
		map.draw_these_reactions([d.reaction_id]);
	    },
	    redo_fn = function(d, displacement) {
		move_bezier(d.reaction_id, d.segment_id, d.bezier, displacement);
		map.draw_these_reactions([d.reaction_id]);
	    };
	return this.get_generic_drag(start_fn, drag_fn, end_fn, undo_fn,
				     redo_fn, this.map.sel);
    }
    function get_reaction_label_drag(map) {
	var move_label = function(reaction_id, displacement) {
	    var reaction = map.reactions[reaction_id];
	    reaction.label_x = reaction.label_x + displacement.x;
	    reaction.label_y = reaction.label_y + displacement.y;
	},
	    start_fn = function(d) {
	    },
	    drag_fn = function(d, displacement, total_displacement) {
		// draw
		move_label(d.reaction_id, displacement);
		map.draw_these_reactions([d.reaction_id]);
	    },
	    end_fn = function(d) {
	    },
	    undo_fn = function(d, displacement) {
		move_label(d.reaction_id, utils.c_times_scalar(displacement, -1));
		map.draw_these_reactions([d.reaction_id]);
	    },
	    redo_fn = function(d, displacement) {
		move_label(d.reaction_id, displacement);
		map.draw_these_reactions([d.reaction_id]);
	    };
	return this.get_generic_drag(start_fn, drag_fn, end_fn, undo_fn,
				     redo_fn, this.map.sel);
    }
    function get_node_label_drag(map) {
	var move_label = function(node_id, displacement) {
	    var node = map.nodes[node_id];
	    node.label_x = node.label_x + displacement.x;
	    node.label_y = node.label_y + displacement.y;
	},
	    start_fn = function(d) {
	    },
	    drag_fn = function(d, displacement, total_displacement) {
		// draw
		move_label(d.node_id, displacement);
		map.draw_these_nodes([d.node_id]);
	    },
	    end_fn = function(d) {
	    },
	    undo_fn = function(d, displacement) {
		move_label(d.node_id, utils.c_times_scalar(displacement, -1));
		map.draw_these_nodes([d.node_id]);
	    },
	    redo_fn = function(d, displacement) {
		move_label(d.node_id, displacement);
		map.draw_these_nodes([d.node_id]);
	    };
	return this.get_generic_drag(start_fn, drag_fn, end_fn, undo_fn,
				     redo_fn, this.map.sel);
    }
    function get_text_label_drag(map) {
	var move_label = function(text_label_id, displacement) {
	    var text_label = map.text_labels[text_label_id];
	    text_label.x = text_label.x + displacement.x;
	    text_label.y = text_label.y + displacement.y;
	},
	    start_fn = function(d) {
	    },
	    drag_fn = function(d, displacement, total_displacement) {
		// draw
		move_label(d.text_label_id, displacement);
		map.draw_these_text_labels([d.text_label_id]);
	    },
	    end_fn = function(d) {
	    },
	    undo_fn = function(d, displacement) {
		move_label(d.text_label_id, utils.c_times_scalar(displacement, -1));
		map.draw_these_text_labels([d.text_label_id]);
	    },
	    redo_fn = function(d, displacement) {
		move_label(d.text_label_id, displacement);
		map.draw_these_text_labels([d.text_label_id]);
	    };
	return this.get_generic_drag(start_fn, drag_fn, end_fn, undo_fn,
				     redo_fn, this.map.sel);
    }
    function get_generic_drag(start_fn, drag_fn, end_fn, undo_fn, redo_fn, relative_to_selection) {
	/** Make a generic drag behavior, with undo/redo.

	 start_fn: function(d) Called at dragstart.

	 drag_fn: function(d, displacement, total_displacement) Called during
	 drag.

	 end_fn

	 undo_fn

	 redo_fn

	 relative_to_selection: a d3 selection that the locations are calculated against.

	 */
	
	// define some variables
	var behavior = d3.behavior.drag(),
	    total_displacement,
	    undo_stack = this.undo_stack,
	    rel = relative_to_selection.node();

        behavior.on("dragstart", function (d) {
	    // silence other listeners
	    d3.event.sourceEvent.stopPropagation();
	    total_displacement = { x: 0, y: 0 };
	    start_fn(d);
	});
        behavior.on("drag", function(d) {
	    // update data
	    var displacement = { x: d3.event.dx,
				 y: d3.event.dy },
		location = { x: d3.mouse(rel)[0],
			     y: d3.mouse(rel)[1] };

	    // remember the displacement
	    total_displacement = utils.c_plus_c(total_displacement, displacement);
	    drag_fn(d, displacement, total_displacement, location);
	});
	behavior.on("dragend", function(d) {			  
	    // add to undo/redo stack
	    // remember the displacement, dragged nodes, and reactions
	    var saved_d = utils.clone(d),
		saved_displacement = utils.clone(total_displacement), // BUG TODO this variable disappears!
		saved_location = { x: d3.mouse(rel)[0],
				   y: d3.mouse(rel)[1] };

	    undo_stack.push(function() {
		// undo
		undo_fn(saved_d, saved_displacement, saved_location);
	    }, function () {
		// redo
		redo_fn(saved_d, saved_displacement, saved_location);
	    });
	    end_fn(d);
	});
	return behavior;
    }
});
