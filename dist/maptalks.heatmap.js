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
        if (layer.options['gradient']) {
            this._heater.gradient(layer.options['gradient']);
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3MuaGVhdG1hcC5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3NpbXBsZWhlYXQvc2ltcGxlaGVhdC5qcyIsIi4uL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IHNpbXBsZWhlYXQ7XG5cbmZ1bmN0aW9uIHNpbXBsZWhlYXQoY2FudmFzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHNpbXBsZWhlYXQpKSByZXR1cm4gbmV3IHNpbXBsZWhlYXQoY2FudmFzKTtcblxuICAgIHRoaXMuX2NhbnZhcyA9IGNhbnZhcyA9IHR5cGVvZiBjYW52YXMgPT09ICdzdHJpbmcnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2FudmFzKSA6IGNhbnZhcztcblxuICAgIHRoaXMuX2N0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuICAgIHRoaXMuX2hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tYXggPSAxO1xuICAgIHRoaXMuX2RhdGEgPSBbXTtcbn1cblxuc2ltcGxlaGVhdC5wcm90b3R5cGUgPSB7XG5cbiAgICBkZWZhdWx0UmFkaXVzOiAyNSxcblxuICAgIGRlZmF1bHRHcmFkaWVudDoge1xuICAgICAgICAwLjQ6ICdibHVlJyxcbiAgICAgICAgMC42OiAnY3lhbicsXG4gICAgICAgIDAuNzogJ2xpbWUnLFxuICAgICAgICAwLjg6ICd5ZWxsb3cnLFxuICAgICAgICAxLjA6ICdyZWQnXG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgbWF4OiBmdW5jdGlvbiAobWF4KSB7XG4gICAgICAgIHRoaXMuX21heCA9IG1heDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAgIHRoaXMuX2RhdGEucHVzaChwb2ludCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kYXRhID0gW107XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICByYWRpdXM6IGZ1bmN0aW9uIChyLCBibHVyKSB7XG4gICAgICAgIGJsdXIgPSBibHVyID09PSB1bmRlZmluZWQgPyAxNSA6IGJsdXI7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgZ3JheXNjYWxlIGJsdXJyZWQgY2lyY2xlIGltYWdlIHRoYXQgd2UnbGwgdXNlIGZvciBkcmF3aW5nIHBvaW50c1xuICAgICAgICB2YXIgY2lyY2xlID0gdGhpcy5fY2lyY2xlID0gdGhpcy5fY3JlYXRlQ2FudmFzKCksXG4gICAgICAgICAgICBjdHggPSBjaXJjbGUuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgIHIyID0gdGhpcy5fciA9IHIgKyBibHVyO1xuXG4gICAgICAgIGNpcmNsZS53aWR0aCA9IGNpcmNsZS5oZWlnaHQgPSByMiAqIDI7XG5cbiAgICAgICAgY3R4LnNoYWRvd09mZnNldFggPSBjdHguc2hhZG93T2Zmc2V0WSA9IHIyICogMjtcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSBibHVyO1xuICAgICAgICBjdHguc2hhZG93Q29sb3IgPSAnYmxhY2snO1xuXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYygtcjIsIC1yMiwgciwgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgIGN0eC5maWxsKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlc2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl93aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgdGhpcy5faGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICB9LFxuXG4gICAgZ3JhZGllbnQ6IGZ1bmN0aW9uIChncmFkKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBhIDI1NngxIGdyYWRpZW50IHRoYXQgd2UnbGwgdXNlIHRvIHR1cm4gYSBncmF5c2NhbGUgaGVhdG1hcCBpbnRvIGEgY29sb3JlZCBvbmVcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NyZWF0ZUNhbnZhcygpLFxuICAgICAgICAgICAgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgICAgICBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCAyNTYpO1xuXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IDE7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAyNTY7XG5cbiAgICAgICAgZm9yICh2YXIgaSBpbiBncmFkKSB7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoK2ksIGdyYWRbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMSwgMjU2KTtcblxuICAgICAgICB0aGlzLl9ncmFkID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCAxLCAyNTYpLmRhdGE7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRyYXc6IGZ1bmN0aW9uIChtaW5PcGFjaXR5KSB7XG4gICAgICAgIGlmICghdGhpcy5fY2lyY2xlKSB0aGlzLnJhZGl1cyh0aGlzLmRlZmF1bHRSYWRpdXMpO1xuICAgICAgICBpZiAoIXRoaXMuX2dyYWQpIHRoaXMuZ3JhZGllbnQodGhpcy5kZWZhdWx0R3JhZGllbnQpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG5cbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgICAgICAvLyBkcmF3IGEgZ3JheXNjYWxlIGhlYXRtYXAgYnkgcHV0dGluZyBhIGJsdXJyZWQgY2lyY2xlIGF0IGVhY2ggZGF0YSBwb2ludFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fZGF0YS5sZW5ndGgsIHA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgcCA9IHRoaXMuX2RhdGFbaV07XG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heChwWzJdIC8gdGhpcy5fbWF4LCBtaW5PcGFjaXR5ID09PSB1bmRlZmluZWQgPyAwLjA1IDogbWluT3BhY2l0eSk7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuX2NpcmNsZSwgcFswXSAtIHRoaXMuX3IsIHBbMV0gLSB0aGlzLl9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbG9yaXplIHRoZSBoZWF0bWFwLCB1c2luZyBvcGFjaXR5IHZhbHVlIG9mIGVhY2ggcGl4ZWwgdG8gZ2V0IHRoZSByaWdodCBjb2xvciBmcm9tIG91ciBncmFkaWVudFxuICAgICAgICB2YXIgY29sb3JlZCA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG4gICAgICAgIHRoaXMuX2NvbG9yaXplKGNvbG9yZWQuZGF0YSwgdGhpcy5fZ3JhZCk7XG4gICAgICAgIGN0eC5wdXRJbWFnZURhdGEoY29sb3JlZCwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9jb2xvcml6ZTogZnVuY3Rpb24gKHBpeGVscywgZ3JhZGllbnQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBpeGVscy5sZW5ndGgsIGo7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgICAgICAgICAgaiA9IHBpeGVsc1tpICsgM10gKiA0OyAvLyBnZXQgZ3JhZGllbnQgY29sb3IgZnJvbSBvcGFjaXR5IHZhbHVlXG5cbiAgICAgICAgICAgIGlmIChqKSB7XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2ldID0gZ3JhZGllbnRbal07XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2kgKyAxXSA9IGdyYWRpZW50W2ogKyAxXTtcbiAgICAgICAgICAgICAgICBwaXhlbHNbaSArIDJdID0gZ3JhZGllbnRbaiArIDJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9jcmVhdGVDYW52YXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBjYW52YXMgaW5zdGFuY2UgaW4gbm9kZS5qc1xuICAgICAgICAgICAgLy8gdGhlIGNhbnZhcyBjbGFzcyBuZWVkcyB0byBoYXZlIGEgZGVmYXVsdCBjb25zdHJ1Y3RvciB3aXRob3V0IGFueSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY2FudmFzLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiaW1wb3J0ICogYXMgbWFwdGFsa3MgZnJvbSAnbWFwdGFsa3MnO1xuaW1wb3J0IHNpbXBsZWhlYXQgZnJvbSAnc2ltcGxlaGVhdCc7XG5cbmNvbnN0IG9wdGlvbnMgPSB7XG4gICAgJ21heCcgOiAxLFxuICAgICdncmFkaWVudCcgOiB7XG4gICAgICAgIDAuNDogJ2JsdWUnLFxuICAgICAgICAwLjY6ICdjeWFuJyxcbiAgICAgICAgMC43OiAnbGltZScsXG4gICAgICAgIDAuODogJ3llbGxvdycsXG4gICAgICAgIDEuMDogJ3JlZCdcbiAgICB9LFxuICAgICdyYWRpdXMnIDogMjUsXG4gICAgJ2JsdXInIDogMTUsXG4gICAgJ21pbk9wYWNpdHknIDogMC4wNVxufTtcblxuZXhwb3J0IGNsYXNzIEhlYXRMYXllciBleHRlbmRzIG1hcHRhbGtzLkxheWVyIHtcbiAgICBjb25zdHJ1Y3RvcihpZCwgaGVhdHMsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGhlYXRzKSkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IGhlYXRzO1xuICAgICAgICAgICAgaGVhdHMgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHN1cGVyKGlkLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5faGVhdHMgPSBoZWF0cyB8fCBbXTtcbiAgICB9XG5cbiAgICBnZXREYXRhKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVhdHM7XG4gICAgfVxuXG4gICAgc2V0RGF0YShoZWF0cykge1xuICAgICAgICB0aGlzLl9oZWF0cyA9IGhlYXRzIHx8IFtdO1xuICAgICAgICByZXR1cm4gdGhpcy5yZWRyYXcoKTtcbiAgICB9XG5cbiAgICBhZGRQb2ludChoZWF0KSB7XG4gICAgICAgIGlmICghaGVhdCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhlYXRbMF0gJiYgQXJyYXkuaXNBcnJheShoZWF0WzBdKSkge1xuICAgICAgICAgICAgbWFwdGFsa3MuVXRpbC5wdXNoSW4odGhpcy5faGVhdHMsIGhlYXQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5faGVhdHMucHVzaChoZWF0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5yZWRyYXcoKTtcbiAgICB9XG5cbiAgICBvbkNvbmZpZyhjb25mKSB7XG4gICAgICAgIHN1cGVyLm9uQ29uZmlnLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGZvciAoY29uc3QgcCBpbiBjb25mKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9uc1twXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJlZHJhdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIHJlZHJhdygpIHtcbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLl9nZXRSZW5kZXJlcigpO1xuICAgICAgICBpZiAocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLmNsZWFySGVhdENhY2hlKCk7XG4gICAgICAgICAgICByZW5kZXJlci5yZW5kZXIoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBpc0VtcHR5KCkge1xuICAgICAgICBpZiAoIXRoaXMuX2hlYXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLl9oZWF0cyA9IFtdO1xuICAgICAgICB0aGlzLnJlZHJhdygpO1xuICAgICAgICB0aGlzLmZpcmUoJ2NsZWFyJyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEV4cG9ydCB0aGUgSGVhdExheWVyJ3MgSlNPTi5cbiAgICAgKiBAcmV0dXJuIHtPYmplY3R9IGxheWVyJ3MgSlNPTlxuICAgICAqL1xuICAgIHRvSlNPTihvcHRpb25zKSB7XG4gICAgICAgIGlmICghb3B0aW9ucykge1xuICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGpzb24gPSB7XG4gICAgICAgICAgICAndHlwZScgICAgICA6IHRoaXMuZ2V0SlNPTlR5cGUoKSxcbiAgICAgICAgICAgICdpZCcgICAgICAgIDogdGhpcy5nZXRJZCgpLFxuICAgICAgICAgICAgJ29wdGlvbnMnICAgOiB0aGlzLmNvbmZpZygpXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmdldERhdGEoKTtcbiAgICAgICAgaWYgKG9wdGlvbnNbJ2NsaXBFeHRlbnQnXSkge1xuICAgICAgICAgICAgbGV0IGNsaXBFeHRlbnQgPSBuZXcgbWFwdGFsa3MuRXh0ZW50KG9wdGlvbnNbJ2NsaXBFeHRlbnQnXSk7XG4gICAgICAgICAgICBsZXQgciA9IHRoaXMuX2dldEhlYXRSYWRpdXMoKTtcbiAgICAgICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICAgICAgY2xpcEV4dGVudCA9IGNsaXBFeHRlbnQuX2V4cGFuZChyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxldCBjbGlwcGVkID0gW107XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gZGF0YS5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChjbGlwRXh0ZW50LmNvbnRhaW5zKG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKGRhdGFbaV1bMF0sIGRhdGFbaV1bMV0pKSkge1xuICAgICAgICAgICAgICAgICAgICBjbGlwcGVkLnB1c2goZGF0YVtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAganNvblsnZGF0YSddID0gY2xpcHBlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGpzb25bJ2RhdGEnXSA9IGRhdGE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4ganNvbjtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXByb2R1Y2UgYSBIZWF0TGF5ZXIgZnJvbSBsYXllcidzIEpTT04uXG4gICAgICogQHBhcmFtICB7T2JqZWN0fSBqc29uIC0gbGF5ZXIncyBKU09OXG4gICAgICogQHJldHVybiB7bWFwdGFsa3MuSGVhdExheWVyfVxuICAgICAqIEBzdGF0aWNcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqIEBmdW5jdGlvblxuICAgICAqL1xuICAgIHN0YXRpYyBmcm9tSlNPTihqc29uKSB7XG4gICAgICAgIGlmICghanNvbiB8fCBqc29uWyd0eXBlJ10gIT09ICdIZWF0TGF5ZXInKSB7IHJldHVybiBudWxsOyB9XG4gICAgICAgIHJldHVybiBuZXcgSGVhdExheWVyKGpzb25bJ2lkJ10sIGpzb25bJ2RhdGEnXSwganNvblsnb3B0aW9ucyddKTtcbiAgICB9XG5cblxuICAgIF9nZXRIZWF0UmFkaXVzKCkge1xuICAgICAgICBpZiAoIXRoaXMuX2dldFJlbmRlcmVyKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9nZXRSZW5kZXJlcigpLl9oZWF0UmFkaXVzO1xuICAgIH1cbn1cblxuSGVhdExheWVyLm1lcmdlT3B0aW9ucyhvcHRpb25zKTtcblxuSGVhdExheWVyLnJlZ2lzdGVySlNPTlR5cGUoJ0hlYXRMYXllcicpO1xuXG5IZWF0TGF5ZXIucmVnaXN0ZXJSZW5kZXJlcignY2FudmFzJywgY2xhc3MgZXh0ZW5kcyBtYXB0YWxrcy5yZW5kZXJlci5DYW52YXNSZW5kZXJlciB7XG5cbiAgICBkcmF3KCkge1xuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmdldE1hcCgpLFxuICAgICAgICAgICAgbGF5ZXIgPSB0aGlzLmxheWVyLFxuICAgICAgICAgICAgZXh0ZW50MmQgPSBtYXAuX2dldDJERXh0ZW50KCksXG4gICAgICAgICAgICBtYXNrRXh0ZW50ID0gdGhpcy5wcmVwYXJlQ2FudmFzKCk7XG4gICAgICAgIGxldCBkaXNwbGF5RXh0ZW50ID0gZXh0ZW50MmQ7XG4gICAgICAgIGlmIChtYXNrRXh0ZW50KSB7XG4gICAgICAgICAgICAvL291dCBvZiBsYXllciBtYXNrXG4gICAgICAgICAgICBpZiAoIW1hc2tFeHRlbnQuaW50ZXJzZWN0cyhleHRlbnQyZCkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGlzcGxheUV4dGVudCA9IGV4dGVudDJkLmludGVyc2VjdGlvbihtYXNrRXh0ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBsZWZ0VG9wID0gbWFwLl9wb2ludFRvQ29udGFpbmVyUG9pbnQoZXh0ZW50MmQuZ2V0TWluKCkpO1xuXG4gICAgICAgIGlmICghdGhpcy5faGVhdGVyKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0ZXIgPSBzaW1wbGVoZWF0KHRoaXMuY2FudmFzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9oZWF0ZXIucmFkaXVzKGxheWVyLm9wdGlvbnNbJ3JhZGl1cyddIHx8IHRoaXMuX2hlYXRlci5kZWZhdWx0UmFkaXVzLCBsYXllci5vcHRpb25zWydibHVyJ10pO1xuICAgICAgICBpZiAobGF5ZXIub3B0aW9uc1snZ3JhZGllbnQnXSkge1xuICAgICAgICAgICAgdGhpcy5faGVhdGVyLmdyYWRpZW50KGxheWVyLm9wdGlvbnNbJ2dyYWRpZW50J10pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2hlYXRlci5tYXgobGF5ZXIub3B0aW9uc1snbWF4J10pO1xuICAgICAgICAvL2EgY2FjaGUgb2YgaGVhdCBwb2ludHMnIHZpZXdwb2ludHMuXG4gICAgICAgIGlmICghdGhpcy5faGVhdFZpZXdzKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0Vmlld3MgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhlYXRzID0gbGF5ZXIuX2hlYXRzO1xuICAgICAgICBpZiAoIW1hcHRhbGtzLlV0aWwuaXNBcnJheUhhc0RhdGEoaGVhdHMpKSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGF0YSA9IFtdLFxuICAgICAgICAgICAgciA9IHRoaXMuX2hlYXRlci5fcixcbiAgICAgICAgICAgIG1heCA9IGxheWVyLm9wdGlvbnNbJ21heCddID09PSB1bmRlZmluZWQgPyAxIDogbGF5ZXIub3B0aW9uc1snbWF4J10sXG4gICAgICAgICAgICBtYXhab29tID0gbWFwdGFsa3MuVXRpbC5pc05pbChsYXllci5vcHRpb25zWydtYXhab29tJ10pID8gbWFwLmdldE1heFpvb20oKSA6IGxheWVyLm9wdGlvbnNbJ21heFpvb20nXSxcbiAgICAgICAgICAgIHYgPSAxIC8gTWF0aC5wb3coMiwgTWF0aC5tYXgoMCwgTWF0aC5taW4obWF4Wm9vbSAtIG1hcC5nZXRab29tKCksIDEyKSkpLFxuICAgICAgICAgICAgY2VsbFNpemUgPSByIC8gMixcbiAgICAgICAgICAgIGdyaWQgPSBbXSxcbiAgICAgICAgICAgIHBhbmVQb3MgPSBtYXAub2Zmc2V0UGxhdGZvcm0oKSxcbiAgICAgICAgICAgIG9mZnNldFggPSBwYW5lUG9zLnggJSBjZWxsU2l6ZSxcbiAgICAgICAgICAgIG9mZnNldFkgPSBwYW5lUG9zLnkgJSBjZWxsU2l6ZTtcbiAgICAgICAgbGV0IGksIGxlbiwgaGVhdCwgcCwgYWx0LCBjZWxsLCB4LCB5LCBqLCBsZW4yLCBrO1xuICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZGlzcGxheUV4dGVudC5leHBhbmQocik7XG4gICAgICAgIHRoaXMuX2hlYXRSYWRpdXMgPSByO1xuICAgICAgICAvLyBjb25zb2xlLnRpbWUoJ3Byb2Nlc3MnKTtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuID0gaGVhdHMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGhlYXQgPSBoZWF0c1tpXTtcbiAgICAgICAgICAgIGlmICghdGhpcy5faGVhdFZpZXdzW2ldKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5faGVhdFZpZXdzW2ldID0gbWFwLmNvb3JkaW5hdGVUb1BvaW50KG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKGhlYXRbMF0sIGhlYXRbMV0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHAgPSB0aGlzLl9oZWF0Vmlld3NbaV07XG4gICAgICAgICAgICBpZiAoZGlzcGxheUV4dGVudC5jb250YWlucyhwKSkge1xuICAgICAgICAgICAgICAgIHAgPSBtYXAuX3BvaW50VG9Db250YWluZXJQb2ludChwKTtcbiAgICAgICAgICAgICAgICB4ID0gTWF0aC5mbG9vcigocC54IC0gbGVmdFRvcC54IC0gb2Zmc2V0WCkgLyBjZWxsU2l6ZSkgKyAyO1xuICAgICAgICAgICAgICAgIHkgPSBNYXRoLmZsb29yKChwLnkgLSBsZWZ0VG9wLnkgLSBvZmZzZXRZKSAvIGNlbGxTaXplKSArIDI7XG5cbiAgICAgICAgICAgICAgICBhbHQgPVxuICAgICAgICAgICAgICAgICAgICBoZWF0LmFsdCAhPT0gdW5kZWZpbmVkID8gaGVhdC5hbHQgOlxuICAgICAgICAgICAgICAgICAgICBoZWF0WzJdICE9PSB1bmRlZmluZWQgPyAraGVhdFsyXSA6IDE7XG4gICAgICAgICAgICAgICAgayA9IGFsdCAqIHY7XG5cbiAgICAgICAgICAgICAgICBncmlkW3ldID0gZ3JpZFt5XSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjZWxsID0gZ3JpZFt5XVt4XTtcblxuICAgICAgICAgICAgICAgIGlmICghY2VsbCkge1xuICAgICAgICAgICAgICAgICAgICBncmlkW3ldW3hdID0gW3AueCAtIGxlZnRUb3AueCwgcC55IC0gbGVmdFRvcC55LCBrXTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGxbMF0gPSAoY2VsbFswXSAqIGNlbGxbMl0gKyAocC54IC0gbGVmdFRvcC54KSAqIGspIC8gKGNlbGxbMl0gKyBrKTsgLy8geFxuICAgICAgICAgICAgICAgICAgICBjZWxsWzFdID0gKGNlbGxbMV0gKiBjZWxsWzJdICsgKHAueSAtIGxlZnRUb3AueSkgKiBrKSAvIChjZWxsWzJdICsgayk7IC8vIHlcbiAgICAgICAgICAgICAgICAgICAgY2VsbFsyXSArPSBrOyAvLyBjdW11bGF0ZWQgaW50ZW5zaXR5IHZhbHVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IGdyaWQubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChncmlkW2ldKSB7XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMCwgbGVuMiA9IGdyaWRbaV0ubGVuZ3RoOyBqIDwgbGVuMjsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwgPSBncmlkW2ldW2pdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoKFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKGNlbGxbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQoY2VsbFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5taW4oY2VsbFsyXSwgbWF4KVxuICAgICAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faGVhdGVyLmRhdGEoZGF0YSkuZHJhdyhsYXllci5vcHRpb25zWydtaW5PcGFjaXR5J10pO1xuICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgfVxuXG4gICAgb25ab29tRW5kKCkge1xuICAgICAgICBkZWxldGUgdGhpcy5faGVhdFZpZXdzO1xuICAgICAgICBzdXBlci5vblpvb21FbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBvblJlc2l6ZSgpIHtcbiAgICAgICAgdGhpcy5faGVhdGVyLl93aWR0aCAgPSB0aGlzLmNhbnZhcy53aWR0aDtcbiAgICAgICAgdGhpcy5faGVhdGVyLl9oZWlnaHQgPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XG4gICAgICAgIHN1cGVyLm9uUmVzaXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgb25SZW1vdmUoKSB7XG4gICAgICAgIHRoaXMuY2xlYXJIZWF0Q2FjaGUoKTtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2hlYXRlcjtcbiAgICB9XG5cbiAgICBjbGVhckhlYXRDYWNoZSgpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX2hlYXRWaWV3cztcbiAgICB9XG59KTtcbiJdLCJuYW1lcyI6WyJtb2R1bGUiLCJzaW1wbGVoZWF0IiwiY2FudmFzIiwiX2NhbnZhcyIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJfY3R4IiwiZ2V0Q29udGV4dCIsIl93aWR0aCIsIndpZHRoIiwiX2hlaWdodCIsImhlaWdodCIsIl9tYXgiLCJfZGF0YSIsInByb3RvdHlwZSIsImRhdGEiLCJtYXgiLCJwb2ludCIsInB1c2giLCJyIiwiYmx1ciIsInVuZGVmaW5lZCIsImNpcmNsZSIsIl9jaXJjbGUiLCJfY3JlYXRlQ2FudmFzIiwiY3R4IiwicjIiLCJfciIsInNoYWRvd09mZnNldFgiLCJzaGFkb3dPZmZzZXRZIiwic2hhZG93Qmx1ciIsInNoYWRvd0NvbG9yIiwiYmVnaW5QYXRoIiwiYXJjIiwiTWF0aCIsIlBJIiwiY2xvc2VQYXRoIiwiZmlsbCIsImdyYWQiLCJncmFkaWVudCIsImNyZWF0ZUxpbmVhckdyYWRpZW50IiwiaSIsImFkZENvbG9yU3RvcCIsImZpbGxTdHlsZSIsImZpbGxSZWN0IiwiX2dyYWQiLCJnZXRJbWFnZURhdGEiLCJtaW5PcGFjaXR5IiwicmFkaXVzIiwiZGVmYXVsdFJhZGl1cyIsImRlZmF1bHRHcmFkaWVudCIsImNsZWFyUmVjdCIsImxlbiIsImxlbmd0aCIsInAiLCJnbG9iYWxBbHBoYSIsImRyYXdJbWFnZSIsImNvbG9yZWQiLCJfY29sb3JpemUiLCJwdXRJbWFnZURhdGEiLCJwaXhlbHMiLCJqIiwiY3JlYXRlRWxlbWVudCIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsIkhlYXRMYXllciIsImlkIiwiaGVhdHMiLCJBcnJheSIsImlzQXJyYXkiLCJfaGVhdHMiLCJnZXREYXRhIiwic2V0RGF0YSIsInJlZHJhdyIsImFkZFBvaW50IiwiaGVhdCIsInB1c2hJbiIsIm9uQ29uZmlnIiwiY29uZiIsImFwcGx5IiwiYXJndW1lbnRzIiwicmVuZGVyZXIiLCJfZ2V0UmVuZGVyZXIiLCJjbGVhckhlYXRDYWNoZSIsInJlbmRlciIsImlzRW1wdHkiLCJjbGVhciIsImZpcmUiLCJ0b0pTT04iLCJqc29uIiwiZ2V0SlNPTlR5cGUiLCJnZXRJZCIsImNvbmZpZyIsImNsaXBFeHRlbnQiLCJtYXB0YWxrcyIsIl9nZXRIZWF0UmFkaXVzIiwiX2V4cGFuZCIsImNsaXBwZWQiLCJjb250YWlucyIsImZyb21KU09OIiwiX2hlYXRSYWRpdXMiLCJtZXJnZU9wdGlvbnMiLCJyZWdpc3RlckpTT05UeXBlIiwicmVnaXN0ZXJSZW5kZXJlciIsImRyYXciLCJtYXAiLCJnZXRNYXAiLCJsYXllciIsImV4dGVudDJkIiwiX2dldDJERXh0ZW50IiwibWFza0V4dGVudCIsInByZXBhcmVDYW52YXMiLCJkaXNwbGF5RXh0ZW50IiwiaW50ZXJzZWN0cyIsImNvbXBsZXRlUmVuZGVyIiwiaW50ZXJzZWN0aW9uIiwibGVmdFRvcCIsIl9wb2ludFRvQ29udGFpbmVyUG9pbnQiLCJnZXRNaW4iLCJfaGVhdGVyIiwiX2hlYXRWaWV3cyIsImlzQXJyYXlIYXNEYXRhIiwibWF4Wm9vbSIsImlzTmlsIiwiZ2V0TWF4Wm9vbSIsInYiLCJwb3ciLCJtaW4iLCJnZXRab29tIiwiY2VsbFNpemUiLCJncmlkIiwicGFuZVBvcyIsIm9mZnNldFBsYXRmb3JtIiwib2Zmc2V0WCIsIngiLCJvZmZzZXRZIiwieSIsImFsdCIsImNlbGwiLCJsZW4yIiwiayIsImV4cGFuZCIsImNvb3JkaW5hdGVUb1BvaW50IiwiZmxvb3IiLCJyb3VuZCIsIm9uWm9vbUVuZCIsIm9uUmVzaXplIiwib25SZW1vdmUiLCJDYW52YXNSZW5kZXJlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBRUksQUFB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
