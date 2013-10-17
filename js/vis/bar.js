define(["./scaffold", "lib/d3"], function (scaffold, d3) {
    return function(options) {
        // set defaults
        var o = scaffold.set_options(options, {
            margins: {top: 10, right: 10, bottom: 10, left: 20},
            plot_padding: {left: 30, bottom: 30, top: 10, right: 10},
            selection_is_svg: false,
            fillScreen: false,
            x_axis_label: "",
            y_axis_label: "",
            x_data_label: '1',
            y_data_label: '2',
            x_shift: 4,
            data_is_object: true,
            color_scale: false,
            y_range: false,
            title: false,
            is_stacked: false,
            update_hook: false,
            css_path: '' });

        var out = scaffold.setup_svg(o.selection, o.selection_is_svg,
                                     o.margins, o.fill_screen);
        o.svg = out.svg;
        o.height = out.height;
        o.width = out.width;

        // load the css
        o.ready = scaffold.load_css(o.css_path, function(css) {
            o.css = css;
            o.ready = true;
        });
        o.layers = [];

        return {
            update: update,
            collect_data: collect_data,
            update_hook: set_update_hook
        };

        // definitions
        function update_size() {
            out = scaffold.resize_svg(o.selection, o.selection_is_svg, o.margins, o.fill_screen);
            o.height = out.height;
            o.width = out.width;

            // o.x.range([0, o.width]);
            // o.y.range([o.height, 0]);

            // o.xAxiscale(x);
            // o.yAxiscale(y);

            // o.svg.select('.x.hist-axis')
            //     .attr("transform", "translate(0," + o.height + ")")
            //     .call(o.xAxis)
            //     .select('text')
            //     .attr("x", o.width);
            // o.svg.select('.y.hist-axis')
            //     .call(o.yAxis);

            // var bar_w = o.x(1) - o.diff - 8;

            // for (var i=0; i<json.length; i++) {
            //     selection.selectAll(".bar.bar"+String(i))
            //         .attr("transform", function(d) {
            //             return "translate(" + (x(d.x) + x_shift*i) + "," + y(d.y) + ")";
            //         })
            //         .select('rect')
            //         .attr("width", bar_w)
            //         .attr("height", function(d) { return height - y(d.y); });
            // }

            return this;
        };

        function update() {
            // check data
            var i=-1;
            while(++i < o.layers.length) {
                if (o.layers[i]===undefined) {
                    console.log('waiting for all indices');
                    return this;
                }
            }

            // clear the container and add again
            o.svg.select("#bar-container").remove();
            var container = o.svg.append("g").attr("id","bar-container");
            container.append("style")
                .attr('type', "text/css")
                .text(o.css);
            var sel = container.append("g")
                .attr("transform", "translate(" + o.margins.left + "," + o.margins.top + ")");

            // find x domain
            var x_dom = [0, d3.max(o.layers, function(a) { return a.data.length; })],
            y_dom;
            if (o.y_range) {
                y_dom = o.y_range;
            } else {
                if (o.is_stacked) {
                    // sum up each data point
                    var i=-1, max = 0;
                    while (++i<o.layers[0].data.length) {
                        var j=-1, t = 0;
                        while (++j<o.layers.length) t += o.layers[j].data[i].value;
                        if (t > max) max = t;
                    }
                    y_dom = [
                        d3.min(o.layers, function(a) {
                            return d3.min(a.data, function(d) { return d.value; });
                        }),
                        max
                    ];
                } else {
                    y_dom = [
                        d3.min(o.layers, function(a) {
                            return d3.min(a.data, function(d) { return d.value; });
                        }),
                        d3.max(o.layers, function(a) {
                            return d3.max(a.data, function(d) { return d.value; });
                        })
                    ];
                }
            }

            var dom = {'y': y_dom,
                       'x': x_dom},
            out = scaffold.scale_and_axes(dom.x, dom.y,
                                          o.width, o.height,
                                          { padding: o.plot_padding,
                                            x_ticks: 0,
                                            y_ticks: 5,
                                            y_tick_format: d3.format("f") }),
            x = out.x, y = out.y;
            scaffold.add_generic_axis('x', o.x_axis_label, sel, out.x_axis,
                                      o.width, o.height, o.plot_padding);
            scaffold.add_generic_axis('y', o.y_axis_label, sel, out.y_axis,
                                      o.width, o.height, o.plot_padding);

            var diff = 0,
            bar_w = x(2) - x(1) - diff;

            for (var j = 0; j < o.layers.length; j++) {
                var cl = 'bar'+String(j);
                var bars = sel.selectAll("."+cl)
                    .data(o.layers[j].data)
                    .enter().append("g")
                    .attr("class", "bar "+cl);
                if (o.is_stacked) {
                    if (j > 0) {
                        bars.attr("transform", function(d, i) {
                            return "translate(" + x(i) + "," +
				(y(o.layers[j-1].data[i].value) - (y(dom.y[0]) - y(d.value))) + ")";
                        });
                    } else {
                        bars.attr("transform", function(d, i) {
                            return "translate(" + x(i) + "," +
                                y(d.value) + ")";
                        });
                    }
                } else {
                    bars.attr("transform", function(d, i) {
                        return "translate(" + (x(i) + o.x_shift*j) + "," +
			    y(d.value) + ")";
                    });
                }
                var rects = bars.append("rect")
                    .attr("x", 1)
                    .attr("width", bar_w)
                    .attr("height", function(d) { return y(dom.y[0]) - y(d.value); })
                    .style("fill", function(d) { if (o.color_scale) return o.color_scale(d.category);
                                                 else return null; });
            }

            if (o.title) {
                sel.append('text')
                    .attr('class', 'title')
                    .text(o.title)
                    .attr("transform", "translate("+o.width/2+",10)")
                    .attr("text-anchor", "middle");
            }

            if (o.update_hook) o.update_hook(sel);
            return this;
        };

        function collect_data(json, layer) {
            if (!o.ready) console.warn('Hasn\'t loaded css yet');
            if (o.data_is_object) {
                var objects = [];
                for (var key in json) objects.push({name: key, value: json[key]});
                o.layers[layer] = {data: objects};
            } else {
                o.layers[layer] = {data: json};
            }
            update();
            return this;
        };

        function set_update_hook(fn) {
            o.update_hook = fn;
            return this;
        };

    };
});
