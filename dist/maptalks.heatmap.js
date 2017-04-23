/*!
 * maptalks.heatmap v0.3.1
 * LICENSE : MIT
 * (c) 2016-2017 maptalks.org
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('maptalks')) :
	typeof define === 'function' && define.amd ? define(['exports', 'maptalks'], factory) :
	(factory((global.maptalks = global.maptalks || {}),global.maptalks));
}(this, (function (exports,maptalks) { 'use strict';

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var simpleheat_1 = createCommonjsModule(function (module) {
    'use strict';

    module.exports = simpleheat;

    function simpleheat(canvas) {
        if (!(this instanceof simpleheat)) return new simpleheat(canvas);

        this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

        this._ctx = canvas.getContext('2d');
        this._width = canvas.width;
        this._height = canvas.height;

        this._max = 1;
        this._data = [];
    }

    simpleheat.prototype = {

        defaultRadius: 25,

        defaultGradient: {
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        },

        data: function data(_data) {
            this._data = _data;
            return this;
        },

        max: function max(_max) {
            this._max = _max;
            return this;
        },

        add: function add(point) {
            this._data.push(point);
            return this;
        },

        clear: function clear() {
            this._data = [];
            return this;
        },

        radius: function radius(r, blur) {
            blur = blur === undefined ? 15 : blur;

            // create a grayscale blurred circle image that we'll use for drawing points
            var circle = this._circle = this._createCanvas(),
                ctx = circle.getContext('2d'),
                r2 = this._r = r + blur;

            circle.width = circle.height = r2 * 2;

            ctx.shadowOffsetX = ctx.shadowOffsetY = r2 * 2;
            ctx.shadowBlur = blur;
            ctx.shadowColor = 'black';

            ctx.beginPath();
            ctx.arc(-r2, -r2, r, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();

            return this;
        },

        resize: function resize() {
            this._width = this._canvas.width;
            this._height = this._canvas.height;
        },

        gradient: function gradient(grad) {
            // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
            var canvas = this._createCanvas(),
                ctx = canvas.getContext('2d'),
                gradient = ctx.createLinearGradient(0, 0, 0, 256);

            canvas.width = 1;
            canvas.height = 256;

            for (var i in grad) {
                gradient.addColorStop(+i, grad[i]);
            }

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1, 256);

            this._grad = ctx.getImageData(0, 0, 1, 256).data;

            return this;
        },

        draw: function draw(minOpacity) {
            if (!this._circle) this.radius(this.defaultRadius);
            if (!this._grad) this.gradient(this.defaultGradient);

            var ctx = this._ctx;

            ctx.clearRect(0, 0, this._width, this._height);

            // draw a grayscale heatmap by putting a blurred circle at each data point
            for (var i = 0, len = this._data.length, p; i < len; i++) {
                p = this._data[i];
                ctx.globalAlpha = Math.max(p[2] / this._max, minOpacity === undefined ? 0.05 : minOpacity);
                ctx.drawImage(this._circle, p[0] - this._r, p[1] - this._r);
            }

            // colorize the heatmap, using opacity value of each pixel to get the right color from our gradient
            var colored = ctx.getImageData(0, 0, this._width, this._height);
            this._colorize(colored.data, this._grad);
            ctx.putImageData(colored, 0, 0);

            return this;
        },

        _colorize: function _colorize(pixels, gradient) {
            for (var i = 0, len = pixels.length, j; i < len; i += 4) {
                j = pixels[i + 3] * 4; // get gradient color from opacity value

                if (j) {
                    pixels[i] = gradient[j];
                    pixels[i + 1] = gradient[j + 1];
                    pixels[i + 2] = gradient[j + 2];
                }
            }
        },

        _createCanvas: function _createCanvas() {
            if (typeof document !== 'undefined') {
                return document.createElement('canvas');
            } else {
                // create a new canvas instance in node.js
                // the canvas class needs to have a default constructor without any parameter
                return new this._canvas.constructor();
            }
        }
    };
});

function _defaults(obj, defaults) { var keys = Object.getOwnPropertyNames(defaults); for (var i = 0; i < keys.length; i++) { var key = keys[i]; var value = Object.getOwnPropertyDescriptor(defaults, key); if (value && value.configurable && obj[key] === undefined) { Object.defineProperty(obj, key, value); } } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : _defaults(subClass, superClass); }

var options = {
    'max': 1,
    'gradient': {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
    },
    'radius': 25,
    'blur': 15,
    'minOpacity': 0.05
};

var HeatLayer = function (_maptalks$Layer) {
    _inherits(HeatLayer, _maptalks$Layer);

    function HeatLayer(id, heats, options) {
        _classCallCheck(this, HeatLayer);

        if (!Array.isArray(heats)) {
            options = heats;
            heats = null;
        }

        var _this = _possibleConstructorReturn(this, _maptalks$Layer.call(this, id, options));

        _this._heats = heats || [];
        return _this;
    }

    HeatLayer.prototype.getData = function getData() {
        return this._heats;
    };

    HeatLayer.prototype.setData = function setData(heats) {
        this._heats = heats || [];
        return this.redraw();
    };

    HeatLayer.prototype.addPoint = function addPoint(heat) {
        if (!heat) {
            return this;
        }
        if (heat[0] && Array.isArray(heat[0])) {
            maptalks.Util.pushIn(this._heats, heat);
        } else {
            this._heats.push(heat);
        }
        return this.redraw();
    };

    HeatLayer.prototype.onConfig = function onConfig(conf) {
        _maptalks$Layer.prototype.onConfig.apply(this, arguments);
        for (var p in conf) {
            if (options[p]) {
                return this.redraw();
            }
        }
        return this;
    };

    HeatLayer.prototype.redraw = function redraw() {
        var renderer$$1 = this._getRenderer();
        if (renderer$$1) {
            renderer$$1.clearHeatCache();
            renderer$$1.render();
        }
        return this;
    };

    HeatLayer.prototype.isEmpty = function isEmpty() {
        if (!this._heats.length) {
            return true;
        }
        return false;
    };

    HeatLayer.prototype.clear = function clear() {
        this._heats = [];
        this.redraw();
        this.fire('clear');
        return this;
    };

    /**
     * Export the HeatLayer's JSON.
     * @return {Object} layer's JSON
     */


    HeatLayer.prototype.toJSON = function toJSON(options) {
        if (!options) {
            options = {};
        }
        var json = {
            'type': this.getJSONType(),
            'id': this.getId(),
            'options': this.config()
        };
        var data = this.getData();
        if (options['clipExtent']) {
            var clipExtent = new maptalks.Extent(options['clipExtent']);
            var r = this._getHeatRadius();
            if (r) {
                clipExtent = clipExtent._expand(r);
            }
            var clipped = [];
            for (var i = 0, len = data.length; i < len; i++) {
                if (clipExtent.contains(new maptalks.Coordinate(data[i][0], data[i][1]))) {
                    clipped.push(data[i]);
                }
            }
            json['data'] = clipped;
        } else {
            json['data'] = data;
        }

        return json;
    };

    /**
     * Reproduce a HeatLayer from layer's JSON.
     * @param  {Object} json - layer's JSON
     * @return {maptalks.HeatLayer}
     * @static
     * @private
     * @function
     */


    HeatLayer.fromJSON = function fromJSON(json) {
        if (!json || json['type'] !== 'HeatLayer') {
            return null;
        }
        return new HeatLayer(json['id'], json['data'], json['options']);
    };

    HeatLayer.prototype._getHeatRadius = function _getHeatRadius() {
        if (!this._getRenderer()) {
            return null;
        }
        return this._getRenderer()._heatRadius;
    };

    return HeatLayer;
}(maptalks.Layer);

HeatLayer.mergeOptions(options);

HeatLayer.registerJSONType('HeatLayer');

HeatLayer.registerRenderer('canvas', function (_maptalks$renderer$Ca) {
    _inherits(_class, _maptalks$renderer$Ca);

    function _class() {
        _classCallCheck(this, _class);

        return _possibleConstructorReturn(this, _maptalks$renderer$Ca.apply(this, arguments));
    }

    _class.prototype.draw = function draw() {
        var map = this.getMap(),
            layer = this.layer,
            extent = map.getContainerExtent();
        var maskExtent = this.prepareCanvas(),
            displayExtent = extent;
        if (maskExtent) {
            maskExtent = maskExtent.convertTo(function (c) {
                return map._pointToContainerPoint(c);
            });
            //out of layer mask
            if (!maskExtent.intersects(extent)) {
                this.completeRender();
                return;
            }
            displayExtent = extent.intersection(maskExtent);
        }

        if (!this._heater) {
            this._heater = simpleheat_1(this.canvas);
        }
        this._heater.radius(layer.options['radius'] || this._heater.defaultRadius, layer.options['blur']);
        if (layer.options['gradient']) {
            this._heater.gradient(layer.options['gradient']);
        }
        this._heater.max(layer.options['max']);
        //a cache of heat points' viewpoints.
        if (!this._heatViews) {
            this._heatViews = [];
        }

        var heats = layer.getData();
        if (heats.length === 0) {
            this.completeRender();
            return;
        }
        var data = this._heatData(heats, displayExtent);
        this._heater.data(data).draw(layer.options['minOpacity']);
        this.completeRender();
    };

    _class.prototype._heatData = function _heatData(heats, displayExtent) {
        var map = this.getMap(),
            layer = this.layer;
        var projection = map.getProjection();
        var data = [],
            r = this._heater._r,
            max = layer.options['max'] === undefined ? 1 : layer.options['max'],
            maxZoom = maptalks.Util.isNil(layer.options['maxZoom']) ? map.getMaxZoom() : layer.options['maxZoom'],
            v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - map.getZoom(), 12))),
            cellSize = r / 2,
            grid = [],
            panePos = map.offsetPlatform(),
            offsetX = panePos.x % cellSize,
            offsetY = panePos.y % cellSize;
        var heat = void 0,
            p = void 0,
            alt = void 0,
            cell = void 0,
            x = void 0,
            y = void 0,
            k = void 0;
        displayExtent = displayExtent.expand(r).convertTo(function (c) {
            return new maptalks.Point(map._containerPointToPrj(c));
        });
        this._heatRadius = r;
        for (var i = 0, l = heats.length; i < l; i++) {
            heat = heats[i];
            if (!this._heatViews[i]) {
                this._heatViews[i] = projection.project(new maptalks.Coordinate(heat[0], heat[1]));
            }
            p = this._heatViews[i];
            if (displayExtent.contains(p)) {
                p = map._prjToContainerPoint(p);
                x = Math.floor((p.x - offsetX) / cellSize) + 2;
                y = Math.floor((p.y - offsetY) / cellSize) + 2;

                alt = heat.alt !== undefined ? heat.alt : heat[2] !== undefined ? +heat[2] : 1;
                k = alt * v;

                grid[y] = grid[y] || [];
                cell = grid[y][x];

                if (!cell) {
                    grid[y][x] = [p.x, p.y, k];
                } else {
                    cell[0] = (cell[0] * cell[2] + p.x * k) / (cell[2] + k); // x
                    cell[1] = (cell[1] * cell[2] + p.y * k) / (cell[2] + k); // y
                    cell[2] += k; // cumulated intensity value
                }
            }
        }
        for (var _i = 0, _l = grid.length; _i < _l; _i++) {
            if (grid[_i]) {
                for (var j = 0, ll = grid[_i].length; j < ll; j++) {
                    cell = grid[_i][j];
                    if (cell) {
                        data.push([Math.round(cell[0]), Math.round(cell[1]), Math.min(cell[2], max)]);
                    }
                }
            }
        }
        return data;
    };

    _class.prototype.onZoomEnd = function onZoomEnd() {
        delete this._heatViews;
        _maptalks$renderer$Ca.prototype.onZoomEnd.apply(this, arguments);
    };

    _class.prototype.onResize = function onResize() {
        this._heater._width = this.canvas.width;
        this._heater._height = this.canvas.height;
        _maptalks$renderer$Ca.prototype.onResize.apply(this, arguments);
    };

    _class.prototype.onRemove = function onRemove() {
        this.clearHeatCache();
        delete this._heater;
    };

    _class.prototype.clearHeatCache = function clearHeatCache() {
        delete this._heatViews;
    };

    return _class;
}(maptalks.renderer.CanvasRenderer));

exports.HeatLayer = HeatLayer;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3MuaGVhdG1hcC5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3NpbXBsZWhlYXQvc2ltcGxlaGVhdC5qcyIsIi4uL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IHNpbXBsZWhlYXQ7XG5cbmZ1bmN0aW9uIHNpbXBsZWhlYXQoY2FudmFzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHNpbXBsZWhlYXQpKSByZXR1cm4gbmV3IHNpbXBsZWhlYXQoY2FudmFzKTtcblxuICAgIHRoaXMuX2NhbnZhcyA9IGNhbnZhcyA9IHR5cGVvZiBjYW52YXMgPT09ICdzdHJpbmcnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2FudmFzKSA6IGNhbnZhcztcblxuICAgIHRoaXMuX2N0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuICAgIHRoaXMuX2hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tYXggPSAxO1xuICAgIHRoaXMuX2RhdGEgPSBbXTtcbn1cblxuc2ltcGxlaGVhdC5wcm90b3R5cGUgPSB7XG5cbiAgICBkZWZhdWx0UmFkaXVzOiAyNSxcblxuICAgIGRlZmF1bHRHcmFkaWVudDoge1xuICAgICAgICAwLjQ6ICdibHVlJyxcbiAgICAgICAgMC42OiAnY3lhbicsXG4gICAgICAgIDAuNzogJ2xpbWUnLFxuICAgICAgICAwLjg6ICd5ZWxsb3cnLFxuICAgICAgICAxLjA6ICdyZWQnXG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgbWF4OiBmdW5jdGlvbiAobWF4KSB7XG4gICAgICAgIHRoaXMuX21heCA9IG1heDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAgIHRoaXMuX2RhdGEucHVzaChwb2ludCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kYXRhID0gW107XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICByYWRpdXM6IGZ1bmN0aW9uIChyLCBibHVyKSB7XG4gICAgICAgIGJsdXIgPSBibHVyID09PSB1bmRlZmluZWQgPyAxNSA6IGJsdXI7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgZ3JheXNjYWxlIGJsdXJyZWQgY2lyY2xlIGltYWdlIHRoYXQgd2UnbGwgdXNlIGZvciBkcmF3aW5nIHBvaW50c1xuICAgICAgICB2YXIgY2lyY2xlID0gdGhpcy5fY2lyY2xlID0gdGhpcy5fY3JlYXRlQ2FudmFzKCksXG4gICAgICAgICAgICBjdHggPSBjaXJjbGUuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgIHIyID0gdGhpcy5fciA9IHIgKyBibHVyO1xuXG4gICAgICAgIGNpcmNsZS53aWR0aCA9IGNpcmNsZS5oZWlnaHQgPSByMiAqIDI7XG5cbiAgICAgICAgY3R4LnNoYWRvd09mZnNldFggPSBjdHguc2hhZG93T2Zmc2V0WSA9IHIyICogMjtcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSBibHVyO1xuICAgICAgICBjdHguc2hhZG93Q29sb3IgPSAnYmxhY2snO1xuXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYygtcjIsIC1yMiwgciwgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgIGN0eC5maWxsKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlc2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl93aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgdGhpcy5faGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICB9LFxuXG4gICAgZ3JhZGllbnQ6IGZ1bmN0aW9uIChncmFkKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBhIDI1NngxIGdyYWRpZW50IHRoYXQgd2UnbGwgdXNlIHRvIHR1cm4gYSBncmF5c2NhbGUgaGVhdG1hcCBpbnRvIGEgY29sb3JlZCBvbmVcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NyZWF0ZUNhbnZhcygpLFxuICAgICAgICAgICAgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgICAgICBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCAyNTYpO1xuXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IDE7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAyNTY7XG5cbiAgICAgICAgZm9yICh2YXIgaSBpbiBncmFkKSB7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoK2ksIGdyYWRbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMSwgMjU2KTtcblxuICAgICAgICB0aGlzLl9ncmFkID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCAxLCAyNTYpLmRhdGE7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRyYXc6IGZ1bmN0aW9uIChtaW5PcGFjaXR5KSB7XG4gICAgICAgIGlmICghdGhpcy5fY2lyY2xlKSB0aGlzLnJhZGl1cyh0aGlzLmRlZmF1bHRSYWRpdXMpO1xuICAgICAgICBpZiAoIXRoaXMuX2dyYWQpIHRoaXMuZ3JhZGllbnQodGhpcy5kZWZhdWx0R3JhZGllbnQpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG5cbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgICAgICAvLyBkcmF3IGEgZ3JheXNjYWxlIGhlYXRtYXAgYnkgcHV0dGluZyBhIGJsdXJyZWQgY2lyY2xlIGF0IGVhY2ggZGF0YSBwb2ludFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fZGF0YS5sZW5ndGgsIHA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgcCA9IHRoaXMuX2RhdGFbaV07XG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heChwWzJdIC8gdGhpcy5fbWF4LCBtaW5PcGFjaXR5ID09PSB1bmRlZmluZWQgPyAwLjA1IDogbWluT3BhY2l0eSk7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuX2NpcmNsZSwgcFswXSAtIHRoaXMuX3IsIHBbMV0gLSB0aGlzLl9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbG9yaXplIHRoZSBoZWF0bWFwLCB1c2luZyBvcGFjaXR5IHZhbHVlIG9mIGVhY2ggcGl4ZWwgdG8gZ2V0IHRoZSByaWdodCBjb2xvciBmcm9tIG91ciBncmFkaWVudFxuICAgICAgICB2YXIgY29sb3JlZCA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG4gICAgICAgIHRoaXMuX2NvbG9yaXplKGNvbG9yZWQuZGF0YSwgdGhpcy5fZ3JhZCk7XG4gICAgICAgIGN0eC5wdXRJbWFnZURhdGEoY29sb3JlZCwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9jb2xvcml6ZTogZnVuY3Rpb24gKHBpeGVscywgZ3JhZGllbnQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBpeGVscy5sZW5ndGgsIGo7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgICAgICAgICAgaiA9IHBpeGVsc1tpICsgM10gKiA0OyAvLyBnZXQgZ3JhZGllbnQgY29sb3IgZnJvbSBvcGFjaXR5IHZhbHVlXG5cbiAgICAgICAgICAgIGlmIChqKSB7XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2ldID0gZ3JhZGllbnRbal07XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2kgKyAxXSA9IGdyYWRpZW50W2ogKyAxXTtcbiAgICAgICAgICAgICAgICBwaXhlbHNbaSArIDJdID0gZ3JhZGllbnRbaiArIDJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9jcmVhdGVDYW52YXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBjYW52YXMgaW5zdGFuY2UgaW4gbm9kZS5qc1xuICAgICAgICAgICAgLy8gdGhlIGNhbnZhcyBjbGFzcyBuZWVkcyB0byBoYXZlIGEgZGVmYXVsdCBjb25zdHJ1Y3RvciB3aXRob3V0IGFueSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY2FudmFzLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiaW1wb3J0ICogYXMgbWFwdGFsa3MgZnJvbSAnbWFwdGFsa3MnO1xuaW1wb3J0IHNpbXBsZWhlYXQgZnJvbSAnc2ltcGxlaGVhdCc7XG5cbmNvbnN0IG9wdGlvbnMgPSB7XG4gICAgJ21heCcgOiAxLFxuICAgICdncmFkaWVudCcgOiB7XG4gICAgICAgIDAuNDogJ2JsdWUnLFxuICAgICAgICAwLjY6ICdjeWFuJyxcbiAgICAgICAgMC43OiAnbGltZScsXG4gICAgICAgIDAuODogJ3llbGxvdycsXG4gICAgICAgIDEuMDogJ3JlZCdcbiAgICB9LFxuICAgICdyYWRpdXMnIDogMjUsXG4gICAgJ2JsdXInIDogMTUsXG4gICAgJ21pbk9wYWNpdHknIDogMC4wNVxufTtcblxuZXhwb3J0IGNsYXNzIEhlYXRMYXllciBleHRlbmRzIG1hcHRhbGtzLkxheWVyIHtcblxuICAgIGNvbnN0cnVjdG9yKGlkLCBoZWF0cywgb3B0aW9ucykge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoaGVhdHMpKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gaGVhdHM7XG4gICAgICAgICAgICBoZWF0cyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIoaWQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9oZWF0cyA9IGhlYXRzIHx8IFtdO1xuICAgIH1cblxuICAgIGdldERhdGEoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWF0cztcbiAgICB9XG5cbiAgICBzZXREYXRhKGhlYXRzKSB7XG4gICAgICAgIHRoaXMuX2hlYXRzID0gaGVhdHMgfHwgW107XG4gICAgICAgIHJldHVybiB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIGFkZFBvaW50KGhlYXQpIHtcbiAgICAgICAgaWYgKCFoZWF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhdFswXSAmJiBBcnJheS5pc0FycmF5KGhlYXRbMF0pKSB7XG4gICAgICAgICAgICBtYXB0YWxrcy5VdGlsLnB1c2hJbih0aGlzLl9oZWF0cywgaGVhdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0cy5wdXNoKGhlYXQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIG9uQ29uZmlnKGNvbmYpIHtcbiAgICAgICAgc3VwZXIub25Db25maWcuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBwIGluIGNvbmYpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zW3BdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVkcmF3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcmVkcmF3KCkge1xuICAgICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuX2dldFJlbmRlcmVyKCk7XG4gICAgICAgIGlmIChyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIuY2xlYXJIZWF0Q2FjaGUoKTtcbiAgICAgICAgICAgIHJlbmRlcmVyLnJlbmRlcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlzRW1wdHkoKSB7XG4gICAgICAgIGlmICghdGhpcy5faGVhdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuX2hlYXRzID0gW107XG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgICAgIHRoaXMuZmlyZSgnY2xlYXInKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXhwb3J0IHRoZSBIZWF0TGF5ZXIncyBKU09OLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gbGF5ZXIncyBKU09OXG4gICAgICovXG4gICAgdG9KU09OKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgICd0eXBlJyAgICAgIDogdGhpcy5nZXRKU09OVHlwZSgpLFxuICAgICAgICAgICAgJ2lkJyAgICAgICAgOiB0aGlzLmdldElkKCksXG4gICAgICAgICAgICAnb3B0aW9ucycgICA6IHRoaXMuY29uZmlnKClcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YSgpO1xuICAgICAgICBpZiAob3B0aW9uc1snY2xpcEV4dGVudCddKSB7XG4gICAgICAgICAgICBsZXQgY2xpcEV4dGVudCA9IG5ldyBtYXB0YWxrcy5FeHRlbnQob3B0aW9uc1snY2xpcEV4dGVudCddKTtcbiAgICAgICAgICAgIGxldCByID0gdGhpcy5fZ2V0SGVhdFJhZGl1cygpO1xuICAgICAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgICAgICBjbGlwRXh0ZW50ID0gY2xpcEV4dGVudC5fZXhwYW5kKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IGNsaXBwZWQgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBkYXRhLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNsaXBFeHRlbnQuY29udGFpbnMobmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoZGF0YVtpXVswXSwgZGF0YVtpXVsxXSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsaXBwZWQucHVzaChkYXRhW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqc29uWydkYXRhJ10gPSBjbGlwcGVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAganNvblsnZGF0YSddID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBqc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlcHJvZHVjZSBhIEhlYXRMYXllciBmcm9tIGxheWVyJ3MgSlNPTi5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGpzb24gLSBsYXllcidzIEpTT05cbiAgICAgKiBAcmV0dXJuIHttYXB0YWxrcy5IZWF0TGF5ZXJ9XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICovXG4gICAgc3RhdGljIGZyb21KU09OKGpzb24pIHtcbiAgICAgICAgaWYgKCFqc29uIHx8IGpzb25bJ3R5cGUnXSAhPT0gJ0hlYXRMYXllcicpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgcmV0dXJuIG5ldyBIZWF0TGF5ZXIoanNvblsnaWQnXSwganNvblsnZGF0YSddLCBqc29uWydvcHRpb25zJ10pO1xuICAgIH1cblxuXG4gICAgX2dldEhlYXRSYWRpdXMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fZ2V0UmVuZGVyZXIoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldFJlbmRlcmVyKCkuX2hlYXRSYWRpdXM7XG4gICAgfVxufVxuXG5IZWF0TGF5ZXIubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xuXG5IZWF0TGF5ZXIucmVnaXN0ZXJKU09OVHlwZSgnSGVhdExheWVyJyk7XG5cbkhlYXRMYXllci5yZWdpc3RlclJlbmRlcmVyKCdjYW52YXMnLCBjbGFzcyBleHRlbmRzIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyIHtcblxuICAgIGRyYXcoKSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMuZ2V0TWFwKCksXG4gICAgICAgICAgICBsYXllciA9IHRoaXMubGF5ZXIsXG4gICAgICAgICAgICBleHRlbnQgPSBtYXAuZ2V0Q29udGFpbmVyRXh0ZW50KCk7XG4gICAgICAgIGxldCBtYXNrRXh0ZW50ID0gdGhpcy5wcmVwYXJlQ2FudmFzKCksXG4gICAgICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZXh0ZW50O1xuICAgICAgICBpZiAobWFza0V4dGVudCkge1xuICAgICAgICAgICAgbWFza0V4dGVudCA9IG1hc2tFeHRlbnQuY29udmVydFRvKGMgPT4gbWFwLl9wb2ludFRvQ29udGFpbmVyUG9pbnQoYykpO1xuICAgICAgICAgICAgLy9vdXQgb2YgbGF5ZXIgbWFza1xuICAgICAgICAgICAgaWYgKCFtYXNrRXh0ZW50LmludGVyc2VjdHMoZXh0ZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGVSZW5kZXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZXh0ZW50LmludGVyc2VjdGlvbihtYXNrRXh0ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5faGVhdGVyKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0ZXIgPSBzaW1wbGVoZWF0KHRoaXMuY2FudmFzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9oZWF0ZXIucmFkaXVzKGxheWVyLm9wdGlvbnNbJ3JhZGl1cyddIHx8IHRoaXMuX2hlYXRlci5kZWZhdWx0UmFkaXVzLCBsYXllci5vcHRpb25zWydibHVyJ10pO1xuICAgICAgICBpZiAobGF5ZXIub3B0aW9uc1snZ3JhZGllbnQnXSkge1xuICAgICAgICAgICAgdGhpcy5faGVhdGVyLmdyYWRpZW50KGxheWVyLm9wdGlvbnNbJ2dyYWRpZW50J10pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2hlYXRlci5tYXgobGF5ZXIub3B0aW9uc1snbWF4J10pO1xuICAgICAgICAvL2EgY2FjaGUgb2YgaGVhdCBwb2ludHMnIHZpZXdwb2ludHMuXG4gICAgICAgIGlmICghdGhpcy5faGVhdFZpZXdzKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0Vmlld3MgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhlYXRzID0gbGF5ZXIuZ2V0RGF0YSgpO1xuICAgICAgICBpZiAoaGVhdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuX2hlYXREYXRhKGhlYXRzLCBkaXNwbGF5RXh0ZW50KTtcbiAgICAgICAgdGhpcy5faGVhdGVyLmRhdGEoZGF0YSkuZHJhdyhsYXllci5vcHRpb25zWydtaW5PcGFjaXR5J10pO1xuICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgfVxuXG4gICAgX2hlYXREYXRhKGhlYXRzLCBkaXNwbGF5RXh0ZW50KSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMuZ2V0TWFwKCksXG4gICAgICAgICAgICBsYXllciA9IHRoaXMubGF5ZXI7XG4gICAgICAgIGNvbnN0IHByb2plY3Rpb24gPSBtYXAuZ2V0UHJvamVjdGlvbigpO1xuICAgICAgICBjb25zdCBkYXRhID0gW10sXG4gICAgICAgICAgICByID0gdGhpcy5faGVhdGVyLl9yLFxuICAgICAgICAgICAgbWF4ID0gbGF5ZXIub3B0aW9uc1snbWF4J10gPT09IHVuZGVmaW5lZCA/IDEgOiBsYXllci5vcHRpb25zWydtYXgnXSxcbiAgICAgICAgICAgIG1heFpvb20gPSBtYXB0YWxrcy5VdGlsLmlzTmlsKGxheWVyLm9wdGlvbnNbJ21heFpvb20nXSkgPyBtYXAuZ2V0TWF4Wm9vbSgpIDogbGF5ZXIub3B0aW9uc1snbWF4Wm9vbSddLFxuICAgICAgICAgICAgdiA9IDEgLyBNYXRoLnBvdygyLCBNYXRoLm1heCgwLCBNYXRoLm1pbihtYXhab29tIC0gbWFwLmdldFpvb20oKSwgMTIpKSksXG4gICAgICAgICAgICBjZWxsU2l6ZSA9IHIgLyAyLFxuICAgICAgICAgICAgZ3JpZCA9IFtdLFxuICAgICAgICAgICAgcGFuZVBvcyA9IG1hcC5vZmZzZXRQbGF0Zm9ybSgpLFxuICAgICAgICAgICAgb2Zmc2V0WCA9IHBhbmVQb3MueCAlIGNlbGxTaXplLFxuICAgICAgICAgICAgb2Zmc2V0WSA9IHBhbmVQb3MueSAlIGNlbGxTaXplO1xuICAgICAgICBsZXQgaGVhdCwgcCwgYWx0LCBjZWxsLCB4LCB5LCBrO1xuICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZGlzcGxheUV4dGVudC5leHBhbmQocikuY29udmVydFRvKGMgPT4gbmV3IG1hcHRhbGtzLlBvaW50KG1hcC5fY29udGFpbmVyUG9pbnRUb1ByaihjKSkpO1xuICAgICAgICB0aGlzLl9oZWF0UmFkaXVzID0gcjtcbiAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBoZWF0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGhlYXQgPSBoZWF0c1tpXTtcbiAgICAgICAgICAgIGlmICghdGhpcy5faGVhdFZpZXdzW2ldKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGVhdFZpZXdzW2ldID0gcHJvamVjdGlvbi5wcm9qZWN0KG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKGhlYXRbMF0sIGhlYXRbMV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHAgPSB0aGlzLl9oZWF0Vmlld3NbaV07XG4gICAgICAgICAgICBpZiAoZGlzcGxheUV4dGVudC5jb250YWlucyhwKSkge1xuICAgICAgICAgICAgICAgIHAgPSBtYXAuX3ByalRvQ29udGFpbmVyUG9pbnQocCk7XG4gICAgICAgICAgICAgICAgeCA9IE1hdGguZmxvb3IoKHAueCAtIG9mZnNldFgpIC8gY2VsbFNpemUpICsgMjtcbiAgICAgICAgICAgICAgICB5ID0gTWF0aC5mbG9vcigocC55IC0gb2Zmc2V0WSkgLyBjZWxsU2l6ZSkgKyAyO1xuXG4gICAgICAgICAgICAgICAgYWx0ID1cbiAgICAgICAgICAgICAgICAgICAgaGVhdC5hbHQgIT09IHVuZGVmaW5lZCA/IGhlYXQuYWx0IDpcbiAgICAgICAgICAgICAgICAgICAgaGVhdFsyXSAhPT0gdW5kZWZpbmVkID8gK2hlYXRbMl0gOiAxO1xuICAgICAgICAgICAgICAgIGsgPSBhbHQgKiB2O1xuXG4gICAgICAgICAgICAgICAgZ3JpZFt5XSA9IGdyaWRbeV0gfHwgW107XG4gICAgICAgICAgICAgICAgY2VsbCA9IGdyaWRbeV1beF07XG5cbiAgICAgICAgICAgICAgICBpZiAoIWNlbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JpZFt5XVt4XSA9IFtwLngsIHAueSwga107XG5cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjZWxsWzBdID0gKGNlbGxbMF0gKiBjZWxsWzJdICsgKHAueCkgKiBrKSAvIChjZWxsWzJdICsgayk7IC8vIHhcbiAgICAgICAgICAgICAgICAgICAgY2VsbFsxXSA9IChjZWxsWzFdICogY2VsbFsyXSArIChwLnkpICogaykgLyAoY2VsbFsyXSArIGspOyAvLyB5XG4gICAgICAgICAgICAgICAgICAgIGNlbGxbMl0gKz0gazsgLy8gY3VtdWxhdGVkIGludGVuc2l0eSB2YWx1ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IGdyaWQubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoZ3JpZFtpXSkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwLCBsbCA9IGdyaWRbaV0ubGVuZ3RoOyBqIDwgbGw7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBjZWxsID0gZ3JpZFtpXVtqXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNlbGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEucHVzaChbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZChjZWxsWzBdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKGNlbGxbMV0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgubWluKGNlbGxbMl0sIG1heClcbiAgICAgICAgICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIG9uWm9vbUVuZCgpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2hlYXRWaWV3cztcbiAgICAgICAgc3VwZXIub25ab29tRW5kLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgb25SZXNpemUoKSB7XG4gICAgICAgIHRoaXMuX2hlYXRlci5fd2lkdGggID0gdGhpcy5jYW52YXMud2lkdGg7XG4gICAgICAgIHRoaXMuX2hlYXRlci5faGVpZ2h0ID0gdGhpcy5jYW52YXMuaGVpZ2h0O1xuICAgICAgICBzdXBlci5vblJlc2l6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIG9uUmVtb3ZlKCkge1xuICAgICAgICB0aGlzLmNsZWFySGVhdENhY2hlKCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9oZWF0ZXI7XG4gICAgfVxuXG4gICAgY2xlYXJIZWF0Q2FjaGUoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9oZWF0Vmlld3M7XG4gICAgfVxufSk7XG4iXSwibmFtZXMiOlsibW9kdWxlIiwic2ltcGxlaGVhdCIsImNhbnZhcyIsIl9jYW52YXMiLCJkb2N1bWVudCIsImdldEVsZW1lbnRCeUlkIiwiX2N0eCIsImdldENvbnRleHQiLCJfd2lkdGgiLCJ3aWR0aCIsIl9oZWlnaHQiLCJoZWlnaHQiLCJfbWF4IiwiX2RhdGEiLCJwcm90b3R5cGUiLCJkYXRhIiwibWF4IiwicG9pbnQiLCJwdXNoIiwiciIsImJsdXIiLCJ1bmRlZmluZWQiLCJjaXJjbGUiLCJfY2lyY2xlIiwiX2NyZWF0ZUNhbnZhcyIsImN0eCIsInIyIiwiX3IiLCJzaGFkb3dPZmZzZXRYIiwic2hhZG93T2Zmc2V0WSIsInNoYWRvd0JsdXIiLCJzaGFkb3dDb2xvciIsImJlZ2luUGF0aCIsImFyYyIsIk1hdGgiLCJQSSIsImNsb3NlUGF0aCIsImZpbGwiLCJncmFkIiwiZ3JhZGllbnQiLCJjcmVhdGVMaW5lYXJHcmFkaWVudCIsImkiLCJhZGRDb2xvclN0b3AiLCJmaWxsU3R5bGUiLCJmaWxsUmVjdCIsIl9ncmFkIiwiZ2V0SW1hZ2VEYXRhIiwibWluT3BhY2l0eSIsInJhZGl1cyIsImRlZmF1bHRSYWRpdXMiLCJkZWZhdWx0R3JhZGllbnQiLCJjbGVhclJlY3QiLCJsZW4iLCJsZW5ndGgiLCJwIiwiZ2xvYmFsQWxwaGEiLCJkcmF3SW1hZ2UiLCJjb2xvcmVkIiwiX2NvbG9yaXplIiwicHV0SW1hZ2VEYXRhIiwicGl4ZWxzIiwiaiIsImNyZWF0ZUVsZW1lbnQiLCJjb25zdHJ1Y3RvciIsIm9wdGlvbnMiLCJIZWF0TGF5ZXIiLCJpZCIsImhlYXRzIiwiQXJyYXkiLCJpc0FycmF5IiwiX2hlYXRzIiwiZ2V0RGF0YSIsInNldERhdGEiLCJyZWRyYXciLCJhZGRQb2ludCIsImhlYXQiLCJwdXNoSW4iLCJvbkNvbmZpZyIsImNvbmYiLCJhcHBseSIsImFyZ3VtZW50cyIsInJlbmRlcmVyIiwiX2dldFJlbmRlcmVyIiwiY2xlYXJIZWF0Q2FjaGUiLCJyZW5kZXIiLCJpc0VtcHR5IiwiY2xlYXIiLCJmaXJlIiwidG9KU09OIiwianNvbiIsImdldEpTT05UeXBlIiwiZ2V0SWQiLCJjb25maWciLCJjbGlwRXh0ZW50IiwibWFwdGFsa3MiLCJfZ2V0SGVhdFJhZGl1cyIsIl9leHBhbmQiLCJjbGlwcGVkIiwiY29udGFpbnMiLCJmcm9tSlNPTiIsIl9oZWF0UmFkaXVzIiwibWVyZ2VPcHRpb25zIiwicmVnaXN0ZXJKU09OVHlwZSIsInJlZ2lzdGVyUmVuZGVyZXIiLCJkcmF3IiwibWFwIiwiZ2V0TWFwIiwibGF5ZXIiLCJleHRlbnQiLCJnZXRDb250YWluZXJFeHRlbnQiLCJtYXNrRXh0ZW50IiwicHJlcGFyZUNhbnZhcyIsImRpc3BsYXlFeHRlbnQiLCJjb252ZXJ0VG8iLCJfcG9pbnRUb0NvbnRhaW5lclBvaW50IiwiYyIsImludGVyc2VjdHMiLCJjb21wbGV0ZVJlbmRlciIsImludGVyc2VjdGlvbiIsIl9oZWF0ZXIiLCJfaGVhdFZpZXdzIiwiX2hlYXREYXRhIiwicHJvamVjdGlvbiIsImdldFByb2plY3Rpb24iLCJtYXhab29tIiwiaXNOaWwiLCJnZXRNYXhab29tIiwidiIsInBvdyIsIm1pbiIsImdldFpvb20iLCJjZWxsU2l6ZSIsImdyaWQiLCJwYW5lUG9zIiwib2Zmc2V0UGxhdGZvcm0iLCJvZmZzZXRYIiwieCIsIm9mZnNldFkiLCJ5IiwiYWx0IiwiY2VsbCIsImsiLCJleHBhbmQiLCJfY29udGFpbmVyUG9pbnRUb1ByaiIsImwiLCJwcm9qZWN0IiwiX3ByalRvQ29udGFpbmVyUG9pbnQiLCJmbG9vciIsImxsIiwicm91bmQiLCJvblpvb21FbmQiLCJvblJlc2l6ZSIsIm9uUmVtb3ZlIiwiQ2FudmFzUmVuZGVyZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVJLEFBQUosQUFBbUNBLGNBQUEsR0FBaUJDLFVBQWpCOzthQUUxQkEsVUFBVCxDQUFvQkMsTUFBcEIsRUFBNEI7WUFDcEIsRUFBRSxnQkFBZ0JELFVBQWxCLENBQUosRUFBbUMsT0FBTyxJQUFJQSxVQUFKLENBQWVDLE1BQWYsQ0FBUDs7YUFFOUJDLE9BQUwsR0FBZUQsU0FBUyxPQUFPQSxNQUFQLEtBQWtCLFFBQWxCLEdBQTZCRSxTQUFTQyxjQUFULENBQXdCSCxNQUF4QixDQUE3QixHQUErREEsTUFBdkY7O2FBRUtJLElBQUwsR0FBWUosT0FBT0ssVUFBUCxDQUFrQixJQUFsQixDQUFaO2FBQ0tDLE1BQUwsR0FBY04sT0FBT08sS0FBckI7YUFDS0MsT0FBTCxHQUFlUixPQUFPUyxNQUF0Qjs7YUFFS0MsSUFBTCxHQUFZLENBQVo7YUFDS0MsS0FBTCxHQUFhLEVBQWI7OztlQUdPQyxTQUFYLEdBQXVCOzt1QkFFSixFQUZJOzt5QkFJRjtpQkFDUixNQURRO2lCQUVSLE1BRlE7aUJBR1IsTUFIUTtpQkFJUixRQUpRO2lCQUtSO1NBVFU7O2NBWWIsY0FBVUMsS0FBVixFQUFnQjtpQkFDYkYsS0FBTCxHQUFhRSxLQUFiO21CQUNPLElBQVA7U0FkZTs7YUFpQmQsYUFBVUMsSUFBVixFQUFlO2lCQUNYSixJQUFMLEdBQVlJLElBQVo7bUJBQ08sSUFBUDtTQW5CZTs7YUFzQmQsYUFBVUMsS0FBVixFQUFpQjtpQkFDYkosS0FBTCxDQUFXSyxJQUFYLENBQWdCRCxLQUFoQjttQkFDTyxJQUFQ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
