define(['utils', 'data_styles', 'CallbackManager'], function(utils, data_styles, CallbackManager) {
    /** Manages creating, updating, and removing objects during d3 data binding.

     Arguments
     ---------

     behavior: An escher.Behavior object.

     settings: An escher.Settings object.

     Callbacks
     ---------

     draw.callback_manager.run('create_membrane', draw, enter_selection);
     draw.callback_manager.run('update_membrane', draw, update_selection);
     draw.callback_manager.run('create_reaction', draw, enter_selection);
     draw.callback_manager.run('update_reaction', draw, update_selection);
     draw.callback_manager.run('create_reaction_label', draw, enter_selection);
     draw.callback_manager.run('update_reaction_label', draw, update_selection);
     draw.callback_manager.run('create_segment', draw, enter_selection);
     draw.callback_manager.run('update_segment', draw, update_selection);
     draw.callback_manager.run('create_bezier', draw, enter_selection);
     draw.callback_manager.run('update_bezier', draw, update_selection);
     draw.callback_manager.run('create_node', draw, enter_selection);
     draw.callback_manager.run('update_node', draw, update_selection);
     draw.callback_manager.run('create_text_label', draw, enter_selection);
     draw.callback_manager.run('update_text_label', draw, update_selection);

     */

    var Draw = utils.make_class();
    
    // instance methods
    Draw.prototype = { init: init,
                       create_reaction: create_reaction,
                       update_reaction: update_reaction,
                       create_bezier: create_bezier,
                       update_bezier: update_bezier,
                       create_node: create_node,
                       update_node: update_node,
                       create_text_label: create_text_label,
                       update_text_label: update_text_label,
                       create_membrane: create_membrane,
                       update_membrane: update_membrane,
                       create_reaction_label: create_reaction_label,
                       update_reaction_label: update_reaction_label,
                       create_segment: create_segment,
                       update_segment: update_segment
                       
                     };

    return Draw;

    // definitions
    function init(behavior, settings) {
        this.behavior = behavior;
        this.settings = settings;
        this.callback_manager = new CallbackManager();
    }
    
    function create_membrane(enter_selection) {
        utils.check_undefined(arguments, ['enter_selection']);
        enter_selection.append('rect')
            .attr('class', 'membrane');
        this.callback_manager.run('create_membrane', this, enter_selection);
    }

    function update_membrane(update_selection) {
        utils.check_undefined(arguments, ['enter_selection']);
        update_selection
            .attr('width', function(d){ return d.width; })
            .attr('height', function(d){ return d.height; })
            .attr('transform', function(d){return 'translate('+d.x+','+d.y+')';})
            .style('stroke-width', function(d) { return 10; })
            .attr('rx', function(d){ return 20; })
            .attr('ry', function(d){ return 20; });
        
        this.callback_manager.run('update_membrane', this, update_selection);
    }

    function create_reaction(enter_selection) {
        utils.check_undefined(arguments, ['enter_selection']);
        // attributes for new reaction group

        var t = enter_selection.append('g')
                .attr('id', function(d) { return 'r'+d.reaction_id; })
                .attr('class', 'reaction')
                .call(this.create_reaction_label.bind(this));
        
        this.callback_manager.run('create_reaction', this, enter_selection);
        return;
    }

    function update_reaction(update_selection, scale, cobra_model, drawn_nodes,
                             defs, has_data_on_reactions, identifiers_on_map,
                             no_data_style, missing_component_color,
                             reaction_data_styles, 
                             label_drag_behavior,
                             label_click_fn, label_mouseover_fn, label_mouseout_fn) {
        utils.check_undefined(arguments,
                              ['update_selection', 'scale',
                               'cobra_model',
                               'drawn_nodes', 
                               'defs',
                               'has_data_on_reactions',
                               'identifiers_on_map',
                               'no_data_style',
                               'missing_component_color',
                               'reaction_data_styles',
                               'label_drag_behavior',
                               'label_click_fn',
                               'label_mouseover_fn',
                               'label_mouseout_fn']);

        // update reaction label
        update_selection.select('.reaction-label-group')
            .call(function(sel) {
                return this.update_reaction_label(sel, has_data_on_reactions,
                                                  identifiers_on_map, reaction_data_styles,
                                                  label_drag_behavior, label_click_fn,
                                                  label_mouseover_fn, label_mouseout_fn);
            }.bind(this));

        // draw segments
        utils.draw_a_nested_object(update_selection, '.segment-group', 'segments', 'segment_id',
                                   this.create_segment.bind(this),
                                   function(sel) { 
                                       return this.update_segment(sel, scale, cobra_model,
                                                                  drawn_nodes, defs, 
                                                                  has_data_on_reactions,
                                                                  no_data_style, missing_component_color,
                                                                  reaction_data_styles);
                                   }.bind(this),
                                   function(sel) {
                                       sel.remove();
                                   });

        // new connect lines
        // var lines = sel
        //      .selectAll('.connect-line')
        //      .data(function(d) {
        //          var reaction_label_line, node,
        //              reaction_d = this.parentNode.parentNode.parentNode.__data__;
        //          // node = (d.bezier==1 ? 
        //          //      drawn_nodes[segment_d.from_node_id] : 
        //          //      drawn_nodes[segment_d.to_node_id]);
        //          reaction_label_line = { x: d.x,
        //                                  y: d.y,
        //                                  source_x: node.x,
        //                                  source_y: node.y};
        //          return [reaction_label_line];
        //      });
        // lines.enter().call(function(sel) {
        //     return create_reaction_label_line(sel);
        // });
        // // update reaction_label lines
        // lines.call(function(sel) { return update_reaction_label_line(sel); });
        // // remove
        // lines.exit().remove();

        // // definitions
        // function create_reaction_label_line(enter_selection) {
        //     enter_selection.append('path')
        //      .attr('class', function(d) { return 'connect-line'; })
        //      .attr('visibility', 'hidden');
        // }
        // function update_reaction_label_line(update_selection) {
        //     update_selection
        //      .attr('d', function(d) {
        //          if (d.x==null || d.y==null || d.source_x==null || d.source_y==null)
        //              return '';
        //          return 'M0, 0 '+(d.source_x-d.x)+','+(d.source_y-d.y);
        //      });
        // }

        this.callback_manager.run('update_reaction', this, update_selection);
    }

    function create_reaction_label(enter_selection) {
        /** Draw reaction label for selection.

         */
        
        var group = enter_selection.append('g')
                .attr('class', 'reaction-label-group');
        group.append('text')
            .attr('class', 'reaction-label label');
        group.append('g')
            .attr('class', 'gene-label-group');
        // .on('mouseover', function(d) {
        //  d3.select(this).style('stroke-width', String(3)+'px');
        //  d3.select(this.parentNode)
        //      .selectAll('.connect-line')
        //      .attr('visibility', 'visible');
        // })
        // .on('mouseout', function(d) {
        //  d3.select(this).style('stroke-width', String(1)+'px');
        //  d3.select(this.parentNode)
        //      .selectAll('.connect-line')
        //      .attr('visibility', 'hidden');
        // });

        this.callback_manager.run('create_reaction_label', this, enter_selection);
    }

    function update_reaction_label(update_selection, has_data_on_reactions,
                                   identifiers_on_map, reaction_data_styles,
                                   label_drag_behavior,
                                   label_click_fn, label_mouseover_fn,
                                   label_mouseout_fn) {        
        var decimal_format = d3.format('.4g'),
            conv = {'left': 'start', 'center': 'middle', 'right': 'end'};
        update_selection.attr('transform', function(d) {
            return 'translate('+d.label_x+','+d.label_y+')';
        })
            .call(this.behavior.turn_off_drag)
            .call(label_drag_behavior);
        update_selection.select('.reaction-label')
            .text(function(d) { 
                var t = d[identifiers_on_map];
                if (has_data_on_reactions && reaction_data_styles.indexOf('text') != -1)
                    t += ' ' + d.data_string;
                return t;
            })
            .attr('text-anchor', function(d) {
                if ('label_align' in d && d.label_align !== null && d.label_align in conv)
                    return conv[d.label_align];
                return null;
            })
            .on('click', label_click_fn)
            .on('mouseover', label_mouseover_fn)
            .on('mouseout', label_mouseout_fn);
        // gene label
        var gene_g = update_selection.select('.gene-label-group')
                .selectAll('text')
                .data(function(d) {
                    var show_gene_string = ('gene_string' in d &&
                                            d.gene_string !== null)
                    if (show_gene_string) {
                        return d.gene_string.split('\n');
                    } else {
                        return [];
                    }
                });
        gene_g.enter()
            .append('text')
            .attr('class', 'gene-label');
        gene_g.attr('transform', function(d, i) {
            return 'translate(0, ' + (18 + 25*i) + ')';
        })
            .text(function(d) { return d; });
        gene_g.exit()
            .remove();
        
        this.callback_manager.run('update_reaction_label', this, update_selection);
    }

    function create_segment(enter_selection) {
        // create segments
        var g = enter_selection
                .append('g')
                .attr('class', 'segment-group')
                .attr('id', function(d) { return 's'+d.segment_id; });

        // create reaction arrow
        g.append('path')
            .attr('class', 'segment');

        g.append('g')
            .attr('class', 'arrowheads');
        
        this.callback_manager.run('create_segment', this, enter_selection);
    }
    
    function update_segment(update_selection, scale, cobra_model,
                            drawn_nodes, defs, 
                            has_data_on_reactions, no_data_style,
                            missing_component_color, reaction_data_styles) {
        utils.check_undefined(arguments, ['update_selection',
                                          'scale',
                                          'cobra_model',
                                          'drawn_nodes',
                                          'defs',
                                          'has_data_on_reactions',
                                          'no_data_style',
                                          'missing_component_color',
                                          'reaction_data_styles']);

        // update segment attributes
        var get_disp = function(reversibility, coefficient) {
            return (reversibility || coefficient > 0) ? 32 : 20;
        };
        // update arrows
        update_selection
            .selectAll('.segment')
            .datum(function() {
                return this.parentNode.__data__;
            })
            .attr('d', function(d) {
                if (d.from_node_id==null || d.to_node_id==null)
                    return null;
                var start = drawn_nodes[d.from_node_id],
                    end = drawn_nodes[d.to_node_id],
                    b1 = d.b1,
                    b2 = d.b2;
                // if metabolite, then displace the arrow
                if (start['node_type']=='metabolite' && b1!==null) {
                    var disp = get_disp(d.reversibility, d.from_node_coefficient);
                    var direction = (b1 === null) ? end : b1;
                    start = displaced_coords(disp, start, direction, 'start');
                }
                if (end['node_type']=='metabolite') {
                    var disp = get_disp(d.reversibility, d.to_node_coefficient);
                    var direction = (b2 === null) ? start : b2;
                    end = displaced_coords(disp, direction, end, 'end');
                }
                var curve = ('M'+start.x+','+start.y+' ');
                if (b1 !== null && b2 !== null) {
                    curve += ('C'+b1.x+','+b1.y+' '+
                              b2.x+','+b2.y+' ');
                }
                curve += (end.x+','+end.y);
                return curve;
            })
            .style('stroke', function(d) {
                var reaction_id = this.parentNode.parentNode.__data__.bigg_id,
                    show_missing = (cobra_model !== null &&
                                    missing_component_color!==null &&
                                    !(reaction_id in cobra_model.reactions)),
                    should_color_data = (has_data_on_reactions &&
                                         reaction_data_styles.indexOf('color') != -1);
                if (show_missing) {
                    return missing_component_color;
                }
                if (should_color_data) {
                    var f = d.data;
                    return f===null ? no_data_style['color'] : scale.reaction_color(f);
                }
                return null;
            })
            .style('stroke-width', function(d) {
                if (has_data_on_reactions && reaction_data_styles.indexOf('size') != -1) {
                    var f = d.data;
                    return f===null ? no_data_style['size'] : scale.reaction_size(f);
                } else {
                    return null;
                }
            });

        // new arrowheads
        var arrowheads = update_selection.select('.arrowheads')
                .selectAll('.arrowhead')
                .data(function (d) {
                    var arrowheads = [],
                        reaction_id = this.parentNode.parentNode.parentNode.__data__.reaction_id,
                        segment_id = this.parentNode.parentNode.__data__.segment_id;                
                    var start = drawn_nodes[d.from_node_id],
                        b1 = d.b1;
                    if (start.node_type=='metabolite' && (d.reversibility || d.from_node_coefficient > 0)) {
                        var disp = get_disp(d.reversibility, d.from_node_coefficient),
                            direction = (b1 === null) ? end : b1;
                        var rotation = utils.to_degrees(utils.get_angle([start, direction])) + 90;
                        start = displaced_coords(disp, start, direction, 'start');
                        arrowheads.push({ data: d.data,
                                          x: start.x,
                                          y: start.y,
                                          rotation: rotation,
                                          show_arrowhead_flux: (((d.from_node_coefficient < 0)==(d.reverse_flux))
                                                                || d.data==0)
                                        });
                    }
                    var end = drawn_nodes[d.to_node_id],
                        b2 = d.b2;
                    if (end.node_type=='metabolite' && (d.reversibility || d.to_node_coefficient > 0)) {
                        var disp = get_disp(d.reversibility, d.to_node_coefficient),
                            direction = (b2 === null) ? start : b2,
                            rotation = utils.to_degrees(utils.get_angle([end, direction])) + 90;
                        end = displaced_coords(disp, direction, end, 'end');
                        arrowheads.push({ data: d.data,
                                          x: end.x,
                                          y: end.y,
                                          rotation: rotation,
                                          show_arrowhead_flux: (((d.to_node_coefficient < 0)==(d.reverse_flux))
                                                                || d.data==0)
                                        });
                    }
                    return arrowheads;
                });
        arrowheads.enter().append('path')
            .classed('arrowhead', true);
        // update arrowheads
        arrowheads.attr('d', function(d) {
            var markerWidth = 20, markerHeight = 13;
            if (has_data_on_reactions && reaction_data_styles.indexOf('size')!==-1) {
                var f = d.data,
                    size = (f === null ? no_data_style['size'] : scale.reaction_size(f));
                markerWidth = size * 2;
            }               
            return 'M'+[-markerWidth/2, 0]+' L'+[0, markerHeight]+' L'+[markerWidth/2, 0]+' Z';
        }).attr('transform', function(d) {
            return 'translate('+d.x+','+d.y+')rotate('+d.rotation+')';
        }).style('fill', function(d) {
            if (has_data_on_reactions && reaction_data_styles.indexOf('color')!==-1) {
                if (d.show_arrowhead_flux) {
                    // show the flux
                    var f = d.data;
                    return f===null ? no_data_style['color'] : scale.reaction_color(f);
                } else {
                    // if the arrowhead is not filled because it is reversed
                    return '#FFFFFF';
                }
            }
            // default fill color
            return null;
        }).style('stroke', function(d) {
            if (has_data_on_reactions && reaction_data_styles.indexOf('color')!==-1) {
                // show the flux color in the stroke whether or not the fill is present
                var f = d.data;
                return f===null ? no_data_style['color'] : scale.reaction_color(f);
            }
            // default stroke color
            return null;
        });
        // remove
        arrowheads.exit().remove();
        
        this.callback_manager.run('update_segment', this, update_selection);
    }

    function create_bezier(enter_selection) {
        var g = enter_selection.append('g')
                .attr('id', function(d) { return d.bezier_id; })
                .attr('class', function(d) { return 'bezier'; });
        g.append('path')
            .attr('class', 'connect-line');
        g.append('circle')
            .attr('class', function(d) { return 'bezier-circle '+d.bezier; })
            .style('stroke-width', String(1)+'px')      
            .attr('r', String(7)+'px');
        
        this.callback_manager.run('create_bezier', this, enter_selection);
    }

    function update_bezier(update_selection, show_beziers,
                           drag_behavior,
                           mouseover, mouseout, drawn_nodes, drawn_reactions) {
        utils.check_undefined(arguments, ['update_selection', 'show_beziers',
                                          'drag_behavior', 'mouseover', 'mouseout',
                                          'drawn_nodes', 'drawn_reactions']);

        if (!show_beziers) {
            update_selection.attr('visibility', 'hidden');
            return;
        } else {
            update_selection.attr('visibility', 'visible');
        }
        
        // draw bezier points
        update_selection
            .select('.bezier-circle')
            .call(this.behavior.turn_off_drag)
            .call(drag_behavior)
            .on('mouseover', mouseover)
            .on('mouseout', mouseout)
            .attr('transform', function(d) {
                if (d.x==null || d.y==null) return ''; 
                return 'translate('+d.x+','+d.y+')';
            });

        // update bezier line
        update_selection
            .select('.connect-line')
            .attr('d', function(d) {
                var node,
                    segment_d = drawn_reactions[d.reaction_id].segments[d.segment_id];
                node = (d.bezier=='b1' ? 
                        drawn_nodes[segment_d.from_node_id] : 
                        drawn_nodes[segment_d.to_node_id]);             
                if (d.x==null || d.y==null || node.x==null || node.y==null)
                    return '';
                return 'M'+d.x+', '+d.y+' '+(node.x)+','+(node.y);
            });
        
        this.callback_manager.run('update_bezier', this, update_selection);
    }

    function create_node(enter_selection, drawn_nodes, drawn_reactions) {
        // create nodes
        var g = enter_selection
                .append('g')
                .attr('class', 'node')
                .attr('id', function(d) { return 'n'+d.node_id; });

        // create metabolite circle and label
        g.append('circle')
            .attr('class', function(d) {
                var c = 'node-circle';
                if (d.node_type!==null)
                    c += (' ' + d.node_type + '-circle');
                return c;
            });
        g.filter(function(d) { return d.node_type=='metabolite'; })
            .append('text')
            .attr('class', 'node-label label');
        
        this.callback_manager.run('create_node', this, enter_selection);
    }

    function update_node(update_selection, scale, has_data_on_nodes,
                         identifiers_on_map, metabolite_data_styles, no_data_style,
                         click_fn, mouseover_fn, mouseout_fn,
                         drag_behavior, label_drag_behavior) {
        utils.check_undefined(arguments,
                              ['update_selection', 'scale', 'has_data_on_nodes',
                               'no_data_style', 'metabolite_data_styles',
                               'click_fn', 'mouseover_fn', 'mouseout_fn',
                               'drag_behavior', 'label_drag_behavior']);

        // update circle and label location
        var mg = update_selection
                .select('.node-circle')
                .attr('transform', function(d) {
                    return 'translate('+d.x+','+d.y+')';
                })
                .attr('r', function(d) {
                    if (d.node_type == 'metabolite') {
                        var should_scale = (has_data_on_nodes &&
                                            metabolite_data_styles.indexOf('size') != -1);
                        if (should_scale) {
                            var f = d.data;
                            return f===null ? no_data_style['size'] : scale.metabolite_size(f);
                        } else {
                            return d.node_is_primary ? 15 : 10; 
                        }
                    }
                    // midmarkers and multimarkers
                    return 5;
                })
                .style('fill', function(d) {
                    if (d.node_type=='metabolite') {
                        var should_color_data = (has_data_on_nodes &&
                                                 metabolite_data_styles.indexOf('color') != -1);
                        if (should_color_data) {
                            var f = d.data;
                            return f===null ? no_data_style['color'] : scale.metabolite_color(f);
                        } else {
                            return null;
                        }
                    }
                    // midmarkers and multimarkers
                    return null;
                })
                .call(this.behavior.turn_off_drag)
                .call(drag_behavior)
                .on('click', click_fn)
                .on('mouseover', mouseover_fn)
                .on('mouseout', mouseout_fn);

        var conv = {'left': 'start', 'center': 'middle', 'right': 'end'};
        update_selection
            .select('.node-label')
            .attr('transform', function(d) {
                return 'translate('+d.label_x+','+d.label_y+')';
            })
            .text(function(d) { 
                var t = d[identifiers_on_map];
                if (has_data_on_nodes && metabolite_data_styles.indexOf('text') != -1)
                    t += ' ' + d.data_string;
                return t;
            })
            .attr('text-anchor', function(d) {
                if ('label_align' in d && d.label_align !== null && d.label_align in conv)
                    return conv[d.label_align];
                return null;
            })
            .call(this.behavior.turn_off_drag)
            .call(label_drag_behavior);
        
        this.callback_manager.run('update_node', this, update_selection);
    }

    function create_text_label(enter_selection) {
        enter_selection.append('g')
            .attr('id', function(d) { return 'l'+d.text_label_id; })
            .attr('class', 'text-label')
            .append('text')
            .attr('class', 'label');
        
        this.callback_manager.run('create_text_label', this, enter_selection);
    }

    function update_text_label(update_selection) {
        var click_fn = this.behavior.text_label_click,
            drag_behavior = this.behavior.selectable_drag,
            turn_off_drag = this.behavior.turn_off_drag,
            conv = {'left': 'start', 'center': 'middle', 'right': 'end'};
        
        update_selection
            .select('.label')
            .text(function(d) { return d.text; })
            .attr('text-anchor', function(d) {
                if ('label_align' in d && d.label_align !== null && d.label_align in conv)
                    return conv[d.label_align];
                return null;
            })
            .attr('transform', function(d) { return 'translate('+d.x+','+d.y+')';})
            .on('click', click_fn)
            .call(turn_off_drag)
            .call(drag_behavior);
        
        this.callback_manager.run('update_text_label', this, update_selection);
    }

    function displaced_coords(reaction_arrow_displacement, start, end, displace) {
        utils.check_undefined(arguments, ['reaction_arrow_displacement', 'start', 'end', 'displace']);

        var length = reaction_arrow_displacement,
            hyp = utils.distance(start, end),
            new_x, new_y;
        if (!length || !hyp) console.error('Bad value');
        if (displace=='start') {
            new_x = start.x + length * (end.x - start.x) / hyp,
            new_y = start.y + length * (end.y - start.y) / hyp;
        } else if (displace=='end') {
            new_x = end.x - length * (end.x - start.x) / hyp,
            new_y = end.y - length * (end.y - start.y) / hyp;
        } else { console.error('bad displace value: ' + displace); }
        return {x: new_x, y: new_y};
    }
});
