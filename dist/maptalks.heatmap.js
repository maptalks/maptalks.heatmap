/*!
 * maptalks.heatmap v0.6.2
 * LICENSE : MIT
 * (c) 2016-2025 maptalks.org
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('maptalks'), require('@maptalks/gl')) :
    typeof define === 'function' && define.amd ? define(['exports', 'maptalks', '@maptalks/gl'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.maptalks = global.maptalks || {}, global.maptalks, global.maptalks));
})(this, (function (exports, maptalks, gl) { 'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n["default"] = e;
        return Object.freeze(n);
    }

    var maptalks__namespace = /*#__PURE__*/_interopNamespace(maptalks);

    var simpleheat$1 = {exports: {}};

    (function (module) {

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

        resize: function () {
            this._width = this._canvas.width;
            this._height = this._canvas.height;
        },

        gradient: function (grad) {
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
        },

        _createCanvas: function () {
            if (typeof document !== 'undefined') {
                return document.createElement('canvas');
            } else {
                // create a new canvas instance in node.js
                // the canvas class needs to have a default constructor without any parameter
                return new this._canvas.constructor();
            }
        }
    };
    }(simpleheat$1));

    var simpleheat = simpleheat$1.exports;

    var vert = "attribute vec2 aPosition;\nattribute vec2 aOffset;\nattribute float aIntensity;\nvarying vec2 off, dim;\nvarying float vIntensity;\nuniform mat4 projViewModelMatrix;\nuniform float zoomScale;\nvoid main() {\n    off = aOffset;\n    dim = abs(off);\n    vec2 pos = aPosition.xy + zoomScale * off;\n    vIntensity = aIntensity / 255.0;\n    gl_Position = projViewModelMatrix * vec4(pos, 0.0, 1.0);\n}";

    var frag = "precision highp int;\nprecision highp float;\nvarying vec2 off, dim;\nvarying float vIntensity;\nvoid main() {\n    float falloff = (1.0 - smoothstep(0.0, 1.0, length(off / dim)));\n    float intensity = falloff * vIntensity;\n    gl_FragColor = vec4(intensity);\n}";

    var gradientVert = "attribute vec4 aPosition;\nvarying vec2 texcoord;\nvoid main() {\n    texcoord = aPosition.xy * 0.5 + 0.5;\n    gl_Position = aPosition;\n}";

    var gradientFrag = "precision highp int;\nprecision highp float;\nuniform sampler2D source;\nvarying vec2 texcoord;\nfloat linstep(float low, float high, float value) {\n    return clamp((value-low)/(high-low), 0.0, 1.0);\n}\nfloat fade(float low, float high, float value) {\n    float mid = (low+high)*0.5;\n    float range = (high-low)*0.5;\n    float x = 1.0 - clamp(abs(mid-value)/range, 0.0, 1.0);\n    return smoothstep(0.0, 1.0, x);\n}\nvec3 getColor(float intensity) {\n    vec3 blue = vec3(0.0, 0.0, 1.0);\n    vec3 cyan = vec3(0.0, 1.0, 1.0);\n    vec3 green = vec3(0.0, 1.0, 0.0);\n    vec3 yellow = vec3(1.0, 1.0, 0.0);\n    vec3 red = vec3(1.0, 0.0, 0.0);\n    vec3 color = (\n    fade(-0.25, 0.25, intensity)*blue +\n    fade(0.0, 0.5, intensity)*cyan +\n    fade(0.25, 0.75, intensity)*green +\n    fade(0.5, 1.0, intensity)*yellow +\n    smoothstep(0.75, 1.0, intensity)*red\n    );\n    return color;\n}\nvec4 alphaFun(vec3 color, float intensity) {\n    float alpha = smoothstep(0.00000000, 1.00000000, intensity);\n    return vec4(color*alpha, alpha);\n}\nvoid main() {\n    vec4 value = texture2D(source, texcoord);\n    float intensity = smoothstep(0.0, 1.0, value.r);\n    vec3 color = getColor(intensity);\n    gl_FragColor = alphaFun(color, intensity);\n}";

    const options = {
        'max' : 1,
        'gradient' : {
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        },
        'radius' : 25,
        'blur' : 15,
        'heatValueScale': 1,
        'minOpacity' : 0.05
    };

    const COORD = new maptalks__namespace.Coordinate(0, 0);
    const POINT = new maptalks__namespace.Point(0, 0);

    class HeatLayer extends maptalks__namespace.Layer {

        constructor(id, heats, options) {
            if (!Array.isArray(heats)) {
                options = heats;
                heats = null;
            }
            super(id, options);
            this._heats = heats || [];
        }

        getData() {
            return this._heats;
        }

        setData(heats) {
            this._heats = heats || [];
            return this._resetData();
        }

        addPoint(heat) {
            if (!heat) {
                return this;
            }
            if (heat[0] && Array.isArray(heat[0])) {
                maptalks__namespace.Util.pushIn(this._heats, heat);
            } else {
                this._heats.push(heat);
            }
            return this._update(heat);
        }

        onConfig(conf) {
            for (const p in conf) {
                if (p === 'gradient') {
                    this._updateGradient();
                    return this;
                }
            }
            return this;
        }

        _updateGradient() {
            const renderer = this._getRenderer();
            if (renderer) {
                renderer.updateGradient();
                renderer.setToRedraw();
            }
            return this;
        }

        _resetData() {
            const renderer = this._getRenderer();
            if (renderer) {
                renderer.resetData();
                renderer.setToRedraw();
            }
            return this;
        }

        _update(point) {
            const renderer = this._getRenderer();
            if (renderer) {
                renderer.updateData(point);
                renderer.setToRedraw();
            }
        }

        isEmpty() {
            if (!this._heats.length) {
                return true;
            }
            return false;
        }

        clear() {
            this._heats = [];
            this._resetData();
            this.fire('clear');
            return this;
        }

        /**
         * Export the HeatLayer's JSON.
         * @return {Object} layer's JSON
         */
        toJSON(options) {
            if (!options) {
                options = {};
            }
            const json = {
                'type'      : this.getJSONType(),
                'id'        : this.getId(),
                'options'   : this.config()
            };
            const data = this.getData();
            if (options['clipExtent']) {
                let clipExtent = new maptalks__namespace.Extent(options['clipExtent']);
                const r = this._getHeatRadius();
                if (r) {
                    clipExtent = clipExtent._expand(r);
                }
                const clipped = [];
                for (let i = 0, len = data.length; i < len; i++) {
                    if (clipExtent.contains(new maptalks__namespace.Coordinate(data[i][0], data[i][1]))) {
                        clipped.push(data[i]);
                    }
                }
                json['data'] = clipped;
            } else {
                json['data'] = data;
            }

            return json;
        }

        /**
         * Reproduce a HeatLayer from layer's JSON.
         * @param  {Object} json - layer's JSON
         * @return {maptalks.HeatLayer}
         * @static
         * @private
         * @function
         */
        static fromJSON(json) {
            if (!json || json['type'] !== 'HeatLayer') { return null; }
            return new HeatLayer(json['id'], json['data'], json['options']);
        }


        _getHeatRadius() {
            if (!this._getRenderer()) {
                return null;
            }
            return this._getRenderer()._heatRadius;
        }
    }

    HeatLayer.mergeOptions(options);

    HeatLayer.registerJSONType('HeatLayer');

    HeatLayer.registerRenderer('canvas', class extends maptalks__namespace.renderer.CanvasRenderer {

        draw() {
            const map = this.getMap(),
                layer = this.layer,
                extent = map.getContainerExtent();
            let maskExtent = this.prepareCanvas(),
                displayExtent = extent;
            if (maskExtent) {
                maskExtent = maskExtent.convertTo(c => map._pointToContainerPoint(c));
                //out of layer mask
                if (!maskExtent.intersects(extent)) {
                    this.completeRender();
                    return;
                }
                displayExtent = extent.intersection(maskExtent);
            }

            if (!this._heater) {
                this._heater = simpleheat(this.canvas);
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

            const heats = layer.getData();
            if (heats.length === 0) {
                this.completeRender();
                return;
            }
            const data = this._heatData(heats, displayExtent);
            this._heater.data(data).draw(layer.options['minOpacity']);
            this.completeRender();
        }

        drawOnInteracting() {
            this.draw();
        }

        _heatData(heats, displayExtent) {
            const map = this.getMap(),
                layer = this.layer;
            const projection = map.getProjection();
            const data = [],
                r = this._heater._r,
                max = layer.options['max'] === undefined ? 1 : layer.options['max'],
                cellSize = r / 2,
                grid = [],
                panePos = map.offsetPlatform(),
                offsetX = panePos.x % cellSize,
                offsetY = panePos.y % cellSize;
            let heat, p, cell, x, y, k;
            displayExtent = displayExtent.expand(r).convertTo(c => new maptalks__namespace.Point(map._containerPointToPrj(c)));
            this._heatRadius = r;
            const coord = new maptalks__namespace.Coordinate(0, 0);
            for (let i = 0, l = heats.length; i < l; i++) {
                heat = heats[i];
                if (!this._heatViews[i]) {
                    this._heatViews[i] = projection.project(coord.set(heat[0], heat[1]));
                }
                p = this._heatViews[i];
                if (displayExtent.contains(p)) {
                    p = map._prjToContainerPoint(p);
                    x = Math.floor((p.x - offsetX) / cellSize) + 2;
                    y = Math.floor((p.y - offsetY) / cellSize) + 2;

                    k = (heat[2] !== undefined ? +heat[2] : 0.1) * layer.options['heatValueScale'];

                    grid[y] = grid[y] || [];
                    cell = grid[y][x];

                    if (!cell) {
                        grid[y][x] = [p.x, p.y, k];

                    } else {
                        cell[0] = (cell[0] * cell[2] + (p.x) * k) / (cell[2] + k); // x
                        cell[1] = (cell[1] * cell[2] + (p.y) * k) / (cell[2] + k); // y
                        cell[2] += k; // cumulated intensity value
                    }
                }
            }
            for (let i = 0, l = grid.length; i < l; i++) {
                if (grid[i]) {
                    for (let j = 0, ll = grid[i].length; j < ll; j++) {
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
            return data;
        }

        onZoomEnd() {
            delete this._heatViews;
            super.onZoomEnd.apply(this, arguments);
        }

        onResize() {
            super.onResize.apply(this, arguments);
            if (this.canvas) {
                this._heater._width  = this.canvas.width;
                this._heater._height = this.canvas.height;
            }
        }

        onRemove() {
            this.clearHeatCache();
            delete this._heater;
        }

        updateData() {
        }

        resetData() {
            this.clearHeatCache();
        }

        updateGradient() {
        }

        clearHeatCache() {
            delete this._heatViews;
        }
    });

    if (typeof gl.CanvasCompatible !== 'undefined') {
        HeatLayer.registerRenderer('gl', class extends gl.CanvasCompatible(maptalks__namespace.renderer.LayerAbstractRenderer) {
            drawOnInteracting(event, timestamp, parentContext) {
                this.draw(timestamp, parentContext);
            }

            draw(timestamp, parentContext) {
                this.prepareCanvas();
                if (!this._renderer) {
                    return;
                }
                const heats = this.layer.getData();
                if (heats.length !== this.pointCount) {
                    for (let i = this.pointCount; i < heats.length; i++) {
                        this.addPoint(...heats[i]);
                    }
                    this._updateGeometryData();
                }
                const fbo = parentContext && parentContext.renderTarget && context.renderTarget.fbo;
                this._clearFBO();
                this._geometry.setDrawCount(this.pointCount * 6);
                const map = this.getMap();
                const glRes = map.getGLRes();
                const uniforms = {
                    zoomScale: map.getResolution() / glRes,
                    projViewModelMatrix: map.projViewMatrix
                };
                this._renderer.render(this._pointShader, uniforms, this._scene, this._fbo);
                this._renderer.render(this._gradientShader, null, this._gradientScene, fbo);
            }

            updateData(point) {
                this.addPoint(point[0], point[1], point[2]);
            }

            _clearFBO() {
                this.device.clear({
                    color: [0, 0, 0, 0],
                    depth: 1,
                    framebuffer: this._fbo
                });
            }

            clearHeatCache() {

            }

            resetData() {
                this._reset();
            }

            updateGradient() {
                this._initGradient();
            }

            clear() {
                this._reset();
                super.clear();
            }

            _reset() {
                this.pointCount = 0;
                this.bufferIndex = 0;
                this.offsetIndex = 0;
                this.intensityIndex = 0;
            }

            initContext() {
                this._initData();
                this._initMesh();
                this._initGradient();
                const viewport = {
                    x : 0,
                    y : 0,
                    width : () => {
                        return this.canvas ? this.canvas.width : 1;
                    },
                    height : () => {
                        return this.canvas ? this.canvas.height : 1;
                    }
                };
                const extraCommandProps = {
                    blend: {
                        enable: true,
                        func: {
                            dst: 1,
                            src: 1
                        }
                    },
                    depth: {
                        enable: false,
                    },
                    viewport
                };
                this._pointShader = new gl.reshader.MeshShader({
                    vert,
                    frag,
                    extraCommandProps
                });

                this._gradientShader = new gl.reshader.MeshShader({
                    vert: gradientVert,
                    frag: gradientFrag,
                    extraCommandProps: {
                        blend: {
                            enable: false,
                        },
                        depth: {
                            enable: false,
                        },
                        viewport
                    }
                });
            }

            _initData() {
                this.bufferIndex = 0;
                this.offsetIndex = 0;
                this.intensityIndex = 0;
                this.pointCount = 0;
                this.maxPointCount = 1024 * 10;

                const { positionBufferData, offsetBufferData, intensityBufferData } = this._initBuffers();
                this.positionBufferData = positionBufferData;
                this.offsetBufferData = offsetBufferData;
                this.intensityBufferData = intensityBufferData;
            }

            _initBuffers() {
                const vertexSize = 2;
                const offsetSize = 2;
                const intensitySize = 1;
                const positionBufferData = new Float32Array(
                    this.maxPointCount * vertexSize * 6
                );
                const offsetBufferData = new Int16Array(
                    this.maxPointCount * offsetSize * 6
                );
                const intensityBufferData = new Uint8Array(
                    this.maxPointCount * intensitySize * 6
                );
                return { positionBufferData, offsetBufferData, intensityBufferData };
            }

            _initMesh() {
                this._renderer = new gl.reshader.Renderer(this.device);
                this._geometry = new gl.reshader.Geometry(
                    {
                        aPosition: this.positionBufferData,
                        aOffset: this.offsetBufferData,
                        aIntensity: this.intensityBufferData
                    },
                    null,
                    this.pointCount * 6,
                    {
                        positionSize: 2
                    }
                );
                this._geometry.generateBuffers(this.device);
                this._mesh = new gl.reshader.Mesh(this._geometry);
                this._scene = new gl.reshader.Scene([this._mesh]);
                const canvas = this.canvas;
                const color = this.device.texture({
                    type: 'float16',
                    min: 'nearest',
                    mag: 'nearest',
                    width: canvas.width,
                    height: canvas.height,
                    // needed by webgpu
                    sampleCount: 4
                });
                this._fbo = this.device.framebuffer({
                    width: canvas.width,
                    height: canvas.height,
                    colors: [color],
                    colorFormat: 'rgba',
                    depthStencil: false
                });

                const quad = new Int8Array([
                    -1, -1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, 1, 0, 1, 1, -1, 0, 1, 1, 1, 0, 1
                ]);
                this._gradientGeometry = new gl.reshader.Geometry(
                    {
                        aPosition: quad
                    },
                    null,
                    0,
                    {
                        positionSize: 4
                    }
                );
                this._gradientGeometry.generateBuffers(this.device);
                this._gradientMesh = new gl.reshader.Mesh(this._gradientGeometry);
                this._gradientScene = new gl.reshader.Scene([this._gradientMesh]);
            }

            _initGradient() {
                const gradientData = gradient(this.layer.options['gradient']);
                if (this._gradientTexture) {
                    if (this._gradientTexture.update) {
                        this._gradientTexture.update(gradientData);
                    } else {
                        this._gradientTexture(gradientData);
                    }
                } else {
                    this._gradientTexture = this.device.texture(gradientData);
                }
                this._gradientMesh.setUniform('source', this._fbo);
            }

            addVertex(x, y, xs, ys, intensity) {
                const map = this.getMap();
                const glRes = map.getGLRes();
                COORD.set(x, y);
                const point = map.coordToPointAtRes(COORD, glRes, POINT);
                x = point.x;
                y = point.y;
                this.positionBufferData[this.bufferIndex++] = x;
                this.positionBufferData[this.bufferIndex++] = y;
                this.offsetBufferData[this.offsetIndex++] = xs;
                this.offsetBufferData[this.offsetIndex++] = ys;
                this.intensityBufferData[this.intensityIndex++] = intensity * 255;
            }

            addPoint(x, y, intensity) {
                const size = this.layer.options['radius'] || 25;
                if (intensity == null) {
                    intensity = 0.2;
                }
                const max = this.layer.options['max'] || 1;
                intensity /= max;
                this._check();
                const s = size;
                this.addVertex(x, y, -s, -s, intensity);
                this.addVertex(x, y, +s, -s, intensity);
                this.addVertex(x, y, -s, +s, intensity);
                this.addVertex(x, y, -s, +s, intensity);
                this.addVertex(x, y, +s, -s, intensity);
                this.addVertex(x, y, +s, +s, intensity);
                return (this.pointCount += 1);
            }

            _check() {
                if (this.pointCount >= this.maxPointCount - 1) {
                    this.maxPointCount += 1024 * 10;
                    const { positionBufferData, offsetBufferData, intensityBufferData } = this._initBuffers();
                    for (let i = 0; i < this.bufferIndex; i++) {
                        positionBufferData[i] = this.positionBufferData[i];
                        offsetBufferData[i] = this.offsetBufferData[i];
                    }
                    for (let i = 0; i < this.intensityIndex; i++) {
                        intensityBufferData[i] = this.intensityBufferData[i];
                    }
                    this.positionBufferData = positionBufferData;
                    this.offsetBufferData = offsetBufferData;
                    this.intensityBufferData = intensityBufferData;
                    this._updateGeometryData();
                }
            }

            _updateGeometryData() {
                this._geometry.updateData('aPosition', this.positionBufferData);
                this._geometry.updateData('aOffset', this.offsetBufferData);
                this._geometry.updateData('aIntensity', this.intensityBufferData);
            }

            onResize(params) {
                if (this._fbo && this.canvas) {
                    const canvas = this.canvas;
                    if (this._fbo.width !== canvas.width || this._fbo.height !== canvas.height) {
                        this._fbo.resize(canvas.width, canvas.height);
                    }
                }
                super.onResize(params);
            }

            onRemove() {
                this._reset();
                if (this._pointShader) {
                    this._pointShader.dispose();
                    delete this._pointShader;
                }
                if (this._gradientShader) {
                    this._gradientShader.dispose();
                    delete this._gradientShader;
                }
                if (this._gradientTexture) {
                    this._gradientTexture.destroy();
                    delete this._gradientTexture;
                }
                if (this._mesh) {
                    this._mesh.dispose();
                    delete this._mesh;
                }
                if (this._geometry) {
                    this._geometry.dispose();
                    delete this._geometry;
                }
                if (this._fbo) {
                    this._fbo.destroy();
                    delete this._fbo;
                }
                if (this._gradientMesh) {
                    this._gradientMesh.dispose();
                    delete this._gradientMesh;
                }
                if (this._gradientGeometry) {
                    this._gradientGeometry.dispose();
                    delete this._gradientGeometry;
                }
                delete this.positionBufferData;
                delete this.offsetBufferData;
                delete this.intensityBufferData;
                delete this._renderer;
                delete this._scene;
                delete this._gradientScene;
                super.onRemove();
            }
        });
    }

    function gradient(grad) {
        // create a 256x1 gradient that we'll use to turn a grayscale heatmap into a colored one
        const canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d', {willReadFrequently: true}),
            gradient = ctx.createLinearGradient(0, 0, 0, 256);

        canvas.width = 256;
        canvas.height = 1;

        for (const i in grad) {
            gradient.addColorStop(+i, grad[i]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        return {
            data: ctx.getImageData(0, 0, 1, 256).data,
            width: canvas.width,
            height: canvas.height
        };
    }

    exports.HeatLayer = HeatLayer;

    Object.defineProperty(exports, '__esModule', { value: true });

    typeof console !== 'undefined' && console.log('maptalks.heatmap v0.6.2');

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3MuaGVhdG1hcC5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3NpbXBsZWhlYXQvc2ltcGxlaGVhdC5qcyIsIi4uL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IHNpbXBsZWhlYXQ7XG5cbmZ1bmN0aW9uIHNpbXBsZWhlYXQoY2FudmFzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHNpbXBsZWhlYXQpKSByZXR1cm4gbmV3IHNpbXBsZWhlYXQoY2FudmFzKTtcblxuICAgIHRoaXMuX2NhbnZhcyA9IGNhbnZhcyA9IHR5cGVvZiBjYW52YXMgPT09ICdzdHJpbmcnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2FudmFzKSA6IGNhbnZhcztcblxuICAgIHRoaXMuX2N0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuICAgIHRoaXMuX2hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tYXggPSAxO1xuICAgIHRoaXMuX2RhdGEgPSBbXTtcbn1cblxuc2ltcGxlaGVhdC5wcm90b3R5cGUgPSB7XG5cbiAgICBkZWZhdWx0UmFkaXVzOiAyNSxcblxuICAgIGRlZmF1bHRHcmFkaWVudDoge1xuICAgICAgICAwLjQ6ICdibHVlJyxcbiAgICAgICAgMC42OiAnY3lhbicsXG4gICAgICAgIDAuNzogJ2xpbWUnLFxuICAgICAgICAwLjg6ICd5ZWxsb3cnLFxuICAgICAgICAxLjA6ICdyZWQnXG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgbWF4OiBmdW5jdGlvbiAobWF4KSB7XG4gICAgICAgIHRoaXMuX21heCA9IG1heDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAgIHRoaXMuX2RhdGEucHVzaChwb2ludCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kYXRhID0gW107XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICByYWRpdXM6IGZ1bmN0aW9uIChyLCBibHVyKSB7XG4gICAgICAgIGJsdXIgPSBibHVyID09PSB1bmRlZmluZWQgPyAxNSA6IGJsdXI7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgZ3JheXNjYWxlIGJsdXJyZWQgY2lyY2xlIGltYWdlIHRoYXQgd2UnbGwgdXNlIGZvciBkcmF3aW5nIHBvaW50c1xuICAgICAgICB2YXIgY2lyY2xlID0gdGhpcy5fY2lyY2xlID0gdGhpcy5fY3JlYXRlQ2FudmFzKCksXG4gICAgICAgICAgICBjdHggPSBjaXJjbGUuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgIHIyID0gdGhpcy5fciA9IHIgKyBibHVyO1xuXG4gICAgICAgIGNpcmNsZS53aWR0aCA9IGNpcmNsZS5oZWlnaHQgPSByMiAqIDI7XG5cbiAgICAgICAgY3R4LnNoYWRvd09mZnNldFggPSBjdHguc2hhZG93T2Zmc2V0WSA9IHIyICogMjtcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSBibHVyO1xuICAgICAgICBjdHguc2hhZG93Q29sb3IgPSAnYmxhY2snO1xuXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYygtcjIsIC1yMiwgciwgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgIGN0eC5maWxsKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlc2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl93aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgdGhpcy5faGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICB9LFxuXG4gICAgZ3JhZGllbnQ6IGZ1bmN0aW9uIChncmFkKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBhIDI1NngxIGdyYWRpZW50IHRoYXQgd2UnbGwgdXNlIHRvIHR1cm4gYSBncmF5c2NhbGUgaGVhdG1hcCBpbnRvIGEgY29sb3JlZCBvbmVcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NyZWF0ZUNhbnZhcygpLFxuICAgICAgICAgICAgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgICAgICBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCAyNTYpO1xuXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IDE7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAyNTY7XG5cbiAgICAgICAgZm9yICh2YXIgaSBpbiBncmFkKSB7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoK2ksIGdyYWRbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMSwgMjU2KTtcblxuICAgICAgICB0aGlzLl9ncmFkID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCAxLCAyNTYpLmRhdGE7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRyYXc6IGZ1bmN0aW9uIChtaW5PcGFjaXR5KSB7XG4gICAgICAgIGlmICghdGhpcy5fY2lyY2xlKSB0aGlzLnJhZGl1cyh0aGlzLmRlZmF1bHRSYWRpdXMpO1xuICAgICAgICBpZiAoIXRoaXMuX2dyYWQpIHRoaXMuZ3JhZGllbnQodGhpcy5kZWZhdWx0R3JhZGllbnQpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG5cbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgICAgICAvLyBkcmF3IGEgZ3JheXNjYWxlIGhlYXRtYXAgYnkgcHV0dGluZyBhIGJsdXJyZWQgY2lyY2xlIGF0IGVhY2ggZGF0YSBwb2ludFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fZGF0YS5sZW5ndGgsIHA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgcCA9IHRoaXMuX2RhdGFbaV07XG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heChwWzJdIC8gdGhpcy5fbWF4LCBtaW5PcGFjaXR5ID09PSB1bmRlZmluZWQgPyAwLjA1IDogbWluT3BhY2l0eSk7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuX2NpcmNsZSwgcFswXSAtIHRoaXMuX3IsIHBbMV0gLSB0aGlzLl9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbG9yaXplIHRoZSBoZWF0bWFwLCB1c2luZyBvcGFjaXR5IHZhbHVlIG9mIGVhY2ggcGl4ZWwgdG8gZ2V0IHRoZSByaWdodCBjb2xvciBmcm9tIG91ciBncmFkaWVudFxuICAgICAgICB2YXIgY29sb3JlZCA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG4gICAgICAgIHRoaXMuX2NvbG9yaXplKGNvbG9yZWQuZGF0YSwgdGhpcy5fZ3JhZCk7XG4gICAgICAgIGN0eC5wdXRJbWFnZURhdGEoY29sb3JlZCwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9jb2xvcml6ZTogZnVuY3Rpb24gKHBpeGVscywgZ3JhZGllbnQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBpeGVscy5sZW5ndGgsIGo7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgICAgICAgICAgaiA9IHBpeGVsc1tpICsgM10gKiA0OyAvLyBnZXQgZ3JhZGllbnQgY29sb3IgZnJvbSBvcGFjaXR5IHZhbHVlXG5cbiAgICAgICAgICAgIGlmIChqKSB7XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2ldID0gZ3JhZGllbnRbal07XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2kgKyAxXSA9IGdyYWRpZW50W2ogKyAxXTtcbiAgICAgICAgICAgICAgICBwaXhlbHNbaSArIDJdID0gZ3JhZGllbnRbaiArIDJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9jcmVhdGVDYW52YXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBjYW52YXMgaW5zdGFuY2UgaW4gbm9kZS5qc1xuICAgICAgICAgICAgLy8gdGhlIGNhbnZhcyBjbGFzcyBuZWVkcyB0byBoYXZlIGEgZGVmYXVsdCBjb25zdHJ1Y3RvciB3aXRob3V0IGFueSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY2FudmFzLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiaW1wb3J0ICogYXMgbWFwdGFsa3MgZnJvbSAnbWFwdGFsa3MnO1xuaW1wb3J0IHNpbXBsZWhlYXQgZnJvbSAnc2ltcGxlaGVhdCc7XG5pbXBvcnQgeyByZXNoYWRlciwgQ2FudmFzQ29tcGF0aWJsZSB9IGZyb20gJ0BtYXB0YWxrcy9nbCc7XG5pbXBvcnQgdmVydCBmcm9tICcuL2dsc2wvcG9pbnRzLnZlcnQnO1xuaW1wb3J0IGZyYWcgZnJvbSAnLi9nbHNsL3BvaW50cy5mcmFnJztcbmltcG9ydCBncmFkaWVudFZlcnQgZnJvbSAnLi9nbHNsL2dyYWRpZW50LnZlcnQnO1xuaW1wb3J0IGdyYWRpZW50RnJhZyBmcm9tICcuL2dsc2wvZ3JhZGllbnQuZnJhZyc7XG5cbmNvbnN0IG9wdGlvbnMgPSB7XG4gICAgJ21heCcgOiAxLFxuICAgICdncmFkaWVudCcgOiB7XG4gICAgICAgIDAuNDogJ2JsdWUnLFxuICAgICAgICAwLjY6ICdjeWFuJyxcbiAgICAgICAgMC43OiAnbGltZScsXG4gICAgICAgIDAuODogJ3llbGxvdycsXG4gICAgICAgIDEuMDogJ3JlZCdcbiAgICB9LFxuICAgICdyYWRpdXMnIDogMjUsXG4gICAgJ2JsdXInIDogMTUsXG4gICAgJ2hlYXRWYWx1ZVNjYWxlJzogMSxcbiAgICAnbWluT3BhY2l0eScgOiAwLjA1XG59O1xuXG5jb25zdCBDT09SRCA9IG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKDAsIDApO1xuY29uc3QgUE9JTlQgPSBuZXcgbWFwdGFsa3MuUG9pbnQoMCwgMCk7XG5cbmV4cG9ydCBjbGFzcyBIZWF0TGF5ZXIgZXh0ZW5kcyBtYXB0YWxrcy5MYXllciB7XG5cbiAgICBjb25zdHJ1Y3RvcihpZCwgaGVhdHMsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGhlYXRzKSkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IGhlYXRzO1xuICAgICAgICAgICAgaGVhdHMgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHN1cGVyKGlkLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5faGVhdHMgPSBoZWF0cyB8fCBbXTtcbiAgICB9XG5cbiAgICBnZXREYXRhKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVhdHM7XG4gICAgfVxuXG4gICAgc2V0RGF0YShoZWF0cykge1xuICAgICAgICB0aGlzLl9oZWF0cyA9IGhlYXRzIHx8IFtdO1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVzZXREYXRhKCk7XG4gICAgfVxuXG4gICAgYWRkUG9pbnQoaGVhdCkge1xuICAgICAgICBpZiAoIWhlYXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWF0WzBdICYmIEFycmF5LmlzQXJyYXkoaGVhdFswXSkpIHtcbiAgICAgICAgICAgIG1hcHRhbGtzLlV0aWwucHVzaEluKHRoaXMuX2hlYXRzLCBoZWF0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYXRzLnB1c2goaGVhdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3VwZGF0ZShoZWF0KTtcbiAgICB9XG5cbiAgICBvbkNvbmZpZyhjb25mKSB7XG4gICAgICAgIGZvciAoY29uc3QgcCBpbiBjb25mKSB7XG4gICAgICAgICAgICBpZiAocCA9PT0gJ2dyYWRpZW50Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUdyYWRpZW50KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgX3VwZGF0ZUdyYWRpZW50KCkge1xuICAgICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuX2dldFJlbmRlcmVyKCk7XG4gICAgICAgIGlmIChyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIudXBkYXRlR3JhZGllbnQoKTtcbiAgICAgICAgICAgIHJlbmRlcmVyLnNldFRvUmVkcmF3KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgX3Jlc2V0RGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLl9nZXRSZW5kZXJlcigpO1xuICAgICAgICBpZiAocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLnJlc2V0RGF0YSgpO1xuICAgICAgICAgICAgcmVuZGVyZXIuc2V0VG9SZWRyYXcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBfdXBkYXRlKHBvaW50KSB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5fZ2V0UmVuZGVyZXIoKTtcbiAgICAgICAgaWYgKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci51cGRhdGVEYXRhKHBvaW50KTtcbiAgICAgICAgICAgIHJlbmRlcmVyLnNldFRvUmVkcmF3KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpc0VtcHR5KCkge1xuICAgICAgICBpZiAoIXRoaXMuX2hlYXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLl9oZWF0cyA9IFtdO1xuICAgICAgICB0aGlzLl9yZXNldERhdGEoKTtcbiAgICAgICAgdGhpcy5maXJlKCdjbGVhcicpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgdGhlIEhlYXRMYXllcidzIEpTT04uXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBsYXllcidzIEpTT05cbiAgICAgKi9cbiAgICB0b0pTT04ob3B0aW9ucykge1xuICAgICAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgJ3R5cGUnICAgICAgOiB0aGlzLmdldEpTT05UeXBlKCksXG4gICAgICAgICAgICAnaWQnICAgICAgICA6IHRoaXMuZ2V0SWQoKSxcbiAgICAgICAgICAgICdvcHRpb25zJyAgIDogdGhpcy5jb25maWcoKVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhKCk7XG4gICAgICAgIGlmIChvcHRpb25zWydjbGlwRXh0ZW50J10pIHtcbiAgICAgICAgICAgIGxldCBjbGlwRXh0ZW50ID0gbmV3IG1hcHRhbGtzLkV4dGVudChvcHRpb25zWydjbGlwRXh0ZW50J10pO1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMuX2dldEhlYXRSYWRpdXMoKTtcbiAgICAgICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICAgICAgY2xpcEV4dGVudCA9IGNsaXBFeHRlbnQuX2V4cGFuZChyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGNsaXBwZWQgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBkYXRhLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNsaXBFeHRlbnQuY29udGFpbnMobmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoZGF0YVtpXVswXSwgZGF0YVtpXVsxXSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsaXBwZWQucHVzaChkYXRhW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqc29uWydkYXRhJ10gPSBjbGlwcGVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAganNvblsnZGF0YSddID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBqc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlcHJvZHVjZSBhIEhlYXRMYXllciBmcm9tIGxheWVyJ3MgSlNPTi5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGpzb24gLSBsYXllcidzIEpTT05cbiAgICAgKiBAcmV0dXJuIHttYXB0YWxrcy5IZWF0TGF5ZXJ9XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICovXG4gICAgc3RhdGljIGZyb21KU09OKGpzb24pIHtcbiAgICAgICAgaWYgKCFqc29uIHx8IGpzb25bJ3R5cGUnXSAhPT0gJ0hlYXRMYXllcicpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgcmV0dXJuIG5ldyBIZWF0TGF5ZXIoanNvblsnaWQnXSwganNvblsnZGF0YSddLCBqc29uWydvcHRpb25zJ10pO1xuICAgIH1cblxuXG4gICAgX2dldEhlYXRSYWRpdXMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fZ2V0UmVuZGVyZXIoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldFJlbmRlcmVyKCkuX2hlYXRSYWRpdXM7XG4gICAgfVxufVxuXG5IZWF0TGF5ZXIubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xuXG5IZWF0TGF5ZXIucmVnaXN0ZXJKU09OVHlwZSgnSGVhdExheWVyJyk7XG5cbkhlYXRMYXllci5yZWdpc3RlclJlbmRlcmVyKCdjYW52YXMnLCBjbGFzcyBleHRlbmRzIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyIHtcblxuICAgIGRyYXcoKSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMuZ2V0TWFwKCksXG4gICAgICAgICAgICBsYXllciA9IHRoaXMubGF5ZXIsXG4gICAgICAgICAgICBleHRlbnQgPSBtYXAuZ2V0Q29udGFpbmVyRXh0ZW50KCk7XG4gICAgICAgIGxldCBtYXNrRXh0ZW50ID0gdGhpcy5wcmVwYXJlQ2FudmFzKCksXG4gICAgICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZXh0ZW50O1xuICAgICAgICBpZiAobWFza0V4dGVudCkge1xuICAgICAgICAgICAgbWFza0V4dGVudCA9IG1hc2tFeHRlbnQuY29udmVydFRvKGMgPT4gbWFwLl9wb2ludFRvQ29udGFpbmVyUG9pbnQoYykpO1xuICAgICAgICAgICAgLy9vdXQgb2YgbGF5ZXIgbWFza1xuICAgICAgICAgICAgaWYgKCFtYXNrRXh0ZW50LmludGVyc2VjdHMoZXh0ZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGVSZW5kZXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZXh0ZW50LmludGVyc2VjdGlvbihtYXNrRXh0ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5faGVhdGVyKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0ZXIgPSBzaW1wbGVoZWF0KHRoaXMuY2FudmFzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9oZWF0ZXIucmFkaXVzKGxheWVyLm9wdGlvbnNbJ3JhZGl1cyddIHx8IHRoaXMuX2hlYXRlci5kZWZhdWx0UmFkaXVzLCBsYXllci5vcHRpb25zWydibHVyJ10pO1xuICAgICAgICBpZiAobGF5ZXIub3B0aW9uc1snZ3JhZGllbnQnXSkge1xuICAgICAgICAgICAgdGhpcy5faGVhdGVyLmdyYWRpZW50KGxheWVyLm9wdGlvbnNbJ2dyYWRpZW50J10pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2hlYXRlci5tYXgobGF5ZXIub3B0aW9uc1snbWF4J10pO1xuICAgICAgICAvL2EgY2FjaGUgb2YgaGVhdCBwb2ludHMnIHZpZXdwb2ludHMuXG4gICAgICAgIGlmICghdGhpcy5faGVhdFZpZXdzKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0Vmlld3MgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhlYXRzID0gbGF5ZXIuZ2V0RGF0YSgpO1xuICAgICAgICBpZiAoaGVhdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuX2hlYXREYXRhKGhlYXRzLCBkaXNwbGF5RXh0ZW50KTtcbiAgICAgICAgdGhpcy5faGVhdGVyLmRhdGEoZGF0YSkuZHJhdyhsYXllci5vcHRpb25zWydtaW5PcGFjaXR5J10pO1xuICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgfVxuXG4gICAgZHJhd09uSW50ZXJhY3RpbmcoKSB7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH1cblxuICAgIF9oZWF0RGF0YShoZWF0cywgZGlzcGxheUV4dGVudCkge1xuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmdldE1hcCgpLFxuICAgICAgICAgICAgbGF5ZXIgPSB0aGlzLmxheWVyO1xuICAgICAgICBjb25zdCBwcm9qZWN0aW9uID0gbWFwLmdldFByb2plY3Rpb24oKTtcbiAgICAgICAgY29uc3QgZGF0YSA9IFtdLFxuICAgICAgICAgICAgciA9IHRoaXMuX2hlYXRlci5fcixcbiAgICAgICAgICAgIG1heCA9IGxheWVyLm9wdGlvbnNbJ21heCddID09PSB1bmRlZmluZWQgPyAxIDogbGF5ZXIub3B0aW9uc1snbWF4J10sXG4gICAgICAgICAgICBjZWxsU2l6ZSA9IHIgLyAyLFxuICAgICAgICAgICAgZ3JpZCA9IFtdLFxuICAgICAgICAgICAgcGFuZVBvcyA9IG1hcC5vZmZzZXRQbGF0Zm9ybSgpLFxuICAgICAgICAgICAgb2Zmc2V0WCA9IHBhbmVQb3MueCAlIGNlbGxTaXplLFxuICAgICAgICAgICAgb2Zmc2V0WSA9IHBhbmVQb3MueSAlIGNlbGxTaXplO1xuICAgICAgICBsZXQgaGVhdCwgcCwgY2VsbCwgeCwgeSwgaztcbiAgICAgICAgZGlzcGxheUV4dGVudCA9IGRpc3BsYXlFeHRlbnQuZXhwYW5kKHIpLmNvbnZlcnRUbyhjID0+IG5ldyBtYXB0YWxrcy5Qb2ludChtYXAuX2NvbnRhaW5lclBvaW50VG9QcmooYykpKTtcbiAgICAgICAgdGhpcy5faGVhdFJhZGl1cyA9IHI7XG4gICAgICAgIGNvbnN0IGNvb3JkID0gbmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoMCwgMCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gaGVhdHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBoZWF0ID0gaGVhdHNbaV07XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2hlYXRWaWV3c1tpXSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2hlYXRWaWV3c1tpXSA9IHByb2plY3Rpb24ucHJvamVjdChjb29yZC5zZXQoaGVhdFswXSwgaGVhdFsxXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcCA9IHRoaXMuX2hlYXRWaWV3c1tpXTtcbiAgICAgICAgICAgIGlmIChkaXNwbGF5RXh0ZW50LmNvbnRhaW5zKHApKSB7XG4gICAgICAgICAgICAgICAgcCA9IG1hcC5fcHJqVG9Db250YWluZXJQb2ludChwKTtcbiAgICAgICAgICAgICAgICB4ID0gTWF0aC5mbG9vcigocC54IC0gb2Zmc2V0WCkgLyBjZWxsU2l6ZSkgKyAyO1xuICAgICAgICAgICAgICAgIHkgPSBNYXRoLmZsb29yKChwLnkgLSBvZmZzZXRZKSAvIGNlbGxTaXplKSArIDI7XG5cbiAgICAgICAgICAgICAgICBrID0gKGhlYXRbMl0gIT09IHVuZGVmaW5lZCA/ICtoZWF0WzJdIDogMC4xKSAqIGxheWVyLm9wdGlvbnNbJ2hlYXRWYWx1ZVNjYWxlJ107XG5cbiAgICAgICAgICAgICAgICBncmlkW3ldID0gZ3JpZFt5XSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjZWxsID0gZ3JpZFt5XVt4XTtcblxuICAgICAgICAgICAgICAgIGlmICghY2VsbCkge1xuICAgICAgICAgICAgICAgICAgICBncmlkW3ldW3hdID0gW3AueCwgcC55LCBrXTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGxbMF0gPSAoY2VsbFswXSAqIGNlbGxbMl0gKyAocC54KSAqIGspIC8gKGNlbGxbMl0gKyBrKTsgLy8geFxuICAgICAgICAgICAgICAgICAgICBjZWxsWzFdID0gKGNlbGxbMV0gKiBjZWxsWzJdICsgKHAueSkgKiBrKSAvIChjZWxsWzJdICsgayk7IC8vIHlcbiAgICAgICAgICAgICAgICAgICAgY2VsbFsyXSArPSBrOyAvLyBjdW11bGF0ZWQgaW50ZW5zaXR5IHZhbHVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gZ3JpZC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChncmlkW2ldKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDAsIGxsID0gZ3JpZFtpXS5sZW5ndGg7IGogPCBsbDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwgPSBncmlkW2ldW2pdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoKFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKGNlbGxbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQoY2VsbFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5taW4oY2VsbFsyXSwgbWF4KVxuICAgICAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgb25ab29tRW5kKCkge1xuICAgICAgICBkZWxldGUgdGhpcy5faGVhdFZpZXdzO1xuICAgICAgICBzdXBlci5vblpvb21FbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBvblJlc2l6ZSgpIHtcbiAgICAgICAgc3VwZXIub25SZXNpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKHRoaXMuY2FudmFzKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0ZXIuX3dpZHRoICA9IHRoaXMuY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5faGVhdGVyLl9oZWlnaHQgPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvblJlbW92ZSgpIHtcbiAgICAgICAgdGhpcy5jbGVhckhlYXRDYWNoZSgpO1xuICAgICAgICBkZWxldGUgdGhpcy5faGVhdGVyO1xuICAgIH1cblxuICAgIHVwZGF0ZURhdGEoKSB7XG4gICAgfVxuXG4gICAgcmVzZXREYXRhKCkge1xuICAgICAgICB0aGlzLmNsZWFySGVhdENhY2hlKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlR3JhZGllbnQoKSB7XG4gICAgfVxuXG4gICAgY2xlYXJIZWF0Q2FjaGUoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9oZWF0Vmlld3M7XG4gICAgfVxufSk7XG5cbmlmICh0eXBlb2YgQ2FudmFzQ29tcGF0aWJsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBIZWF0TGF5ZXIucmVnaXN0ZXJSZW5kZXJlcignZ2wnLCBjbGFzcyBleHRlbmRzIENhbnZhc0NvbXBhdGlibGUobWFwdGFsa3MucmVuZGVyZXIuTGF5ZXJBYnN0cmFjdFJlbmRlcmVyKSB7XG4gICAgICAgIGRyYXdPbkludGVyYWN0aW5nKGV2ZW50LCB0aW1lc3RhbXAsIHBhcmVudENvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuZHJhdyh0aW1lc3RhbXAsIHBhcmVudENvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZHJhdyh0aW1lc3RhbXAsIHBhcmVudENvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMucHJlcGFyZUNhbnZhcygpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9yZW5kZXJlcikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGhlYXRzID0gdGhpcy5sYXllci5nZXREYXRhKCk7XG4gICAgICAgICAgICBpZiAoaGVhdHMubGVuZ3RoICE9PSB0aGlzLnBvaW50Q291bnQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5wb2ludENvdW50OyBpIDwgaGVhdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRQb2ludCguLi5oZWF0c1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUdlb21ldHJ5RGF0YSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZmJvID0gcGFyZW50Q29udGV4dCAmJiBwYXJlbnRDb250ZXh0LnJlbmRlclRhcmdldCAmJiBjb250ZXh0LnJlbmRlclRhcmdldC5mYm87XG4gICAgICAgICAgICB0aGlzLl9jbGVhckZCTygpO1xuICAgICAgICAgICAgdGhpcy5fZ2VvbWV0cnkuc2V0RHJhd0NvdW50KHRoaXMucG9pbnRDb3VudCAqIDYpO1xuICAgICAgICAgICAgY29uc3QgbWFwID0gdGhpcy5nZXRNYXAoKTtcbiAgICAgICAgICAgIGNvbnN0IGdsUmVzID0gbWFwLmdldEdMUmVzKCk7XG4gICAgICAgICAgICBjb25zdCB1bmlmb3JtcyA9IHtcbiAgICAgICAgICAgICAgICB6b29tU2NhbGU6IG1hcC5nZXRSZXNvbHV0aW9uKCkgLyBnbFJlcyxcbiAgICAgICAgICAgICAgICBwcm9qVmlld01vZGVsTWF0cml4OiBtYXAucHJvalZpZXdNYXRyaXhcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJlci5yZW5kZXIodGhpcy5fcG9pbnRTaGFkZXIsIHVuaWZvcm1zLCB0aGlzLl9zY2VuZSwgdGhpcy5fZmJvKTtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcmVyLnJlbmRlcih0aGlzLl9ncmFkaWVudFNoYWRlciwgbnVsbCwgdGhpcy5fZ3JhZGllbnRTY2VuZSwgZmJvKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZURhdGEocG9pbnQpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkUG9pbnQocG9pbnRbMF0sIHBvaW50WzFdLCBwb2ludFsyXSk7XG4gICAgICAgIH1cblxuICAgICAgICBfY2xlYXJGQk8oKSB7XG4gICAgICAgICAgICB0aGlzLmRldmljZS5jbGVhcih7XG4gICAgICAgICAgICAgICAgY29sb3I6IFswLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICBkZXB0aDogMSxcbiAgICAgICAgICAgICAgICBmcmFtZWJ1ZmZlcjogdGhpcy5fZmJvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNsZWFySGVhdENhY2hlKCkge1xuXG4gICAgICAgIH1cblxuICAgICAgICByZXNldERhdGEoKSB7XG4gICAgICAgICAgICB0aGlzLl9yZXNldCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlR3JhZGllbnQoKSB7XG4gICAgICAgICAgICB0aGlzLl9pbml0R3JhZGllbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNsZWFyKCkge1xuICAgICAgICAgICAgdGhpcy5fcmVzZXQoKTtcbiAgICAgICAgICAgIHN1cGVyLmNsZWFyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBfcmVzZXQoKSB7XG4gICAgICAgICAgICB0aGlzLnBvaW50Q291bnQgPSAwO1xuICAgICAgICAgICAgdGhpcy5idWZmZXJJbmRleCA9IDA7XG4gICAgICAgICAgICB0aGlzLm9mZnNldEluZGV4ID0gMDtcbiAgICAgICAgICAgIHRoaXMuaW50ZW5zaXR5SW5kZXggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5pdENvbnRleHQoKSB7XG4gICAgICAgICAgICB0aGlzLl9pbml0RGF0YSgpO1xuICAgICAgICAgICAgdGhpcy5faW5pdE1lc2goKTtcbiAgICAgICAgICAgIHRoaXMuX2luaXRHcmFkaWVudCgpO1xuICAgICAgICAgICAgY29uc3Qgdmlld3BvcnQgPSB7XG4gICAgICAgICAgICAgICAgeCA6IDAsXG4gICAgICAgICAgICAgICAgeSA6IDAsXG4gICAgICAgICAgICAgICAgd2lkdGggOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbnZhcyA/IHRoaXMuY2FudmFzLndpZHRoIDogMTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhlaWdodCA6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FudmFzID8gdGhpcy5jYW52YXMuaGVpZ2h0IDogMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgZXh0cmFDb21tYW5kUHJvcHMgPSB7XG4gICAgICAgICAgICAgICAgYmxlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBmdW5jOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkc3Q6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBzcmM6IDFcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGVwdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHZpZXdwb3J0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9wb2ludFNoYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcbiAgICAgICAgICAgICAgICB2ZXJ0LFxuICAgICAgICAgICAgICAgIGZyYWcsXG4gICAgICAgICAgICAgICAgZXh0cmFDb21tYW5kUHJvcHNcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLl9ncmFkaWVudFNoYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcbiAgICAgICAgICAgICAgICB2ZXJ0OiBncmFkaWVudFZlcnQsXG4gICAgICAgICAgICAgICAgZnJhZzogZ3JhZGllbnRGcmFnLFxuICAgICAgICAgICAgICAgIGV4dHJhQ29tbWFuZFByb3BzOiB7XG4gICAgICAgICAgICAgICAgICAgIGJsZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkZXB0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3BvcnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9pbml0RGF0YSgpIHtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVySW5kZXggPSAwO1xuICAgICAgICAgICAgdGhpcy5vZmZzZXRJbmRleCA9IDA7XG4gICAgICAgICAgICB0aGlzLmludGVuc2l0eUluZGV4ID0gMDtcbiAgICAgICAgICAgIHRoaXMucG9pbnRDb3VudCA9IDA7XG4gICAgICAgICAgICB0aGlzLm1heFBvaW50Q291bnQgPSAxMDI0ICogMTA7XG5cbiAgICAgICAgICAgIGNvbnN0IHsgcG9zaXRpb25CdWZmZXJEYXRhLCBvZmZzZXRCdWZmZXJEYXRhLCBpbnRlbnNpdHlCdWZmZXJEYXRhIH0gPSB0aGlzLl9pbml0QnVmZmVycygpO1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJ1ZmZlckRhdGEgPSBwb3NpdGlvbkJ1ZmZlckRhdGE7XG4gICAgICAgICAgICB0aGlzLm9mZnNldEJ1ZmZlckRhdGEgPSBvZmZzZXRCdWZmZXJEYXRhO1xuICAgICAgICAgICAgdGhpcy5pbnRlbnNpdHlCdWZmZXJEYXRhID0gaW50ZW5zaXR5QnVmZmVyRGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9pbml0QnVmZmVycygpIHtcbiAgICAgICAgICAgIGNvbnN0IHZlcnRleFNpemUgPSAyO1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0U2l6ZSA9IDI7XG4gICAgICAgICAgICBjb25zdCBpbnRlbnNpdHlTaXplID0gMTtcbiAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uQnVmZmVyRGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhQb2ludENvdW50ICogdmVydGV4U2l6ZSAqIDZcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXRCdWZmZXJEYXRhID0gbmV3IEludDE2QXJyYXkoXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhQb2ludENvdW50ICogb2Zmc2V0U2l6ZSAqIDZcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBpbnRlbnNpdHlCdWZmZXJEYXRhID0gbmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhQb2ludENvdW50ICogaW50ZW5zaXR5U2l6ZSAqIDZcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4geyBwb3NpdGlvbkJ1ZmZlckRhdGEsIG9mZnNldEJ1ZmZlckRhdGEsIGludGVuc2l0eUJ1ZmZlckRhdGEgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9pbml0TWVzaCgpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcmVyID0gbmV3IHJlc2hhZGVyLlJlbmRlcmVyKHRoaXMuZGV2aWNlKTtcbiAgICAgICAgICAgIHRoaXMuX2dlb21ldHJ5ID0gbmV3IHJlc2hhZGVyLkdlb21ldHJ5KFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgYVBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uQnVmZmVyRGF0YSxcbiAgICAgICAgICAgICAgICAgICAgYU9mZnNldDogdGhpcy5vZmZzZXRCdWZmZXJEYXRhLFxuICAgICAgICAgICAgICAgICAgICBhSW50ZW5zaXR5OiB0aGlzLmludGVuc2l0eUJ1ZmZlckRhdGFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgdGhpcy5wb2ludENvdW50ICogNixcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uU2l6ZTogMlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLl9nZW9tZXRyeS5nZW5lcmF0ZUJ1ZmZlcnModGhpcy5kZXZpY2UpO1xuICAgICAgICAgICAgdGhpcy5fbWVzaCA9IG5ldyByZXNoYWRlci5NZXNoKHRoaXMuX2dlb21ldHJ5KTtcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lID0gbmV3IHJlc2hhZGVyLlNjZW5lKFt0aGlzLl9tZXNoXSk7XG4gICAgICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhcztcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5kZXZpY2UudGV4dHVyZSh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2Zsb2F0MTYnLFxuICAgICAgICAgICAgICAgIG1pbjogJ25lYXJlc3QnLFxuICAgICAgICAgICAgICAgIG1hZzogJ25lYXJlc3QnLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgICAgIC8vIG5lZWRlZCBieSB3ZWJncHVcbiAgICAgICAgICAgICAgICBzYW1wbGVDb3VudDogNFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLl9mYm8gPSB0aGlzLmRldmljZS5mcmFtZWJ1ZmZlcih7XG4gICAgICAgICAgICAgICAgd2lkdGg6IGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGNhbnZhcy5oZWlnaHQsXG4gICAgICAgICAgICAgICAgY29sb3JzOiBbY29sb3JdLFxuICAgICAgICAgICAgICAgIGNvbG9yRm9ybWF0OiAncmdiYScsXG4gICAgICAgICAgICAgICAgZGVwdGhTdGVuY2lsOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHF1YWQgPSBuZXcgSW50OEFycmF5KFtcbiAgICAgICAgICAgICAgICAtMSwgLTEsIDAsIDEsIDEsIC0xLCAwLCAxLCAtMSwgMSwgMCwgMSwgLTEsIDEsIDAsIDEsIDEsIC0xLCAwLCAxLCAxLCAxLCAwLCAxXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50R2VvbWV0cnkgPSBuZXcgcmVzaGFkZXIuR2VvbWV0cnkoXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhUG9zaXRpb246IHF1YWRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uU2l6ZTogNFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLl9ncmFkaWVudEdlb21ldHJ5LmdlbmVyYXRlQnVmZmVycyh0aGlzLmRldmljZSk7XG4gICAgICAgICAgICB0aGlzLl9ncmFkaWVudE1lc2ggPSBuZXcgcmVzaGFkZXIuTWVzaCh0aGlzLl9ncmFkaWVudEdlb21ldHJ5KTtcbiAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50U2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3RoaXMuX2dyYWRpZW50TWVzaF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgX2luaXRHcmFkaWVudCgpIHtcbiAgICAgICAgICAgIGNvbnN0IGdyYWRpZW50RGF0YSA9IGdyYWRpZW50KHRoaXMubGF5ZXIub3B0aW9uc1snZ3JhZGllbnQnXSk7XG4gICAgICAgICAgICBpZiAodGhpcy5fZ3JhZGllbnRUZXh0dXJlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2dyYWRpZW50VGV4dHVyZS51cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZ3JhZGllbnRUZXh0dXJlLnVwZGF0ZShncmFkaWVudERhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50VGV4dHVyZShncmFkaWVudERhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZ3JhZGllbnRUZXh0dXJlID0gdGhpcy5kZXZpY2UudGV4dHVyZShncmFkaWVudERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fZ3JhZGllbnRNZXNoLnNldFVuaWZvcm0oJ3NvdXJjZScsIHRoaXMuX2Zibyk7XG4gICAgICAgIH1cblxuICAgICAgICBhZGRWZXJ0ZXgoeCwgeSwgeHMsIHlzLCBpbnRlbnNpdHkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hcCA9IHRoaXMuZ2V0TWFwKCk7XG4gICAgICAgICAgICBjb25zdCBnbFJlcyA9IG1hcC5nZXRHTFJlcygpO1xuICAgICAgICAgICAgQ09PUkQuc2V0KHgsIHkpO1xuICAgICAgICAgICAgY29uc3QgcG9pbnQgPSBtYXAuY29vcmRUb1BvaW50QXRSZXMoQ09PUkQsIGdsUmVzLCBQT0lOVCk7XG4gICAgICAgICAgICB4ID0gcG9pbnQueDtcbiAgICAgICAgICAgIHkgPSBwb2ludC55O1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJ1ZmZlckRhdGFbdGhpcy5idWZmZXJJbmRleCsrXSA9IHg7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uQnVmZmVyRGF0YVt0aGlzLmJ1ZmZlckluZGV4KytdID0geTtcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0QnVmZmVyRGF0YVt0aGlzLm9mZnNldEluZGV4KytdID0geHM7XG4gICAgICAgICAgICB0aGlzLm9mZnNldEJ1ZmZlckRhdGFbdGhpcy5vZmZzZXRJbmRleCsrXSA9IHlzO1xuICAgICAgICAgICAgdGhpcy5pbnRlbnNpdHlCdWZmZXJEYXRhW3RoaXMuaW50ZW5zaXR5SW5kZXgrK10gPSBpbnRlbnNpdHkgKiAyNTU7XG4gICAgICAgIH1cblxuICAgICAgICBhZGRQb2ludCh4LCB5LCBpbnRlbnNpdHkpIHtcbiAgICAgICAgICAgIGNvbnN0IHNpemUgPSB0aGlzLmxheWVyLm9wdGlvbnNbJ3JhZGl1cyddIHx8IDI1O1xuICAgICAgICAgICAgaWYgKGludGVuc2l0eSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaW50ZW5zaXR5ID0gMC4yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF4ID0gdGhpcy5sYXllci5vcHRpb25zWydtYXgnXSB8fCAxO1xuICAgICAgICAgICAgaW50ZW5zaXR5IC89IG1heDtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrKCk7XG4gICAgICAgICAgICBjb25zdCBzID0gc2l6ZTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksIC1zLCAtcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksICtzLCAtcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksIC1zLCArcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksIC1zLCArcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksICtzLCAtcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksICtzLCArcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb2ludENvdW50ICs9IDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2NoZWNrKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRDb3VudCA+PSB0aGlzLm1heFBvaW50Q291bnQgLSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXhQb2ludENvdW50ICs9IDEwMjQgKiAxMDtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHBvc2l0aW9uQnVmZmVyRGF0YSwgb2Zmc2V0QnVmZmVyRGF0YSwgaW50ZW5zaXR5QnVmZmVyRGF0YSB9ID0gdGhpcy5faW5pdEJ1ZmZlcnMoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVmZmVySW5kZXg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbkJ1ZmZlckRhdGFbaV0gPSB0aGlzLnBvc2l0aW9uQnVmZmVyRGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0QnVmZmVyRGF0YVtpXSA9IHRoaXMub2Zmc2V0QnVmZmVyRGF0YVtpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmludGVuc2l0eUluZGV4OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZW5zaXR5QnVmZmVyRGF0YVtpXSA9IHRoaXMuaW50ZW5zaXR5QnVmZmVyRGF0YVtpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJ1ZmZlckRhdGEgPSBwb3NpdGlvbkJ1ZmZlckRhdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmZzZXRCdWZmZXJEYXRhID0gb2Zmc2V0QnVmZmVyRGF0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmludGVuc2l0eUJ1ZmZlckRhdGEgPSBpbnRlbnNpdHlCdWZmZXJEYXRhO1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUdlb21ldHJ5RGF0YSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgX3VwZGF0ZUdlb21ldHJ5RGF0YSgpIHtcbiAgICAgICAgICAgIHRoaXMuX2dlb21ldHJ5LnVwZGF0ZURhdGEoJ2FQb3NpdGlvbicsIHRoaXMucG9zaXRpb25CdWZmZXJEYXRhKTtcbiAgICAgICAgICAgIHRoaXMuX2dlb21ldHJ5LnVwZGF0ZURhdGEoJ2FPZmZzZXQnLCB0aGlzLm9mZnNldEJ1ZmZlckRhdGEpO1xuICAgICAgICAgICAgdGhpcy5fZ2VvbWV0cnkudXBkYXRlRGF0YSgnYUludGVuc2l0eScsIHRoaXMuaW50ZW5zaXR5QnVmZmVyRGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBvblJlc2l6ZShwYXJhbXMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9mYm8gJiYgdGhpcy5jYW52YXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhcztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fZmJvLndpZHRoICE9PSBjYW52YXMud2lkdGggfHwgdGhpcy5fZmJvLmhlaWdodCAhPT0gY2FudmFzLmhlaWdodCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9mYm8ucmVzaXplKGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3VwZXIub25SZXNpemUocGFyYW1zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9uUmVtb3ZlKCkge1xuICAgICAgICAgICAgdGhpcy5fcmVzZXQoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9wb2ludFNoYWRlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BvaW50U2hhZGVyLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fcG9pbnRTaGFkZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5fZ3JhZGllbnRTaGFkZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9ncmFkaWVudFNoYWRlci5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2dyYWRpZW50U2hhZGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2dyYWRpZW50VGV4dHVyZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50VGV4dHVyZS5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2dyYWRpZW50VGV4dHVyZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9tZXNoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWVzaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX21lc2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5fZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2dlb21ldHJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2Zibykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2Ziby5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2ZibztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9ncmFkaWVudE1lc2gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9ncmFkaWVudE1lc2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ncmFkaWVudE1lc2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5fZ3JhZGllbnRHZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50R2VvbWV0cnkuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ncmFkaWVudEdlb21ldHJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMucG9zaXRpb25CdWZmZXJEYXRhO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMub2Zmc2V0QnVmZmVyRGF0YTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmludGVuc2l0eUJ1ZmZlckRhdGE7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fcmVuZGVyZXI7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fc2NlbmU7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZ3JhZGllbnRTY2VuZTtcbiAgICAgICAgICAgIHN1cGVyLm9uUmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ3JhZGllbnQoZ3JhZCkge1xuICAgIC8vIGNyZWF0ZSBhIDI1NngxIGdyYWRpZW50IHRoYXQgd2UnbGwgdXNlIHRvIHR1cm4gYSBncmF5c2NhbGUgaGVhdG1hcCBpbnRvIGEgY29sb3JlZCBvbmVcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgICAgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJywge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pLFxuICAgICAgICBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCAyNTYpO1xuXG4gICAgY2FudmFzLndpZHRoID0gMjU2O1xuICAgIGNhbnZhcy5oZWlnaHQgPSAxO1xuXG4gICAgZm9yIChjb25zdCBpIGluIGdyYWQpIHtcbiAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKCtpLCBncmFkW2ldKTtcbiAgICB9XG5cbiAgICBjdHguZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgY3R4LmZpbGxSZWN0KDAsIDAsIDEsIDI1Nik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBkYXRhOiBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIDEsIDI1NikuZGF0YSxcbiAgICAgICAgd2lkdGg6IGNhbnZhcy53aWR0aCxcbiAgICAgICAgaGVpZ2h0OiBjYW52YXMuaGVpZ2h0XG4gICAgfTtcbn1cbiJdLCJuYW1lcyI6WyJtYXB0YWxrcyIsIkNhbnZhc0NvbXBhdGlibGUiLCJyZXNoYWRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBO0lBQ21DLE1BQUEsQ0FBQSxPQUFBLEdBQWlCLFVBQVUsQ0FBQztBQUMvRDtJQUNBLFNBQVMsVUFBVSxDQUFDLE1BQU0sRUFBRTtJQUM1QixJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksVUFBVSxDQUFDLEVBQUUsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNyRTtJ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QUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN6RDtJQUNBLFFBQVEsT0FBTyxJQUFJLENBQUM7SUFDcEIsS0FBSztBQUNMO0lBQ0EsSUFBSSxJQUFJLEVBQUUsVUFBVSxVQUFVLEVBQUU7SUFDaEMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUMzRCxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzdEO0lBQ0EsUUFBUSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQzVCO0lBQ0EsUUFBUSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkQ7SUFDQTtJQUNBLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO0lBQ2xFLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUIsWUFBWSxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxLQUFLLFNBQVMsR0FBRyxJQUFJLEdBQUcsVUFBVSxDQUFDLENBQUM7SUFDdkcsWUFBWSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxH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QUFHLENBQUMsQ0FBQztBQUN0QjtJQUNBLElBQUksS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUU7SUFDMUIsUUFBUSxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNDLEtBQUs7QUFDTDtJQUNBLElBQUksR0FBRyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7SUFDN0IsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQy9CO0lBQ0EsSUFBSSxPQUFPO0lBQ1gsUUFBUSxJQUFJLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJO0lBQ2pELFFBQVEsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO0lBQzNCLFFBQVEsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO0lBQzdCLEtBQUssQ0FBQztJQUNOOzs7Ozs7Ozs7Ozs7In0=
