var Visualization = {};

(function() {
    "use strict";

    function compute_gradient(phases, width) {
        // compute a gradient which represents how much time we spent in
        // each phase.

        // At each boundary, we want a phase transition of about P pixels
        // (just because I found it pleasant to view, but feel free to
        // experiment :)): however, in the gradient we can only specify
        // the percentage, not the pixels: thus, we compute which
        // percentage of the total width corresponds to P pixels
        var P = 8;
        var padding = (P/width);

        // suppose to have the following data:
        // green:  30% => [ 0,  30]
        // red:    30% => [30,  60]
        // cyan:    1% => [60,  61]
        // yellow: 39% => [61, 100]
        // padding: 5%
        //
        // var phases = [{"value": 0.30, "color": "green"},
        //               {"value": 0.30, "color": "red"},
        //               {"value": 0.01, "color": "cyan"},
        //               {"value": 0.39, "color": "yellow"}
        //              ]
        // var padding = 0.05;

        // we want to compute a gradient like this:
        //     (green-0)              # implicit
        //     green :05 - green :25
        //     red   :35 - red   :55
        //     cyan  :60 - cyan  :61  # this section is not wide enough to apply padding
        //     yellow:66 - yellow:95
        //     (yellow-100)           # implicit
        //
        var offset = 0;
        var gradient = "0"; // this is the angle: 0 means no rotation, i.e. a horizontal gradient

        for (var i in phases) {
            var phase = phases[i];
            if (phase.value == 0)
                continue;
            var start = offset;
            var end = offset+phase.value;
            if (phase.value > padding) {
                start += padding;
                end -= padding;
            }
            gradient += "-" + phase.color + ":" + (start*100).toFixed(4);
            gradient += "-" + phase.color + ":" + (end*100).toFixed(4);

            offset += phase.value;
        }
        return gradient;
    }

    var colors = ["rgb(228, 137, 9)",
                  "rgb(231, 227, 3)",
                  "rgb(214, 73, 15)",
                  "rgb(236, 164, 11)",
                  "rgb(231, 173, 15)"];

    function pick_color(VM, node, width) {
        if (VM == "cpython") {
            var i = (parseInt(node.addr.slice(node.addr.length - 6)) / 4) % colors.length;
            return colors[i];
        }
        var phases = [{value: node.red(),    color: "#d9534f"},
                      {value: node.yellow(), color: "#f0ad4e"},
                      {value: node.green(),  color: "#5cb85c"},
                      {value: node.gc(),     color: "#5bc0de"}];

        return compute_gradient(phases, width);
    }

    function add_tooltip(node, rect, text) {
        var ul = $('<ul class="list-inline">');
        var phases = [
            {text: "Interpreted: ", cls: "label-danger",  value: node.red()},
            {text: "Warm-up: ",     cls: "label-warning", value: node.yellow()},
            {text: "JIT: ",         cls: "label-success", value: node.green()},
            {text: "GC: ",          cls: "label-info",    value: node.gc()}
        ];
        for (var i in phases) {
            var phase = phases[i];
            var li = $('<li>').
                    addClass("label").
                    addClass(phase.cls).
                    text(phase.text + (phase.value*100).toFixed(2) + "%");
            ul.append(li);
            ul.append("\n");
        }
        var tooltip = ul[0].outerHTML;
        var name = split_name(node.name);
        $(rect.node).add(text.node).popover({
            title: "<b>function:</b> " + _.escape(name.funcname) + " <b>file:</b> " + _.escape(name.file) + ":" + name.line,
            content: tooltip,
            container: "#wide-popovers",
            placement: "bottom",
            trigger: "hover",
            html: true
        });
    }

    Visualization.flameChart = function($element, height, node, $scope,
                                        $location, cutoff, path_so_far, VM) {

        $element.empty();
        $("#visualization-data").hide();

        var width = $element.width();
        var paper = Raphael($element[0], width, height);
        var max_self = node.max_self();

        function draw(x, y, width, height, node, path) {
            if (node.total < cutoff) {
                return;
            }
            var rect = paper.rect(x, y, width, height, 5);
            var text = paper.text(x + width / 2,
                                  y + height / 2,
                                  node.name.split(':')[1]);
            var st = paper.set();
            st.push(rect, text);

            if (text.getBBox().width > rect.getBBox().width) {
                text.remove();
            }

            var color = pick_color(VM, node, width);
            rect.attr({fill: color});

            // compute the opacity, so that functions with the highest "self
            // time" are displayed darker. The fuction with the highest self
            // time is shown with 100% opacity, the others are proportionally
            // more transparent, with a minimum of 20% opacity.
            var opacity = (node.self/max_self)*0.7 + 0.2;
            $(rect.node).css('opacity', opacity);

            st.data('color', color);
            st.data('node', node);
            st.data('rect', rect);
            st.data('opacity', opacity);
            var cur_path = path.toString();

            add_tooltip(node, rect, text);

            st.hover(
                function(e) {
                    var node = this.data('node');
                    var rect = this.data('rect');
                    var name = split_name(node.name);
                    rect.attr({'stroke-width': 2});
                    $(rect.node).css('opacity', 1);
                    $("#visualization-data").show();
                },
                function(e) {
                    var rect = this.data('rect');
                    var opacity = this.data('opacity');
                    rect.attr({'stroke-width': 1});
                    $(rect.node).css('opacity', opacity);
                    $("#visualization-data").hide();
                }
            );

            st.click(function () {
                $location.search({
                    id: cur_path,
                    view: 'flames'
                });
                $scope.$apply();
            });

            if (_.keys(node.children).length == 1) {
                if (node.self == node.total) {
                    var scale = 1;
                } else {
                    var scale = 1 - (node.self / node.total);
                }
                var child = node.children[Object.keys(node.children)[0]];
                path.push(0);
                draw(x, y + height + 2, width * scale, height, child, path);
            } else if (_.keys(node.children).length > 1) {
                var y = y + height + 2;
                for (var child in node.children) {
                    var c_path = path.slice();
                    c_path.push(child);
                    var child = node.children[child];
                    var _width = child.total / node.total * width;
                    draw(x,  y, _width, height, child, c_path);
                    x = x + _width;
                }
            }
        }

        draw(0, 0, width, 25, node, path_so_far);

        var depth = _.max($element
                          .find('rect')
                          .map(function() {return parseInt(this.attributes['y'].value);} ));

        paper.setSize(paper.width, depth + 27);
    };

    Visualization.squareChart = function($element, height, node,
                                         $scope, $location) {

        $element.empty();
        var width = $element.width();
        var paper = Raphael($element[0], width, height);

        function draw(x, y, width, height, node, scale) {
            var scale = scale || scale;

            var rect = paper.rect(x, y, width, height);
            rect.attr({fill: '#9cf', stroke: '#888', 'stroke-width': 2});
            rect.data('name', node.name);

            rect.hover(
                function(e) {
                    var name = this.data('name');
                    //$scope.$apply(function () {
                    //  $scope.address = address;
                    //});
                    this.attr({'fill': 'red'});
                },
                function(e) {
                    this.attr({'fill': '#9cf'});
                    //$scope.$apply(function () {
                    //  $scope.address = null;
                    //});
                }
            );

            //rect.click(function () {
            //  $location.search({
            //      id: this.data('address'),
            //      view: 'squares'
            //  });
            //});

            if (node.total == node.self) {
                var scale = 1;
            } else {
                var scale = 1 - (node.self / node.total);
            }

            if (_.keys(node.children).length == 1) {
                var node = node.children[Object.keys(node.children)[0]];
                var box = rect.getBBox();

                //draw(box.x, box.y, box.width, box.height, node);

            } else if (_.keys(node.children).length > 1) {
                var times = [];
                var names = [];
                var addresses = [];
                var children = [];

                for (var child in node.children) {
                    var child = node.children[child];
                    times.push(child.self);
                    addresses.push(child.addr);
                    names.push(child.name);
                    children.push(child);
                }

                var xd = (width - (width * scale)) / 2;
                var yd = (height - (height * scale)) / 2;


                var width = width * scale;
                var height = height * scale;

                var boxes = Treemap.generate(
                    addresses, names, times,
                    width,
                    height, x+xd, y+yd
                );


                for (var i = 0; i < boxes.length; i++) {
                    var box = boxes[i];
                    var x1=box.square[0],
                        y1=box.square[1],
                        x2=box.square[2],
                        y2=box.square[3];

                    //draw(x1, y1, x2-x1, y2-y1, children[i]);
                }
            }
        }
        draw(0, 0, width, height, node);

    };

})();
