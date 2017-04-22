/*!
 * maptalks.heatmap v0.3.0
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
    'gradient': { 0.4: 'blue', 0.65: 'lime', 1: 'red' },
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
            extent2d = map._get2DExtent(),
            maskExtent = this.prepareCanvas();
        var displayExtent = extent2d;
        if (maskExtent) {
            //out of layer mask
            if (!maskExtent.intersects(extent2d)) {
                this.completeRender();
                return;
            }
            displayExtent = extent2d.intersection(maskExtent);
        }
        var leftTop = map._pointToContainerPoint(extent2d.getMin());

        if (!this._heater) {
            this._heater = simpleheat_1(this.canvas);
        }
        this._heater.radius(layer.options['radius'] || this._heater.defaultRadius, layer.options['blur']);
        this._heater.gradient(layer.options['gradient']);
        this._heater.max(layer.options['max']);
        //a cache of heat points' viewpoints.
        if (!this._heatViews) {
            this._heatViews = [];
        }

        var heats = layer._heats;
        if (!maptalks.Util.isArrayHasData(heats)) {
            this.completeRender();
            return;
        }
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
        var i = void 0,
            len = void 0,
            heat = void 0,
            p = void 0,
            alt = void 0,
            cell = void 0,
            x = void 0,
            y = void 0,
            j = void 0,
            len2 = void 0,
            k = void 0;
        displayExtent = displayExtent.expand(r);
        this._heatRadius = r;
        // console.time('process');
        for (i = 0, len = heats.length; i < len; i++) {
            heat = heats[i];
            if (!this._heatViews[i]) {
                this._heatViews[i] = map.coordinateToPoint(new maptalks.Coordinate(heat[0], heat[1]));
            }
            p = this._heatViews[i];
            if (displayExtent.contains(p)) {
                p = map._pointToContainerPoint(p);
                x = Math.floor((p.x - leftTop.x - offsetX) / cellSize) + 2;
                y = Math.floor((p.y - leftTop.y - offsetY) / cellSize) + 2;

                alt = heat.alt !== undefined ? heat.alt : heat[2] !== undefined ? +heat[2] : 1;
                k = alt * v;

                grid[y] = grid[y] || [];
                cell = grid[y][x];

                if (!cell) {
                    grid[y][x] = [p.x - leftTop.x, p.y - leftTop.y, k];
                } else {
                    cell[0] = (cell[0] * cell[2] + (p.x - leftTop.x) * k) / (cell[2] + k); // x
                    cell[1] = (cell[1] * cell[2] + (p.y - leftTop.y) * k) / (cell[2] + k); // y
                    cell[2] += k; // cumulated intensity value
                }
            }
        }
        for (i = 0, len = grid.length; i < len; i++) {
            if (grid[i]) {
                for (j = 0, len2 = grid[i].length; j < len2; j++) {
                    cell = grid[i][j];
                    if (cell) {
                        data.push([Math.round(cell[0]), Math.round(cell[1]), Math.min(cell[2], max)]);
                    }
                }
            }
        }
        this._heater.data(data).draw(layer.options['minOpacity']);
        this.completeRender();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3MuaGVhdG1hcC5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3NpbXBsZWhlYXQvc2ltcGxlaGVhdC5qcyIsIi4uL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IHNpbXBsZWhlYXQ7XG5cbmZ1bmN0aW9uIHNpbXBsZWhlYXQoY2FudmFzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHNpbXBsZWhlYXQpKSByZXR1cm4gbmV3IHNpbXBsZWhlYXQoY2FudmFzKTtcblxuICAgIHRoaXMuX2NhbnZhcyA9IGNhbnZhcyA9IHR5cGVvZiBjYW52YXMgPT09ICdzdHJpbmcnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2FudmFzKSA6IGNhbnZhcztcblxuICAgIHRoaXMuX2N0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuICAgIHRoaXMuX2hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tYXggPSAxO1xuICAgIHRoaXMuX2RhdGEgPSBbXTtcbn1cblxuc2ltcGxlaGVhdC5wcm90b3R5cGUgPSB7XG5cbiAgICBkZWZhdWx0UmFkaXVzOiAyNSxcblxuICAgIGRlZmF1bHRHcmFkaWVudDoge1xuICAgICAgICAwLjQ6ICdibHVlJyxcbiAgICAgICAgMC42OiAnY3lhbicsXG4gICAgICAgIDAuNzogJ2xpbWUnLFxuICAgICAgICAwLjg6ICd5ZWxsb3cnLFxuICAgICAgICAxLjA6ICdyZWQnXG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgbWF4OiBmdW5jdGlvbiAobWF4KSB7XG4gICAgICAgIHRoaXMuX21heCA9IG1heDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAgIHRoaXMuX2RhdGEucHVzaChwb2ludCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kYXRhID0gW107XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICByYWRpdXM6IGZ1bmN0aW9uIChyLCBibHVyKSB7XG4gICAgICAgIGJsdXIgPSBibHVyID09PSB1bmRlZmluZWQgPyAxNSA6IGJsdXI7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgZ3JheXNjYWxlIGJsdXJyZWQgY2lyY2xlIGltYWdlIHRoYXQgd2UnbGwgdXNlIGZvciBkcmF3aW5nIHBvaW50c1xuICAgICAgICB2YXIgY2lyY2xlID0gdGhpcy5fY2lyY2xlID0gdGhpcy5fY3JlYXRlQ2FudmFzKCksXG4gICAgICAgICAgICBjdHggPSBjaXJjbGUuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgIHIyID0gdGhpcy5fciA9IHIgKyBibHVyO1xuXG4gICAgICAgIGNpcmNsZS53aWR0aCA9IGNpcmNsZS5oZWlnaHQgPSByMiAqIDI7XG5cbiAgICAgICAgY3R4LnNoYWRvd09mZnNldFggPSBjdHguc2hhZG93T2Zmc2V0WSA9IHIyICogMjtcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSBibHVyO1xuICAgICAgICBjdHguc2hhZG93Q29sb3IgPSAnYmxhY2snO1xuXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYygtcjIsIC1yMiwgciwgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgIGN0eC5maWxsKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlc2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl93aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgdGhpcy5faGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICB9LFxuXG4gICAgZ3JhZGllbnQ6IGZ1bmN0aW9uIChncmFkKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBhIDI1NngxIGdyYWRpZW50IHRoYXQgd2UnbGwgdXNlIHRvIHR1cm4gYSBncmF5c2NhbGUgaGVhdG1hcCBpbnRvIGEgY29sb3JlZCBvbmVcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NyZWF0ZUNhbnZhcygpLFxuICAgICAgICAgICAgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgICAgICBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCAyNTYpO1xuXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IDE7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAyNTY7XG5cbiAgICAgICAgZm9yICh2YXIgaSBpbiBncmFkKSB7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoK2ksIGdyYWRbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMSwgMjU2KTtcblxuICAgICAgICB0aGlzLl9ncmFkID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCAxLCAyNTYpLmRhdGE7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRyYXc6IGZ1bmN0aW9uIChtaW5PcGFjaXR5KSB7XG4gICAgICAgIGlmICghdGhpcy5fY2lyY2xlKSB0aGlzLnJhZGl1cyh0aGlzLmRlZmF1bHRSYWRpdXMpO1xuICAgICAgICBpZiAoIXRoaXMuX2dyYWQpIHRoaXMuZ3JhZGllbnQodGhpcy5kZWZhdWx0R3JhZGllbnQpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG5cbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgICAgICAvLyBkcmF3IGEgZ3JheXNjYWxlIGhlYXRtYXAgYnkgcHV0dGluZyBhIGJsdXJyZWQgY2lyY2xlIGF0IGVhY2ggZGF0YSBwb2ludFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fZGF0YS5sZW5ndGgsIHA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgcCA9IHRoaXMuX2RhdGFbaV07XG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heChwWzJdIC8gdGhpcy5fbWF4LCBtaW5PcGFjaXR5ID09PSB1bmRlZmluZWQgPyAwLjA1IDogbWluT3BhY2l0eSk7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuX2NpcmNsZSwgcFswXSAtIHRoaXMuX3IsIHBbMV0gLSB0aGlzLl9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbG9yaXplIHRoZSBoZWF0bWFwLCB1c2luZyBvcGFjaXR5IHZhbHVlIG9mIGVhY2ggcGl4ZWwgdG8gZ2V0IHRoZSByaWdodCBjb2xvciBmcm9tIG91ciBncmFkaWVudFxuICAgICAgICB2YXIgY29sb3JlZCA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG4gICAgICAgIHRoaXMuX2NvbG9yaXplKGNvbG9yZWQuZGF0YSwgdGhpcy5fZ3JhZCk7XG4gICAgICAgIGN0eC5wdXRJbWFnZURhdGEoY29sb3JlZCwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9jb2xvcml6ZTogZnVuY3Rpb24gKHBpeGVscywgZ3JhZGllbnQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBpeGVscy5sZW5ndGgsIGo7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgICAgICAgICAgaiA9IHBpeGVsc1tpICsgM10gKiA0OyAvLyBnZXQgZ3JhZGllbnQgY29sb3IgZnJvbSBvcGFjaXR5IHZhbHVlXG5cbiAgICAgICAgICAgIGlmIChqKSB7XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2ldID0gZ3JhZGllbnRbal07XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2kgKyAxXSA9IGdyYWRpZW50W2ogKyAxXTtcbiAgICAgICAgICAgICAgICBwaXhlbHNbaSArIDJdID0gZ3JhZGllbnRbaiArIDJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9jcmVhdGVDYW52YXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBjYW52YXMgaW5zdGFuY2UgaW4gbm9kZS5qc1xuICAgICAgICAgICAgLy8gdGhlIGNhbnZhcyBjbGFzcyBuZWVkcyB0byBoYXZlIGEgZGVmYXVsdCBjb25zdHJ1Y3RvciB3aXRob3V0IGFueSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY2FudmFzLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiaW1wb3J0ICogYXMgbWFwdGFsa3MgZnJvbSAnbWFwdGFsa3MnO1xuaW1wb3J0IHNpbXBsZWhlYXQgZnJvbSAnc2ltcGxlaGVhdCc7XG5cbmNvbnN0IG9wdGlvbnMgPSB7XG4gICAgJ21heCcgOiAxLFxuICAgICdncmFkaWVudCcgOiB7IDAuNDogJ2JsdWUnLCAwLjY1OiAnbGltZScsIDE6ICdyZWQnIH0sXG4gICAgJ3JhZGl1cycgOiAyNSxcbiAgICAnYmx1cicgOiAxNSxcbiAgICAnbWluT3BhY2l0eScgOiAwLjA1XG59O1xuXG5leHBvcnQgY2xhc3MgSGVhdExheWVyIGV4dGVuZHMgbWFwdGFsa3MuTGF5ZXIge1xuICAgIGNvbnN0cnVjdG9yKGlkLCBoZWF0cywgb3B0aW9ucykge1xuICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoaGVhdHMpKSB7XG4gICAgICAgICAgICBvcHRpb25zID0gaGVhdHM7XG4gICAgICAgICAgICBoZWF0cyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgc3VwZXIoaWQsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLl9oZWF0cyA9IGhlYXRzIHx8IFtdO1xuICAgIH1cblxuICAgIGdldERhdGEoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oZWF0cztcbiAgICB9XG5cbiAgICBzZXREYXRhKGhlYXRzKSB7XG4gICAgICAgIHRoaXMuX2hlYXRzID0gaGVhdHMgfHwgW107XG4gICAgICAgIHJldHVybiB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIGFkZFBvaW50KGhlYXQpIHtcbiAgICAgICAgaWYgKCFoZWF0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaGVhdFswXSAmJiBBcnJheS5pc0FycmF5KGhlYXRbMF0pKSB7XG4gICAgICAgICAgICBtYXB0YWxrcy5VdGlsLnB1c2hJbih0aGlzLl9oZWF0cywgaGVhdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0cy5wdXNoKGhlYXQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnJlZHJhdygpO1xuICAgIH1cblxuICAgIG9uQ29uZmlnKGNvbmYpIHtcbiAgICAgICAgc3VwZXIub25Db25maWcuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgZm9yIChjb25zdCBwIGluIGNvbmYpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zW3BdKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmVkcmF3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgcmVkcmF3KCkge1xuICAgICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuX2dldFJlbmRlcmVyKCk7XG4gICAgICAgIGlmIChyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIuY2xlYXJIZWF0Q2FjaGUoKTtcbiAgICAgICAgICAgIHJlbmRlcmVyLnJlbmRlcigpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIGlzRW1wdHkoKSB7XG4gICAgICAgIGlmICghdGhpcy5faGVhdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY2xlYXIoKSB7XG4gICAgICAgIHRoaXMuX2hlYXRzID0gW107XG4gICAgICAgIHRoaXMucmVkcmF3KCk7XG4gICAgICAgIHRoaXMuZmlyZSgnY2xlYXInKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogRXhwb3J0IHRoZSBIZWF0TGF5ZXIncyBKU09OLlxuICAgICAqIEByZXR1cm4ge09iamVjdH0gbGF5ZXIncyBKU09OXG4gICAgICovXG4gICAgdG9KU09OKG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IHtcbiAgICAgICAgICAgICd0eXBlJyAgICAgIDogdGhpcy5nZXRKU09OVHlwZSgpLFxuICAgICAgICAgICAgJ2lkJyAgICAgICAgOiB0aGlzLmdldElkKCksXG4gICAgICAgICAgICAnb3B0aW9ucycgICA6IHRoaXMuY29uZmlnKClcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZ2V0RGF0YSgpO1xuICAgICAgICBpZiAob3B0aW9uc1snY2xpcEV4dGVudCddKSB7XG4gICAgICAgICAgICBsZXQgY2xpcEV4dGVudCA9IG5ldyBtYXB0YWxrcy5FeHRlbnQob3B0aW9uc1snY2xpcEV4dGVudCddKTtcbiAgICAgICAgICAgIGxldCByID0gdGhpcy5fZ2V0SGVhdFJhZGl1cygpO1xuICAgICAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgICAgICBjbGlwRXh0ZW50ID0gY2xpcEV4dGVudC5fZXhwYW5kKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbGV0IGNsaXBwZWQgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBkYXRhLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNsaXBFeHRlbnQuY29udGFpbnMobmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoZGF0YVtpXVswXSwgZGF0YVtpXVsxXSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsaXBwZWQucHVzaChkYXRhW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqc29uWydkYXRhJ10gPSBjbGlwcGVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAganNvblsnZGF0YSddID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBqc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlcHJvZHVjZSBhIEhlYXRMYXllciBmcm9tIGxheWVyJ3MgSlNPTi5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGpzb24gLSBsYXllcidzIEpTT05cbiAgICAgKiBAcmV0dXJuIHttYXB0YWxrcy5IZWF0TGF5ZXJ9XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICovXG4gICAgc3RhdGljIGZyb21KU09OKGpzb24pIHtcbiAgICAgICAgaWYgKCFqc29uIHx8IGpzb25bJ3R5cGUnXSAhPT0gJ0hlYXRMYXllcicpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgcmV0dXJuIG5ldyBIZWF0TGF5ZXIoanNvblsnaWQnXSwganNvblsnZGF0YSddLCBqc29uWydvcHRpb25zJ10pO1xuICAgIH1cblxuXG4gICAgX2dldEhlYXRSYWRpdXMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fZ2V0UmVuZGVyZXIoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldFJlbmRlcmVyKCkuX2hlYXRSYWRpdXM7XG4gICAgfVxufVxuXG5IZWF0TGF5ZXIubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xuXG5IZWF0TGF5ZXIucmVnaXN0ZXJKU09OVHlwZSgnSGVhdExheWVyJyk7XG5cbkhlYXRMYXllci5yZWdpc3RlclJlbmRlcmVyKCdjYW52YXMnLCBjbGFzcyBleHRlbmRzIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyIHtcblxuICAgIGRyYXcoKSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMuZ2V0TWFwKCksXG4gICAgICAgICAgICBsYXllciA9IHRoaXMubGF5ZXIsXG4gICAgICAgICAgICBleHRlbnQyZCA9IG1hcC5fZ2V0MkRFeHRlbnQoKSxcbiAgICAgICAgICAgIG1hc2tFeHRlbnQgPSB0aGlzLnByZXBhcmVDYW52YXMoKTtcbiAgICAgICAgbGV0IGRpc3BsYXlFeHRlbnQgPSBleHRlbnQyZDtcbiAgICAgICAgaWYgKG1hc2tFeHRlbnQpIHtcbiAgICAgICAgICAgIC8vb3V0IG9mIGxheWVyIG1hc2tcbiAgICAgICAgICAgIGlmICghbWFza0V4dGVudC5pbnRlcnNlY3RzKGV4dGVudDJkKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGVSZW5kZXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZXh0ZW50MmQuaW50ZXJzZWN0aW9uKG1hc2tFeHRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGxlZnRUb3AgPSBtYXAuX3BvaW50VG9Db250YWluZXJQb2ludChleHRlbnQyZC5nZXRNaW4oKSk7XG5cbiAgICAgICAgaWYgKCF0aGlzLl9oZWF0ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYXRlciA9IHNpbXBsZWhlYXQodGhpcy5jYW52YXMpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2hlYXRlci5yYWRpdXMobGF5ZXIub3B0aW9uc1sncmFkaXVzJ10gfHwgdGhpcy5faGVhdGVyLmRlZmF1bHRSYWRpdXMsIGxheWVyLm9wdGlvbnNbJ2JsdXInXSk7XG4gICAgICAgIHRoaXMuX2hlYXRlci5ncmFkaWVudChsYXllci5vcHRpb25zWydncmFkaWVudCddKTtcbiAgICAgICAgdGhpcy5faGVhdGVyLm1heChsYXllci5vcHRpb25zWydtYXgnXSk7XG4gICAgICAgIC8vYSBjYWNoZSBvZiBoZWF0IHBvaW50cycgdmlld3BvaW50cy5cbiAgICAgICAgaWYgKCF0aGlzLl9oZWF0Vmlld3MpIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYXRWaWV3cyA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGVhdHMgPSBsYXllci5faGVhdHM7XG4gICAgICAgIGlmICghbWFwdGFsa3MuVXRpbC5pc0FycmF5SGFzRGF0YShoZWF0cykpIHtcbiAgICAgICAgICAgIHRoaXMuY29tcGxldGVSZW5kZXIoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkYXRhID0gW10sXG4gICAgICAgICAgICByID0gdGhpcy5faGVhdGVyLl9yLFxuICAgICAgICAgICAgbWF4ID0gbGF5ZXIub3B0aW9uc1snbWF4J10gPT09IHVuZGVmaW5lZCA/IDEgOiBsYXllci5vcHRpb25zWydtYXgnXSxcbiAgICAgICAgICAgIG1heFpvb20gPSBtYXB0YWxrcy5VdGlsLmlzTmlsKGxheWVyLm9wdGlvbnNbJ21heFpvb20nXSkgPyBtYXAuZ2V0TWF4Wm9vbSgpIDogbGF5ZXIub3B0aW9uc1snbWF4Wm9vbSddLFxuICAgICAgICAgICAgdiA9IDEgLyBNYXRoLnBvdygyLCBNYXRoLm1heCgwLCBNYXRoLm1pbihtYXhab29tIC0gbWFwLmdldFpvb20oKSwgMTIpKSksXG4gICAgICAgICAgICBjZWxsU2l6ZSA9IHIgLyAyLFxuICAgICAgICAgICAgZ3JpZCA9IFtdLFxuICAgICAgICAgICAgcGFuZVBvcyA9IG1hcC5vZmZzZXRQbGF0Zm9ybSgpLFxuICAgICAgICAgICAgb2Zmc2V0WCA9IHBhbmVQb3MueCAlIGNlbGxTaXplLFxuICAgICAgICAgICAgb2Zmc2V0WSA9IHBhbmVQb3MueSAlIGNlbGxTaXplO1xuICAgICAgICBsZXQgaSwgbGVuLCBoZWF0LCBwLCBhbHQsIGNlbGwsIHgsIHksIGosIGxlbjIsIGs7XG4gICAgICAgIGRpc3BsYXlFeHRlbnQgPSBkaXNwbGF5RXh0ZW50LmV4cGFuZChyKTtcbiAgICAgICAgdGhpcy5faGVhdFJhZGl1cyA9IHI7XG4gICAgICAgIC8vIGNvbnNvbGUudGltZSgncHJvY2VzcycpO1xuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSBoZWF0cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaGVhdCA9IGhlYXRzW2ldO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9oZWF0Vmlld3NbaV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9oZWF0Vmlld3NbaV0gPSBtYXAuY29vcmRpbmF0ZVRvUG9pbnQobmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoaGVhdFswXSwgaGVhdFsxXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcCA9IHRoaXMuX2hlYXRWaWV3c1tpXTtcbiAgICAgICAgICAgIGlmIChkaXNwbGF5RXh0ZW50LmNvbnRhaW5zKHApKSB7XG4gICAgICAgICAgICAgICAgcCA9IG1hcC5fcG9pbnRUb0NvbnRhaW5lclBvaW50KHApO1xuICAgICAgICAgICAgICAgIHggPSBNYXRoLmZsb29yKChwLnggLSBsZWZ0VG9wLnggLSBvZmZzZXRYKSAvIGNlbGxTaXplKSArIDI7XG4gICAgICAgICAgICAgICAgeSA9IE1hdGguZmxvb3IoKHAueSAtIGxlZnRUb3AueSAtIG9mZnNldFkpIC8gY2VsbFNpemUpICsgMjtcblxuICAgICAgICAgICAgICAgIGFsdCA9XG4gICAgICAgICAgICAgICAgICAgIGhlYXQuYWx0ICE9PSB1bmRlZmluZWQgPyBoZWF0LmFsdCA6XG4gICAgICAgICAgICAgICAgICAgIGhlYXRbMl0gIT09IHVuZGVmaW5lZCA/ICtoZWF0WzJdIDogMTtcbiAgICAgICAgICAgICAgICBrID0gYWx0ICogdjtcblxuICAgICAgICAgICAgICAgIGdyaWRbeV0gPSBncmlkW3ldIHx8IFtdO1xuICAgICAgICAgICAgICAgIGNlbGwgPSBncmlkW3ldW3hdO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFjZWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyaWRbeV1beF0gPSBbcC54IC0gbGVmdFRvcC54LCBwLnkgLSBsZWZ0VG9wLnksIGtdO1xuXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2VsbFswXSA9IChjZWxsWzBdICogY2VsbFsyXSArIChwLnggLSBsZWZ0VG9wLngpICogaykgLyAoY2VsbFsyXSArIGspOyAvLyB4XG4gICAgICAgICAgICAgICAgICAgIGNlbGxbMV0gPSAoY2VsbFsxXSAqIGNlbGxbMl0gKyAocC55IC0gbGVmdFRvcC55KSAqIGspIC8gKGNlbGxbMl0gKyBrKTsgLy8geVxuICAgICAgICAgICAgICAgICAgICBjZWxsWzJdICs9IGs7IC8vIGN1bXVsYXRlZCBpbnRlbnNpdHkgdmFsdWVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gZ3JpZC5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgaWYgKGdyaWRbaV0pIHtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAwLCBsZW4yID0gZ3JpZFtpXS5sZW5ndGg7IGogPCBsZW4yOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgY2VsbCA9IGdyaWRbaV1bal07XG4gICAgICAgICAgICAgICAgICAgIGlmIChjZWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLnB1c2goW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQoY2VsbFswXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5yb3VuZChjZWxsWzFdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLm1pbihjZWxsWzJdLCBtYXgpXG4gICAgICAgICAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9oZWF0ZXIuZGF0YShkYXRhKS5kcmF3KGxheWVyLm9wdGlvbnNbJ21pbk9wYWNpdHknXSk7XG4gICAgICAgIHRoaXMuY29tcGxldGVSZW5kZXIoKTtcbiAgICB9XG5cbiAgICBvblpvb21FbmQoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9oZWF0Vmlld3M7XG4gICAgICAgIHN1cGVyLm9uWm9vbUVuZC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIG9uUmVzaXplKCkge1xuICAgICAgICB0aGlzLl9oZWF0ZXIuX3dpZHRoICA9IHRoaXMuY2FudmFzLndpZHRoO1xuICAgICAgICB0aGlzLl9oZWF0ZXIuX2hlaWdodCA9IHRoaXMuY2FudmFzLmhlaWdodDtcbiAgICAgICAgc3VwZXIub25SZXNpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBvblJlbW92ZSgpIHtcbiAgICAgICAgdGhpcy5jbGVhckhlYXRDYWNoZSgpO1xuICAgICAgICBkZWxldGUgdGhpcy5faGVhdGVyO1xuICAgIH1cblxuICAgIGNsZWFySGVhdENhY2hlKCkge1xuICAgICAgICBkZWxldGUgdGhpcy5faGVhdFZpZXdzO1xuICAgIH1cbn0pO1xuIl0sIm5hbWVzIjpbIm1vZHVsZSIsInNpbXBsZWhlYXQiLCJjYW52YXMiLCJfY2FudmFzIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsIl9jdHgiLCJnZXRDb250ZXh0IiwiX3dpZHRoIiwid2lkdGgiLCJfaGVpZ2h0IiwiaGVpZ2h0IiwiX21heCIsIl9kYXRhIiwicHJvdG90eXBlIiwiZGF0YSIsIm1heCIsInBvaW50IiwicHVzaCIsInIiLCJibHVyIiwidW5kZWZpbmVkIiwiY2lyY2xlIiwiX2NpcmNsZSIsIl9jcmVhdGVDYW52YXMiLCJjdHgiLCJyMiIsIl9yIiwic2hhZG93T2Zmc2V0WCIsInNoYWRvd09mZnNldFkiLCJzaGFkb3dCbHVyIiwic2hhZG93Q29sb3IiLCJiZWdpblBhdGgiLCJhcmMiLCJNYXRoIiwiUEkiLCJjbG9zZVBhdGgiLCJmaWxsIiwiZ3JhZCIsImdyYWRpZW50IiwiY3JlYXRlTGluZWFyR3JhZGllbnQiLCJpIiwiYWRkQ29sb3JTdG9wIiwiZmlsbFN0eWxlIiwiZmlsbFJlY3QiLCJfZ3JhZCIsImdldEltYWdlRGF0YSIsIm1pbk9wYWNpdHkiLCJyYWRpdXMiLCJkZWZhdWx0UmFkaXVzIiwiZGVmYXVsdEdyYWRpZW50IiwiY2xlYXJSZWN0IiwibGVuIiwibGVuZ3RoIiwicCIsImdsb2JhbEFscGhhIiwiZHJhd0ltYWdlIiwiY29sb3JlZCIsIl9jb2xvcml6ZSIsInB1dEltYWdlRGF0YSIsInBpeGVscyIsImoiLCJjcmVhdGVFbGVtZW50IiwiY29uc3RydWN0b3IiLCJvcHRpb25zIiwiSGVhdExheWVyIiwiaWQiLCJoZWF0cyIsIkFycmF5IiwiaXNBcnJheSIsIl9oZWF0cyIsImdldERhdGEiLCJzZXREYXRhIiwicmVkcmF3IiwiYWRkUG9pbnQiLCJoZWF0IiwicHVzaEluIiwib25Db25maWciLCJjb25mIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJyZW5kZXJlciIsIl9nZXRSZW5kZXJlciIsImNsZWFySGVhdENhY2hlIiwicmVuZGVyIiwiaXNFbXB0eSIsImNsZWFyIiwiZmlyZSIsInRvSlNPTiIsImpzb24iLCJnZXRKU09OVHlwZSIsImdldElkIiwiY29uZmlnIiwiY2xpcEV4dGVudCIsIm1hcHRhbGtzIiwiX2dldEhlYXRSYWRpdXMiLCJfZXhwYW5kIiwiY2xpcHBlZCIsImNvbnRhaW5zIiwiZnJvbUpTT04iLCJfaGVhdFJhZGl1cyIsIm1lcmdlT3B0aW9ucyIsInJlZ2lzdGVySlNPTlR5cGUiLCJyZWdpc3RlclJlbmRlcmVyIiwiZHJhdyIsIm1hcCIsImdldE1hcCIsImxheWVyIiwiZXh0ZW50MmQiLCJfZ2V0MkRFeHRlbnQiLCJtYXNrRXh0ZW50IiwicHJlcGFyZUNhbnZhcyIsImRpc3BsYXlFeHRlbnQiLCJpbnRlcnNlY3RzIiwiY29tcGxldGVSZW5kZXIiLCJpbnRlcnNlY3Rpb24iLCJsZWZ0VG9wIiwiX3BvaW50VG9Db250YWluZXJQb2ludCIsImdldE1pbiIsIl9oZWF0ZXIiLCJfaGVhdFZpZXdzIiwiaXNBcnJheUhhc0RhdGEiLCJtYXhab29tIiwiaXNOaWwiLCJnZXRNYXhab29tIiwidiIsInBvdyIsIm1pbiIsImdldFpvb20iLCJjZWxsU2l6ZSIsImdyaWQiLCJwYW5lUG9zIiwib2Zmc2V0UGxhdGZvcm0iLCJvZmZzZXRYIiwieCIsIm9mZnNldFkiLCJ5IiwiYWx0IiwiY2VsbCIsImxlbjIiLCJrIiwiZXhwYW5kIiwiY29vcmRpbmF0ZVRvUG9pbnQiLCJmbG9vciIsInJvdW5kIiwib25ab29tRW5kIiwib25SZXNpemUiLCJvblJlbW92ZSIsIkNhbnZhc1JlbmRlcmVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFFSSxBQUFKLEFBQW1DQSxjQUFBLEdBQWlCQyxVQUFqQjs7YUFFMUJBLFVBQVQsQ0FBb0JDLE1BQXBCLEVBQTRCO1lBQ3BCLEVBQUUsZ0JBQWdCRCxVQUFsQixDQUFKLEVBQW1DLE9BQU8sSUFBSUEsVUFBSixDQUFlQyxNQUFmLENBQVA7O2FBRTlCQyxP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
