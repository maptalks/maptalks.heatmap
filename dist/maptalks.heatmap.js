/*!
 * maptalks.heatmap v0.2.0
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
        this._heats = heats;
        return this.redraw();
    };

    HeatLayer.prototype.addPoint = function addPoint(heat) {
        this._heats.push(heat);
        return this.redraw();
    };

    HeatLayer.prototype.getMax = function getMax() {
        return this.options['max'];
    };

    HeatLayer.prototype.setMax = function setMax(max) {
        this.options['max'] = max;
        return this.redraw();
    };

    HeatLayer.prototype.redraw = function redraw() {
        this._getRenderer().render();
        return this;
    };

    HeatLayer.prototype.isEmpty = function isEmpty() {
        if (!this._heats || !this._heats.length) {
            return true;
        }
        return false;
    };

    HeatLayer.prototype.clear = function clear() {
        delete this._heats;
        this.redraw();
        this.fire('clear');
        return this;
    };

    /**
     * Export the HeatLayer's profile JSON.
     * @return {Object} layer's profile JSON
     */


    HeatLayer.prototype.toJSON = function toJSON(options) {
        if (!options) {
            options = {};
        }
        var profile = {
            'type': 'HeatLayer',
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
            profile['data'] = clipped;
        } else {
            profile['data'] = data;
        }

        return profile;
    };

    /**
     * Reproduce a HeatLayer from layer's profile JSON.
     * @param  {Object} layerJSON - layer's profile JSON
     * @return {maptalks.HeatLayer}
     * @static
     * @private
     * @function
     */


    HeatLayer.fromJSON = function fromJSON(layerJSON) {
        if (!layerJSON || layerJSON['type'] !== 'HeatLayer') {
            return null;
        }
        return new HeatLayer(layerJSON['id'], layerJSON['data'], layerJSON['options']);
    };

    HeatLayer.prototype._getHeatRadius = function _getHeatRadius() {
        if (!this._getRenderer()) {
            return null;
        }
        return this._getRenderer()._heatRadius;
    };

    return HeatLayer;
}(maptalks.Layer);

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
            maskExtent = this.prepareCanvas(),
            displayExtent = extent2d;
        if (maskExtent) {
            //out of layer mask
            if (!maskExtent.intersects(extent2d)) {
                this.completeRender();
                return;
            }
            displayExtent = extent2d.intersection(maskExtent);
        }
        var leftTop = extent2d.getMin();

        if (!this._heater) {
            this._heater = simpleheat_1(this.canvas);
            this._heater.radius(layer.options['radius'] || this._heater.defaultRadius, layer.options['blur']);
        }
        if (layer.getMax()) {
            this._heater.max(layer.getMax());
        }
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
            offsetY = panePos.y % cellSize,
            i,
            len,
            heat,
            p,
            alt,
            cell,
            x,
            y,
            j,
            len2,
            k;
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
        delete this._heatViews;
        delete this._heater;
    };

    return _class;
}(maptalks.renderer.CanvasRenderer));

exports.HeatLayer = HeatLayer;

Object.defineProperty(exports, '__esModule', { value: true });

})));
