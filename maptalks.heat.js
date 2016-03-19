
(function() {
"use strict";

var maptalks;

var nodeEnv = typeof module !== 'undefined' && module.exports;
if (nodeEnv)  {
    maptalks = require('maptalks');      
} else {
    maptalks = window.maptalks;
}

maptalks.HeatLayer = maptalks.Layer.extend({
    options: {
        'renderer' : 'canvas'
    },

    initialize : function(id, heats, options) {
        this.setId(id);
        this._heats = heats;
        maptalks.Util.setOptions(this, options);
    },

    getData:function() {
        return this._heats;
    },

    setData : function(heats) {
        this._heats = heats;
        return this._redraw();
    },

    addPoint : function(heat) {
        this._heats.push(heat);
        return this._redraw();
    },

    redraw : function() {
        this._getRenderer.render();
        return this;
    },

    isEmpty:function() {
        if (!this._heats || !this._heats.length) {
            return true;
        }
        return false;
    }

});

maptalks.Util.extend(maptalks.HeatLayer, maptalks.Renderable);

maptalks.renderer.heatlayer = {};

maptalks.renderer.heatlayer.Canvas=maptalks.renderer.Canvas.extend({

    initialize:function(layer) {
        this._layer = layer;
        this._mapRender = layer.getMap()._getRenderer();
        this._registerEvents();
    },

    render:function() {
        var map = this.getMap();
        if (!map) {
            return;
        }
        if (!this._layer.isVisible()) {
            return;
        }
        var layer = this.getLayer();
        var viewExtent = map._getViewExtent();
        var maskViewExtent = this._prepareCanvas(viewExtent);
        if (maskViewExtent) {
            viewExtent = viewExtent.intersection(maskViewExtent);
        }
        var viewMin = viewExtent.getMin();

        if (!this._heater) {
            this._heater = simpleheat(this._canvas);
            this._heater.radius(layer.options['radius'] || this._heater.defaultRadius, layer.options['blur']);
        }
        this._canvasFullExtent = viewExtent;
        //a cache of heat points' viewpoints.
        if (!this._heatViews) {
            this._heatViews = [];
        }

        var heats = layer._heats;
        var data = [],
            r = this._heater._r,
            size = map.getSize(),
            heatExtent = viewExtent.expand(r),
            max = layer.options['max'] === undefined ? 1 : layer.options['max'],
            maxZoom = maptalks.Util.isNil(layer.options['maxZoom']) ? map.getMaxZoom() : layer.options['maxZoom'],
            v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - map.getZoom(), 12))),
            cellSize = r / 2,
            grid = [],
            panePos = map.offsetPlatform(),
            offsetX = panePos.x % cellSize,
            offsetY = panePos.y % cellSize,
            i, len, heat, p, alt, cell, x, y, j, len2, k;
        // console.time('process');
        for (i = 0, len = heats.length; i < len; i++) {
            heat = heats[i];
            if (!this._heatViews[i]) {
                this._heatViews[i] = map.coordinateToViewPoint(new maptalks.Coordinate(heat[0], heat[1]));
            }
            p = this._heatViews[i];
            if (heatExtent.contains(p)) {
                x = Math.floor((p.x - viewMin.x - offsetX) / cellSize) + 2;
                y = Math.floor((p.y - viewMin.y - offsetY) / cellSize) + 2;

                alt =
                    heat.alt !== undefined ? heat.alt :
                    heat[2] !== undefined ? +heat[2] : 1;
                k = alt * v;

                grid[y] = grid[y] || [];
                cell = grid[y][x];

                if (!cell) {
                    grid[y][x] = [p.x - viewMin.x, p.y - viewMin.y, k];

                } else {
                    cell[0] = (cell[0] * cell[2] + (p.x - viewMin.x) * k) / (cell[2] + k); // x
                    cell[1] = (cell[1] * cell[2] + (p.y - viewMin.y)* k) / (cell[2] + k); // y
                    cell[2] += k; // cumulated intensity value
                }
            }
        }
        for (i = 0, len = grid.length; i < len; i++) {
            if (grid[i]) {
                for (j = 0, len2 = grid[i].length; j < len2; j++) {
                    cell = grid[i][j];
                    if (cell) {
                        data.push([
                            Math.round(cell[0]),
                            Math.round(cell[1]),
                            Math.min(cell[2], max)
                        ]);
                    }
                }
            }
        }
        // console.timeEnd('process');

        // console.time('draw ' + data.length);
        this._heater.data(data).draw(layer.options['minOpacity']);
        // console.timeEnd('draw ' + data.length);
        //
        layer.fire('layerload');
        this._requestMapToRender();
    },

    getCanvasImage:function() {
        if (!this._canvasFullExtent || this._layer.isEmpty()) {
            return null;
        }
        var size = this._canvasFullExtent.getSize();
        var point = this._canvasFullExtent.getMin();
        return {'image':this._canvas,'layer':this._layer,'point':this.getMap().viewPointToContainerPoint(point),'size':size};
    },

    setZIndex: function(zindex) {
        this._requestMapToRender();
    },

    _requestMapToRender:function() {
        if (this.getMap()) {
            this._mapRender.render();
        }
    },

    _registerEvents:function() {
        var map = this.getMap();
        map.on('_moveend _zoomstart _zoomend _resize',this._onMapEvent,this);
    },

    _onMapEvent:function(param) {
        if (param['type'] === '_zoomend') {
            delete this._heatViews;
            this.render();
        } else if (param['type'] === '_moveend') {
            this.render();
        } else if (param['type'] === '_resize') {
            this._resizeCanvas();
            this._heater._width  = this._canvas.width;
            this._heater._height = this._canvas.height;
            this.render();
        }
    },

    _fireLoadedEvent:function() {
        this._layer.fire('layerload');
    }
});

maptalks.HeatLayer.registerRenderer('canvas', maptalks.renderer.heatlayer.Canvas);

/*
 (c) 2014, Vladimir Agafonkin
 simpleheat, a tiny JavaScript library for drawing heatmaps with Canvas
 https://github.com/mourner/simpleheat
*/
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

    data: function (data) {
        this._data = data;
        return this;
    },

    max: function (max) {
        this._max = max;
        return this;
    },

    add: function (point) {
        this._data.push(point);
        return this;
    },

    clear: function () {
        this._data = [];
        return this;
    },

    radius: function (r, blur) {
        blur = blur === undefined ? 15 : blur;

        // create a grayscale blurred circle image that we'll use for drawing points
        var circle = this._circle = document.createElement('canvas'),
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

    resize: function () {
        this._width = this._canvas.width;
        this._height = this._canvas.height;
    },

    gradient: function (grad) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 1;
        canvas.height = 256;

        for (var i in grad) {
            gradient.addColorStop(i, grad[i]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        this._grad = ctx.getImageData(0, 0, 1, 256).data;

        return this;
    },

    draw: function (minOpacity) {
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

    _colorize: function (pixels, gradient) {
        for (var i = 0, len = pixels.length, j; i < len; i += 4) {
            j = pixels[i + 3] * 4; // get gradient color from opacity value

            if (j) {
                pixels[i] = gradient[j];
                pixels[i + 1] = gradient[j + 1];
                pixels[i + 2] = gradient[j + 2];
            }
        }
    }
};

if (nodeEnv) {
    exports = module.exports = maptalks.HeatLayer;    
}
})();