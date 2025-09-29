/*!
 * maptalks.heatmap v0.6.2
 * LICENSE : MIT
 * (c) 2016-2025 maptalks.org
 */
import * as maptalks from 'maptalks';
import { CanvasCompatible, reshader } from '@maptalks/gl';

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

var vert = "attribute vec2 aPosition;\nattribute vec2 aOffset;\nattribute float aIntensity;\nvarying vec2 off, dim;\nvarying float vIntensity;\nuniform mat4 projViewModelMatrix;\nuniform float zoomScale;\nvoid main() {\n    vec2 off = aOffset;\n    dim = abs(off);\n    vec2 pos = aPosition.xy + zoomScale * off;\n    vIntensity = aIntensity / 255.0;\n    gl_Position = projViewModelMatrix * vec4(pos, 0.0, 1.0);\n}";

var frag = "precision highp int;\nprecision highp float;\nvarying vec2 off, dim;\nvarying float vIntensity;\nvoid main() {\n    float falloff = (1.0 - smoothstep(0.0, 1.0, length(off / dim)));\n    float intensity = falloff * vIntensity;\n    gl_FragColor = vec4(intensity);\n}";

var gradientVert = "attribute vec4 aPosition;\nvarying vec2 texcoord;\nvoid main() {\n    texcoord = aPosition.xy * 0.5 + 0.5;\n    gl_Position = aPosition;\n}";

var gradientFrag = "precision highp int;\nprecision highp float;\nuniform sampler2D source;\nvarying vec2 texcoord;\nfloat linstep(float low, float high, float value) {\n    return clamp((value-low)/(high-low), 0.0, 1.0);\n}\nfloat fade(float low, float high, float value) {\n    float mid = (low+high)*0.5;\n    float range = (high-low)*0.5;\n    float x = 1.0 - clamp(abs(mid-value)/range, 0.0, 1.0);\n    return smoothstep(0.0, 1.0, x);\n}\nvec3 getColor(float intensity) {\n    vec3 blue = vec3(0.0, 0.0, 1.0);\n    vec3 cyan = vec3(0.0, 1.0, 1.0);\n    vec3 green = vec3(0.0, 1.0, 0.0);\n    vec3 yellow = vec3(1.0, 1.0, 0.0);\n    vec3 red = vec3(1.0, 0.0, 0.0);\n    vec3 color = (\n    fade(-0.25, 0.25, intensity)*blue +\n    fade(0.0, 0.5, intensity)*cyan +\n    fade(0.25, 0.75, intensity)*green +\n    fade(0.5, 1.0, intensity)*yellow +\n    smoothstep(0.75, 1.0, intensity)*red\n    );\n    return color;\n}\nvec4 alphaFun(vec3 color, float intensity) {\n    float alpha = smoothstep(0.00000000, 1.00000000, intensity);\n    return vec4(color*alpha, alpha);\n}\nvoid main() {\n    vec4 data = texture2D(source, texcoord);\n    float intensity = smoothstep(0.0, 1.0, data.r);\n    vec3 color = getColor(intensity);\n    gl_FragColor = alphaFun(color, intensity);\n    gl_FragColor = data;\n}";

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

const COORD = new maptalks.Coordinate(0, 0);
const POINT = new maptalks.Point(0, 0);

class HeatLayer extends maptalks.Layer {

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
            maptalks.Util.pushIn(this._heats, heat);
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
            let clipExtent = new maptalks.Extent(options['clipExtent']);
            const r = this._getHeatRadius();
            if (r) {
                clipExtent = clipExtent._expand(r);
            }
            const clipped = [];
            for (let i = 0, len = data.length; i < len; i++) {
                if (clipExtent.contains(new maptalks.Coordinate(data[i][0], data[i][1]))) {
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

HeatLayer.registerRenderer('canvas', class extends maptalks.renderer.CanvasRenderer {

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
        displayExtent = displayExtent.expand(r).convertTo(c => new maptalks.Point(map._containerPointToPrj(c)));
        this._heatRadius = r;
        const coord = new maptalks.Coordinate(0, 0);
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

if (typeof CanvasCompatible !== 'undefined') {
    HeatLayer.registerRenderer('gl', class extends CanvasCompatible(maptalks.renderer.LayerAbstractRenderer) {
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
            this._pointShader = new reshader.MeshShader({
                vert,
                frag,
                extraCommandProps
            });

            this._gradientShader = new reshader.MeshShader({
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
            this._renderer = new reshader.Renderer(this.device);
            this._geometry = new reshader.Geometry(
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
            this._mesh = new reshader.Mesh(this._geometry);
            this._scene = new reshader.Scene([this._mesh]);
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
            this._gradientGeometry = new reshader.Geometry(
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
            this._gradientMesh = new reshader.Mesh(this._gradientGeometry);
            this._gradientScene = new reshader.Scene([this._gradientMesh]);
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

export { HeatLayer };

typeof console !== 'undefined' && console.log('maptalks.heatmap v0.6.2');
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFwdGFsa3MuaGVhdG1hcC5lcy5qcyIsInNvdXJjZXMiOlsiLi4vbm9kZV9tb2R1bGVzL3NpbXBsZWhlYXQvc2ltcGxlaGVhdC5qcyIsIi4uL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IHNpbXBsZWhlYXQ7XG5cbmZ1bmN0aW9uIHNpbXBsZWhlYXQoY2FudmFzKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIHNpbXBsZWhlYXQpKSByZXR1cm4gbmV3IHNpbXBsZWhlYXQoY2FudmFzKTtcblxuICAgIHRoaXMuX2NhbnZhcyA9IGNhbnZhcyA9IHR5cGVvZiBjYW52YXMgPT09ICdzdHJpbmcnID8gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2FudmFzKSA6IGNhbnZhcztcblxuICAgIHRoaXMuX2N0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHRoaXMuX3dpZHRoID0gY2FudmFzLndpZHRoO1xuICAgIHRoaXMuX2hlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XG5cbiAgICB0aGlzLl9tYXggPSAxO1xuICAgIHRoaXMuX2RhdGEgPSBbXTtcbn1cblxuc2ltcGxlaGVhdC5wcm90b3R5cGUgPSB7XG5cbiAgICBkZWZhdWx0UmFkaXVzOiAyNSxcblxuICAgIGRlZmF1bHRHcmFkaWVudDoge1xuICAgICAgICAwLjQ6ICdibHVlJyxcbiAgICAgICAgMC42OiAnY3lhbicsXG4gICAgICAgIDAuNzogJ2xpbWUnLFxuICAgICAgICAwLjg6ICd5ZWxsb3cnLFxuICAgICAgICAxLjA6ICdyZWQnXG4gICAgfSxcblxuICAgIGRhdGE6IGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIHRoaXMuX2RhdGEgPSBkYXRhO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgbWF4OiBmdW5jdGlvbiAobWF4KSB7XG4gICAgICAgIHRoaXMuX21heCA9IG1heDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZDogZnVuY3Rpb24gKHBvaW50KSB7XG4gICAgICAgIHRoaXMuX2RhdGEucHVzaChwb2ludCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9kYXRhID0gW107XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICByYWRpdXM6IGZ1bmN0aW9uIChyLCBibHVyKSB7XG4gICAgICAgIGJsdXIgPSBibHVyID09PSB1bmRlZmluZWQgPyAxNSA6IGJsdXI7XG5cbiAgICAgICAgLy8gY3JlYXRlIGEgZ3JheXNjYWxlIGJsdXJyZWQgY2lyY2xlIGltYWdlIHRoYXQgd2UnbGwgdXNlIGZvciBkcmF3aW5nIHBvaW50c1xuICAgICAgICB2YXIgY2lyY2xlID0gdGhpcy5fY2lyY2xlID0gdGhpcy5fY3JlYXRlQ2FudmFzKCksXG4gICAgICAgICAgICBjdHggPSBjaXJjbGUuZ2V0Q29udGV4dCgnMmQnKSxcbiAgICAgICAgICAgIHIyID0gdGhpcy5fciA9IHIgKyBibHVyO1xuXG4gICAgICAgIGNpcmNsZS53aWR0aCA9IGNpcmNsZS5oZWlnaHQgPSByMiAqIDI7XG5cbiAgICAgICAgY3R4LnNoYWRvd09mZnNldFggPSBjdHguc2hhZG93T2Zmc2V0WSA9IHIyICogMjtcbiAgICAgICAgY3R4LnNoYWRvd0JsdXIgPSBibHVyO1xuICAgICAgICBjdHguc2hhZG93Q29sb3IgPSAnYmxhY2snO1xuXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYygtcjIsIC1yMiwgciwgMCwgTWF0aC5QSSAqIDIsIHRydWUpO1xuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICAgIGN0eC5maWxsKCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlc2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl93aWR0aCA9IHRoaXMuX2NhbnZhcy53aWR0aDtcbiAgICAgICAgdGhpcy5faGVpZ2h0ID0gdGhpcy5fY2FudmFzLmhlaWdodDtcbiAgICB9LFxuXG4gICAgZ3JhZGllbnQ6IGZ1bmN0aW9uIChncmFkKSB7XG4gICAgICAgIC8vIGNyZWF0ZSBhIDI1NngxIGdyYWRpZW50IHRoYXQgd2UnbGwgdXNlIHRvIHR1cm4gYSBncmF5c2NhbGUgaGVhdG1hcCBpbnRvIGEgY29sb3JlZCBvbmVcbiAgICAgICAgdmFyIGNhbnZhcyA9IHRoaXMuX2NyZWF0ZUNhbnZhcygpLFxuICAgICAgICAgICAgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyksXG4gICAgICAgICAgICBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCAyNTYpO1xuXG4gICAgICAgIGNhbnZhcy53aWR0aCA9IDE7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAyNTY7XG5cbiAgICAgICAgZm9yICh2YXIgaSBpbiBncmFkKSB7XG4gICAgICAgICAgICBncmFkaWVudC5hZGRDb2xvclN0b3AoK2ksIGdyYWRbaV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IGdyYWRpZW50O1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgMSwgMjU2KTtcblxuICAgICAgICB0aGlzLl9ncmFkID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCAxLCAyNTYpLmRhdGE7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRyYXc6IGZ1bmN0aW9uIChtaW5PcGFjaXR5KSB7XG4gICAgICAgIGlmICghdGhpcy5fY2lyY2xlKSB0aGlzLnJhZGl1cyh0aGlzLmRlZmF1bHRSYWRpdXMpO1xuICAgICAgICBpZiAoIXRoaXMuX2dyYWQpIHRoaXMuZ3JhZGllbnQodGhpcy5kZWZhdWx0R3JhZGllbnQpO1xuXG4gICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG5cbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KTtcblxuICAgICAgICAvLyBkcmF3IGEgZ3JheXNjYWxlIGhlYXRtYXAgYnkgcHV0dGluZyBhIGJsdXJyZWQgY2lyY2xlIGF0IGVhY2ggZGF0YSBwb2ludFxuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fZGF0YS5sZW5ndGgsIHA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgcCA9IHRoaXMuX2RhdGFbaV07XG4gICAgICAgICAgICBjdHguZ2xvYmFsQWxwaGEgPSBNYXRoLm1heChwWzJdIC8gdGhpcy5fbWF4LCBtaW5PcGFjaXR5ID09PSB1bmRlZmluZWQgPyAwLjA1IDogbWluT3BhY2l0eSk7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKHRoaXMuX2NpcmNsZSwgcFswXSAtIHRoaXMuX3IsIHBbMV0gLSB0aGlzLl9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGNvbG9yaXplIHRoZSBoZWF0bWFwLCB1c2luZyBvcGFjaXR5IHZhbHVlIG9mIGVhY2ggcGl4ZWwgdG8gZ2V0IHRoZSByaWdodCBjb2xvciBmcm9tIG91ciBncmFkaWVudFxuICAgICAgICB2YXIgY29sb3JlZCA9IGN0eC5nZXRJbWFnZURhdGEoMCwgMCwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodCk7XG4gICAgICAgIHRoaXMuX2NvbG9yaXplKGNvbG9yZWQuZGF0YSwgdGhpcy5fZ3JhZCk7XG4gICAgICAgIGN0eC5wdXRJbWFnZURhdGEoY29sb3JlZCwgMCwgMCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9jb2xvcml6ZTogZnVuY3Rpb24gKHBpeGVscywgZ3JhZGllbnQpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBpeGVscy5sZW5ndGgsIGo7IGkgPCBsZW47IGkgKz0gNCkge1xuICAgICAgICAgICAgaiA9IHBpeGVsc1tpICsgM10gKiA0OyAvLyBnZXQgZ3JhZGllbnQgY29sb3IgZnJvbSBvcGFjaXR5IHZhbHVlXG5cbiAgICAgICAgICAgIGlmIChqKSB7XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2ldID0gZ3JhZGllbnRbal07XG4gICAgICAgICAgICAgICAgcGl4ZWxzW2kgKyAxXSA9IGdyYWRpZW50W2ogKyAxXTtcbiAgICAgICAgICAgICAgICBwaXhlbHNbaSArIDJdID0gZ3JhZGllbnRbaiArIDJdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIF9jcmVhdGVDYW52YXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBjYW52YXMgaW5zdGFuY2UgaW4gbm9kZS5qc1xuICAgICAgICAgICAgLy8gdGhlIGNhbnZhcyBjbGFzcyBuZWVkcyB0byBoYXZlIGEgZGVmYXVsdCBjb25zdHJ1Y3RvciB3aXRob3V0IGFueSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY2FudmFzLmNvbnN0cnVjdG9yKCk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwiaW1wb3J0ICogYXMgbWFwdGFsa3MgZnJvbSAnbWFwdGFsa3MnO1xuaW1wb3J0IHNpbXBsZWhlYXQgZnJvbSAnc2ltcGxlaGVhdCc7XG5pbXBvcnQgeyByZXNoYWRlciwgQ2FudmFzQ29tcGF0aWJsZSB9IGZyb20gJ0BtYXB0YWxrcy9nbCc7XG5pbXBvcnQgdmVydCBmcm9tICcuL2dsc2wvcG9pbnRzLnZlcnQnO1xuaW1wb3J0IGZyYWcgZnJvbSAnLi9nbHNsL3BvaW50cy5mcmFnJztcbmltcG9ydCBncmFkaWVudFZlcnQgZnJvbSAnLi9nbHNsL2dyYWRpZW50LnZlcnQnO1xuaW1wb3J0IGdyYWRpZW50RnJhZyBmcm9tICcuL2dsc2wvZ3JhZGllbnQuZnJhZyc7XG5cbmNvbnN0IG9wdGlvbnMgPSB7XG4gICAgJ21heCcgOiAxLFxuICAgICdncmFkaWVudCcgOiB7XG4gICAgICAgIDAuNDogJ2JsdWUnLFxuICAgICAgICAwLjY6ICdjeWFuJyxcbiAgICAgICAgMC43OiAnbGltZScsXG4gICAgICAgIDAuODogJ3llbGxvdycsXG4gICAgICAgIDEuMDogJ3JlZCdcbiAgICB9LFxuICAgICdyYWRpdXMnIDogMjUsXG4gICAgJ2JsdXInIDogMTUsXG4gICAgJ2hlYXRWYWx1ZVNjYWxlJzogMSxcbiAgICAnbWluT3BhY2l0eScgOiAwLjA1XG59O1xuXG5jb25zdCBDT09SRCA9IG5ldyBtYXB0YWxrcy5Db29yZGluYXRlKDAsIDApO1xuY29uc3QgUE9JTlQgPSBuZXcgbWFwdGFsa3MuUG9pbnQoMCwgMCk7XG5cbmV4cG9ydCBjbGFzcyBIZWF0TGF5ZXIgZXh0ZW5kcyBtYXB0YWxrcy5MYXllciB7XG5cbiAgICBjb25zdHJ1Y3RvcihpZCwgaGVhdHMsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGhlYXRzKSkge1xuICAgICAgICAgICAgb3B0aW9ucyA9IGhlYXRzO1xuICAgICAgICAgICAgaGVhdHMgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHN1cGVyKGlkLCBvcHRpb25zKTtcbiAgICAgICAgdGhpcy5faGVhdHMgPSBoZWF0cyB8fCBbXTtcbiAgICB9XG5cbiAgICBnZXREYXRhKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5faGVhdHM7XG4gICAgfVxuXG4gICAgc2V0RGF0YShoZWF0cykge1xuICAgICAgICB0aGlzLl9oZWF0cyA9IGhlYXRzIHx8IFtdO1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVzZXREYXRhKCk7XG4gICAgfVxuXG4gICAgYWRkUG9pbnQoaGVhdCkge1xuICAgICAgICBpZiAoIWhlYXQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoZWF0WzBdICYmIEFycmF5LmlzQXJyYXkoaGVhdFswXSkpIHtcbiAgICAgICAgICAgIG1hcHRhbGtzLlV0aWwucHVzaEluKHRoaXMuX2hlYXRzLCBoZWF0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2hlYXRzLnB1c2goaGVhdCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX3VwZGF0ZShoZWF0KTtcbiAgICB9XG5cbiAgICBvbkNvbmZpZyhjb25mKSB7XG4gICAgICAgIGZvciAoY29uc3QgcCBpbiBjb25mKSB7XG4gICAgICAgICAgICBpZiAocCA9PT0gJ2dyYWRpZW50Jykge1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUdyYWRpZW50KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgX3VwZGF0ZUdyYWRpZW50KCkge1xuICAgICAgICBjb25zdCByZW5kZXJlciA9IHRoaXMuX2dldFJlbmRlcmVyKCk7XG4gICAgICAgIGlmIChyZW5kZXJlcikge1xuICAgICAgICAgICAgcmVuZGVyZXIudXBkYXRlR3JhZGllbnQoKTtcbiAgICAgICAgICAgIHJlbmRlcmVyLnNldFRvUmVkcmF3KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgX3Jlc2V0RGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVuZGVyZXIgPSB0aGlzLl9nZXRSZW5kZXJlcigpO1xuICAgICAgICBpZiAocmVuZGVyZXIpIHtcbiAgICAgICAgICAgIHJlbmRlcmVyLnJlc2V0RGF0YSgpO1xuICAgICAgICAgICAgcmVuZGVyZXIuc2V0VG9SZWRyYXcoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICBfdXBkYXRlKHBvaW50KSB7XG4gICAgICAgIGNvbnN0IHJlbmRlcmVyID0gdGhpcy5fZ2V0UmVuZGVyZXIoKTtcbiAgICAgICAgaWYgKHJlbmRlcmVyKSB7XG4gICAgICAgICAgICByZW5kZXJlci51cGRhdGVEYXRhKHBvaW50KTtcbiAgICAgICAgICAgIHJlbmRlcmVyLnNldFRvUmVkcmF3KCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpc0VtcHR5KCkge1xuICAgICAgICBpZiAoIXRoaXMuX2hlYXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLl9oZWF0cyA9IFtdO1xuICAgICAgICB0aGlzLl9yZXNldERhdGEoKTtcbiAgICAgICAgdGhpcy5maXJlKCdjbGVhcicpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBFeHBvcnQgdGhlIEhlYXRMYXllcidzIEpTT04uXG4gICAgICogQHJldHVybiB7T2JqZWN0fSBsYXllcidzIEpTT05cbiAgICAgKi9cbiAgICB0b0pTT04ob3B0aW9ucykge1xuICAgICAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0ge1xuICAgICAgICAgICAgJ3R5cGUnICAgICAgOiB0aGlzLmdldEpTT05UeXBlKCksXG4gICAgICAgICAgICAnaWQnICAgICAgICA6IHRoaXMuZ2V0SWQoKSxcbiAgICAgICAgICAgICdvcHRpb25zJyAgIDogdGhpcy5jb25maWcoKVxuICAgICAgICB9O1xuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5nZXREYXRhKCk7XG4gICAgICAgIGlmIChvcHRpb25zWydjbGlwRXh0ZW50J10pIHtcbiAgICAgICAgICAgIGxldCBjbGlwRXh0ZW50ID0gbmV3IG1hcHRhbGtzLkV4dGVudChvcHRpb25zWydjbGlwRXh0ZW50J10pO1xuICAgICAgICAgICAgY29uc3QgciA9IHRoaXMuX2dldEhlYXRSYWRpdXMoKTtcbiAgICAgICAgICAgIGlmIChyKSB7XG4gICAgICAgICAgICAgICAgY2xpcEV4dGVudCA9IGNsaXBFeHRlbnQuX2V4cGFuZChyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGNsaXBwZWQgPSBbXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBkYXRhLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNsaXBFeHRlbnQuY29udGFpbnMobmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoZGF0YVtpXVswXSwgZGF0YVtpXVsxXSkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsaXBwZWQucHVzaChkYXRhW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBqc29uWydkYXRhJ10gPSBjbGlwcGVkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAganNvblsnZGF0YSddID0gZGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBqc29uO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJlcHJvZHVjZSBhIEhlYXRMYXllciBmcm9tIGxheWVyJ3MgSlNPTi5cbiAgICAgKiBAcGFyYW0gIHtPYmplY3R9IGpzb24gLSBsYXllcidzIEpTT05cbiAgICAgKiBAcmV0dXJuIHttYXB0YWxrcy5IZWF0TGF5ZXJ9XG4gICAgICogQHN0YXRpY1xuICAgICAqIEBwcml2YXRlXG4gICAgICogQGZ1bmN0aW9uXG4gICAgICovXG4gICAgc3RhdGljIGZyb21KU09OKGpzb24pIHtcbiAgICAgICAgaWYgKCFqc29uIHx8IGpzb25bJ3R5cGUnXSAhPT0gJ0hlYXRMYXllcicpIHsgcmV0dXJuIG51bGw7IH1cbiAgICAgICAgcmV0dXJuIG5ldyBIZWF0TGF5ZXIoanNvblsnaWQnXSwganNvblsnZGF0YSddLCBqc29uWydvcHRpb25zJ10pO1xuICAgIH1cblxuXG4gICAgX2dldEhlYXRSYWRpdXMoKSB7XG4gICAgICAgIGlmICghdGhpcy5fZ2V0UmVuZGVyZXIoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldFJlbmRlcmVyKCkuX2hlYXRSYWRpdXM7XG4gICAgfVxufVxuXG5IZWF0TGF5ZXIubWVyZ2VPcHRpb25zKG9wdGlvbnMpO1xuXG5IZWF0TGF5ZXIucmVnaXN0ZXJKU09OVHlwZSgnSGVhdExheWVyJyk7XG5cbkhlYXRMYXllci5yZWdpc3RlclJlbmRlcmVyKCdjYW52YXMnLCBjbGFzcyBleHRlbmRzIG1hcHRhbGtzLnJlbmRlcmVyLkNhbnZhc1JlbmRlcmVyIHtcblxuICAgIGRyYXcoKSB7XG4gICAgICAgIGNvbnN0IG1hcCA9IHRoaXMuZ2V0TWFwKCksXG4gICAgICAgICAgICBsYXllciA9IHRoaXMubGF5ZXIsXG4gICAgICAgICAgICBleHRlbnQgPSBtYXAuZ2V0Q29udGFpbmVyRXh0ZW50KCk7XG4gICAgICAgIGxldCBtYXNrRXh0ZW50ID0gdGhpcy5wcmVwYXJlQ2FudmFzKCksXG4gICAgICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZXh0ZW50O1xuICAgICAgICBpZiAobWFza0V4dGVudCkge1xuICAgICAgICAgICAgbWFza0V4dGVudCA9IG1hc2tFeHRlbnQuY29udmVydFRvKGMgPT4gbWFwLl9wb2ludFRvQ29udGFpbmVyUG9pbnQoYykpO1xuICAgICAgICAgICAgLy9vdXQgb2YgbGF5ZXIgbWFza1xuICAgICAgICAgICAgaWYgKCFtYXNrRXh0ZW50LmludGVyc2VjdHMoZXh0ZW50KSkge1xuICAgICAgICAgICAgICAgIHRoaXMuY29tcGxldGVSZW5kZXIoKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkaXNwbGF5RXh0ZW50ID0gZXh0ZW50LmludGVyc2VjdGlvbihtYXNrRXh0ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdGhpcy5faGVhdGVyKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0ZXIgPSBzaW1wbGVoZWF0KHRoaXMuY2FudmFzKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9oZWF0ZXIucmFkaXVzKGxheWVyLm9wdGlvbnNbJ3JhZGl1cyddIHx8IHRoaXMuX2hlYXRlci5kZWZhdWx0UmFkaXVzLCBsYXllci5vcHRpb25zWydibHVyJ10pO1xuICAgICAgICBpZiAobGF5ZXIub3B0aW9uc1snZ3JhZGllbnQnXSkge1xuICAgICAgICAgICAgdGhpcy5faGVhdGVyLmdyYWRpZW50KGxheWVyLm9wdGlvbnNbJ2dyYWRpZW50J10pO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2hlYXRlci5tYXgobGF5ZXIub3B0aW9uc1snbWF4J10pO1xuICAgICAgICAvL2EgY2FjaGUgb2YgaGVhdCBwb2ludHMnIHZpZXdwb2ludHMuXG4gICAgICAgIGlmICghdGhpcy5faGVhdFZpZXdzKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0Vmlld3MgPSBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhlYXRzID0gbGF5ZXIuZ2V0RGF0YSgpO1xuICAgICAgICBpZiAoaGVhdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuX2hlYXREYXRhKGhlYXRzLCBkaXNwbGF5RXh0ZW50KTtcbiAgICAgICAgdGhpcy5faGVhdGVyLmRhdGEoZGF0YSkuZHJhdyhsYXllci5vcHRpb25zWydtaW5PcGFjaXR5J10pO1xuICAgICAgICB0aGlzLmNvbXBsZXRlUmVuZGVyKCk7XG4gICAgfVxuXG4gICAgZHJhd09uSW50ZXJhY3RpbmcoKSB7XG4gICAgICAgIHRoaXMuZHJhdygpO1xuICAgIH1cblxuICAgIF9oZWF0RGF0YShoZWF0cywgZGlzcGxheUV4dGVudCkge1xuICAgICAgICBjb25zdCBtYXAgPSB0aGlzLmdldE1hcCgpLFxuICAgICAgICAgICAgbGF5ZXIgPSB0aGlzLmxheWVyO1xuICAgICAgICBjb25zdCBwcm9qZWN0aW9uID0gbWFwLmdldFByb2plY3Rpb24oKTtcbiAgICAgICAgY29uc3QgZGF0YSA9IFtdLFxuICAgICAgICAgICAgciA9IHRoaXMuX2hlYXRlci5fcixcbiAgICAgICAgICAgIG1heCA9IGxheWVyLm9wdGlvbnNbJ21heCddID09PSB1bmRlZmluZWQgPyAxIDogbGF5ZXIub3B0aW9uc1snbWF4J10sXG4gICAgICAgICAgICBjZWxsU2l6ZSA9IHIgLyAyLFxuICAgICAgICAgICAgZ3JpZCA9IFtdLFxuICAgICAgICAgICAgcGFuZVBvcyA9IG1hcC5vZmZzZXRQbGF0Zm9ybSgpLFxuICAgICAgICAgICAgb2Zmc2V0WCA9IHBhbmVQb3MueCAlIGNlbGxTaXplLFxuICAgICAgICAgICAgb2Zmc2V0WSA9IHBhbmVQb3MueSAlIGNlbGxTaXplO1xuICAgICAgICBsZXQgaGVhdCwgcCwgY2VsbCwgeCwgeSwgaztcbiAgICAgICAgZGlzcGxheUV4dGVudCA9IGRpc3BsYXlFeHRlbnQuZXhwYW5kKHIpLmNvbnZlcnRUbyhjID0+IG5ldyBtYXB0YWxrcy5Qb2ludChtYXAuX2NvbnRhaW5lclBvaW50VG9QcmooYykpKTtcbiAgICAgICAgdGhpcy5faGVhdFJhZGl1cyA9IHI7XG4gICAgICAgIGNvbnN0IGNvb3JkID0gbmV3IG1hcHRhbGtzLkNvb3JkaW5hdGUoMCwgMCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gaGVhdHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBoZWF0ID0gaGVhdHNbaV07XG4gICAgICAgICAgICBpZiAoIXRoaXMuX2hlYXRWaWV3c1tpXSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2hlYXRWaWV3c1tpXSA9IHByb2plY3Rpb24ucHJvamVjdChjb29yZC5zZXQoaGVhdFswXSwgaGVhdFsxXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcCA9IHRoaXMuX2hlYXRWaWV3c1tpXTtcbiAgICAgICAgICAgIGlmIChkaXNwbGF5RXh0ZW50LmNvbnRhaW5zKHApKSB7XG4gICAgICAgICAgICAgICAgcCA9IG1hcC5fcHJqVG9Db250YWluZXJQb2ludChwKTtcbiAgICAgICAgICAgICAgICB4ID0gTWF0aC5mbG9vcigocC54IC0gb2Zmc2V0WCkgLyBjZWxsU2l6ZSkgKyAyO1xuICAgICAgICAgICAgICAgIHkgPSBNYXRoLmZsb29yKChwLnkgLSBvZmZzZXRZKSAvIGNlbGxTaXplKSArIDI7XG5cbiAgICAgICAgICAgICAgICBrID0gKGhlYXRbMl0gIT09IHVuZGVmaW5lZCA/ICtoZWF0WzJdIDogMC4xKSAqIGxheWVyLm9wdGlvbnNbJ2hlYXRWYWx1ZVNjYWxlJ107XG5cbiAgICAgICAgICAgICAgICBncmlkW3ldID0gZ3JpZFt5XSB8fCBbXTtcbiAgICAgICAgICAgICAgICBjZWxsID0gZ3JpZFt5XVt4XTtcblxuICAgICAgICAgICAgICAgIGlmICghY2VsbCkge1xuICAgICAgICAgICAgICAgICAgICBncmlkW3ldW3hdID0gW3AueCwgcC55LCBrXTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGxbMF0gPSAoY2VsbFswXSAqIGNlbGxbMl0gKyAocC54KSAqIGspIC8gKGNlbGxbMl0gKyBrKTsgLy8geFxuICAgICAgICAgICAgICAgICAgICBjZWxsWzFdID0gKGNlbGxbMV0gKiBjZWxsWzJdICsgKHAueSkgKiBrKSAvIChjZWxsWzJdICsgayk7IC8vIHlcbiAgICAgICAgICAgICAgICAgICAgY2VsbFsyXSArPSBrOyAvLyBjdW11bGF0ZWQgaW50ZW5zaXR5IHZhbHVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gZ3JpZC5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChncmlkW2ldKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDAsIGxsID0gZ3JpZFtpXS5sZW5ndGg7IGogPCBsbDsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGNlbGwgPSBncmlkW2ldW2pdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2VsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoKFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBNYXRoLnJvdW5kKGNlbGxbMF0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE1hdGgucm91bmQoY2VsbFsxXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgTWF0aC5taW4oY2VsbFsyXSwgbWF4KVxuICAgICAgICAgICAgICAgICAgICAgICAgXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuXG4gICAgb25ab29tRW5kKCkge1xuICAgICAgICBkZWxldGUgdGhpcy5faGVhdFZpZXdzO1xuICAgICAgICBzdXBlci5vblpvb21FbmQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBvblJlc2l6ZSgpIHtcbiAgICAgICAgc3VwZXIub25SZXNpemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKHRoaXMuY2FudmFzKSB7XG4gICAgICAgICAgICB0aGlzLl9oZWF0ZXIuX3dpZHRoICA9IHRoaXMuY2FudmFzLndpZHRoO1xuICAgICAgICAgICAgdGhpcy5faGVhdGVyLl9oZWlnaHQgPSB0aGlzLmNhbnZhcy5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBvblJlbW92ZSgpIHtcbiAgICAgICAgdGhpcy5jbGVhckhlYXRDYWNoZSgpO1xuICAgICAgICBkZWxldGUgdGhpcy5faGVhdGVyO1xuICAgIH1cblxuICAgIHVwZGF0ZURhdGEoKSB7XG4gICAgfVxuXG4gICAgcmVzZXREYXRhKCkge1xuICAgICAgICB0aGlzLmNsZWFySGVhdENhY2hlKCk7XG4gICAgfVxuXG4gICAgdXBkYXRlR3JhZGllbnQoKSB7XG4gICAgfVxuXG4gICAgY2xlYXJIZWF0Q2FjaGUoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9oZWF0Vmlld3M7XG4gICAgfVxufSk7XG5cbmlmICh0eXBlb2YgQ2FudmFzQ29tcGF0aWJsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBIZWF0TGF5ZXIucmVnaXN0ZXJSZW5kZXJlcignZ2wnLCBjbGFzcyBleHRlbmRzIENhbnZhc0NvbXBhdGlibGUobWFwdGFsa3MucmVuZGVyZXIuTGF5ZXJBYnN0cmFjdFJlbmRlcmVyKSB7XG4gICAgICAgIGRyYXdPbkludGVyYWN0aW5nKGV2ZW50LCB0aW1lc3RhbXAsIHBhcmVudENvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMuZHJhdyh0aW1lc3RhbXAsIHBhcmVudENvbnRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZHJhdyh0aW1lc3RhbXAsIHBhcmVudENvbnRleHQpIHtcbiAgICAgICAgICAgIHRoaXMucHJlcGFyZUNhbnZhcygpO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9yZW5kZXJlcikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGhlYXRzID0gdGhpcy5sYXllci5nZXREYXRhKCk7XG4gICAgICAgICAgICBpZiAoaGVhdHMubGVuZ3RoICE9PSB0aGlzLnBvaW50Q291bnQpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gdGhpcy5wb2ludENvdW50OyBpIDwgaGVhdHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRQb2ludCguLi5oZWF0c1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUdlb21ldHJ5RGF0YSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZmJvID0gcGFyZW50Q29udGV4dCAmJiBwYXJlbnRDb250ZXh0LnJlbmRlclRhcmdldCAmJiBjb250ZXh0LnJlbmRlclRhcmdldC5mYm87XG4gICAgICAgICAgICB0aGlzLl9jbGVhckZCTygpO1xuICAgICAgICAgICAgdGhpcy5fZ2VvbWV0cnkuc2V0RHJhd0NvdW50KHRoaXMucG9pbnRDb3VudCAqIDYpO1xuICAgICAgICAgICAgY29uc3QgbWFwID0gdGhpcy5nZXRNYXAoKTtcbiAgICAgICAgICAgIGNvbnN0IGdsUmVzID0gbWFwLmdldEdMUmVzKCk7XG4gICAgICAgICAgICBjb25zdCB1bmlmb3JtcyA9IHtcbiAgICAgICAgICAgICAgICB6b29tU2NhbGU6IG1hcC5nZXRSZXNvbHV0aW9uKCkgLyBnbFJlcyxcbiAgICAgICAgICAgICAgICBwcm9qVmlld01vZGVsTWF0cml4OiBtYXAucHJvalZpZXdNYXRyaXhcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aGlzLl9yZW5kZXJlci5yZW5kZXIodGhpcy5fcG9pbnRTaGFkZXIsIHVuaWZvcm1zLCB0aGlzLl9zY2VuZSwgdGhpcy5fZmJvKTtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcmVyLnJlbmRlcih0aGlzLl9ncmFkaWVudFNoYWRlciwgbnVsbCwgdGhpcy5fZ3JhZGllbnRTY2VuZSwgZmJvKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHVwZGF0ZURhdGEocG9pbnQpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkUG9pbnQocG9pbnRbMF0sIHBvaW50WzFdLCBwb2ludFsyXSk7XG4gICAgICAgIH1cblxuICAgICAgICBfY2xlYXJGQk8oKSB7XG4gICAgICAgICAgICB0aGlzLmRldmljZS5jbGVhcih7XG4gICAgICAgICAgICAgICAgY29sb3I6IFswLCAwLCAwLCAwXSxcbiAgICAgICAgICAgICAgICBkZXB0aDogMSxcbiAgICAgICAgICAgICAgICBmcmFtZWJ1ZmZlcjogdGhpcy5fZmJvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNsZWFySGVhdENhY2hlKCkge1xuXG4gICAgICAgIH1cblxuICAgICAgICByZXNldERhdGEoKSB7XG4gICAgICAgICAgICB0aGlzLl9yZXNldCgpO1xuICAgICAgICB9XG5cbiAgICAgICAgdXBkYXRlR3JhZGllbnQoKSB7XG4gICAgICAgICAgICB0aGlzLl9pbml0R3JhZGllbnQoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNsZWFyKCkge1xuICAgICAgICAgICAgdGhpcy5fcmVzZXQoKTtcbiAgICAgICAgICAgIHN1cGVyLmNsZWFyKCk7XG4gICAgICAgIH1cblxuICAgICAgICBfcmVzZXQoKSB7XG4gICAgICAgICAgICB0aGlzLnBvaW50Q291bnQgPSAwO1xuICAgICAgICAgICAgdGhpcy5idWZmZXJJbmRleCA9IDA7XG4gICAgICAgICAgICB0aGlzLm9mZnNldEluZGV4ID0gMDtcbiAgICAgICAgICAgIHRoaXMuaW50ZW5zaXR5SW5kZXggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgaW5pdENvbnRleHQoKSB7XG4gICAgICAgICAgICB0aGlzLl9pbml0RGF0YSgpO1xuICAgICAgICAgICAgdGhpcy5faW5pdE1lc2goKTtcbiAgICAgICAgICAgIHRoaXMuX2luaXRHcmFkaWVudCgpO1xuICAgICAgICAgICAgY29uc3Qgdmlld3BvcnQgPSB7XG4gICAgICAgICAgICAgICAgeCA6IDAsXG4gICAgICAgICAgICAgICAgeSA6IDAsXG4gICAgICAgICAgICAgICAgd2lkdGggOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbnZhcyA/IHRoaXMuY2FudmFzLndpZHRoIDogMTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhlaWdodCA6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FudmFzID8gdGhpcy5jYW52YXMuaGVpZ2h0IDogMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY29uc3QgZXh0cmFDb21tYW5kUHJvcHMgPSB7XG4gICAgICAgICAgICAgICAgYmxlbmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBmdW5jOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkc3Q6IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICBzcmM6IDFcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGVwdGg6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHZpZXdwb3J0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLl9wb2ludFNoYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcbiAgICAgICAgICAgICAgICB2ZXJ0LFxuICAgICAgICAgICAgICAgIGZyYWcsXG4gICAgICAgICAgICAgICAgZXh0cmFDb21tYW5kUHJvcHNcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB0aGlzLl9ncmFkaWVudFNoYWRlciA9IG5ldyByZXNoYWRlci5NZXNoU2hhZGVyKHtcbiAgICAgICAgICAgICAgICB2ZXJ0OiBncmFkaWVudFZlcnQsXG4gICAgICAgICAgICAgICAgZnJhZzogZ3JhZGllbnRGcmFnLFxuICAgICAgICAgICAgICAgIGV4dHJhQ29tbWFuZFByb3BzOiB7XG4gICAgICAgICAgICAgICAgICAgIGJsZW5kOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBkZXB0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmlld3BvcnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9pbml0RGF0YSgpIHtcbiAgICAgICAgICAgIHRoaXMuYnVmZmVySW5kZXggPSAwO1xuICAgICAgICAgICAgdGhpcy5vZmZzZXRJbmRleCA9IDA7XG4gICAgICAgICAgICB0aGlzLmludGVuc2l0eUluZGV4ID0gMDtcbiAgICAgICAgICAgIHRoaXMucG9pbnRDb3VudCA9IDA7XG4gICAgICAgICAgICB0aGlzLm1heFBvaW50Q291bnQgPSAxMDI0ICogMTA7XG5cbiAgICAgICAgICAgIGNvbnN0IHsgcG9zaXRpb25CdWZmZXJEYXRhLCBvZmZzZXRCdWZmZXJEYXRhLCBpbnRlbnNpdHlCdWZmZXJEYXRhIH0gPSB0aGlzLl9pbml0QnVmZmVycygpO1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJ1ZmZlckRhdGEgPSBwb3NpdGlvbkJ1ZmZlckRhdGE7XG4gICAgICAgICAgICB0aGlzLm9mZnNldEJ1ZmZlckRhdGEgPSBvZmZzZXRCdWZmZXJEYXRhO1xuICAgICAgICAgICAgdGhpcy5pbnRlbnNpdHlCdWZmZXJEYXRhID0gaW50ZW5zaXR5QnVmZmVyRGF0YTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9pbml0QnVmZmVycygpIHtcbiAgICAgICAgICAgIGNvbnN0IHZlcnRleFNpemUgPSAyO1xuICAgICAgICAgICAgY29uc3Qgb2Zmc2V0U2l6ZSA9IDI7XG4gICAgICAgICAgICBjb25zdCBpbnRlbnNpdHlTaXplID0gMTtcbiAgICAgICAgICAgIGNvbnN0IHBvc2l0aW9uQnVmZmVyRGF0YSA9IG5ldyBGbG9hdDMyQXJyYXkoXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhQb2ludENvdW50ICogdmVydGV4U2l6ZSAqIDZcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBvZmZzZXRCdWZmZXJEYXRhID0gbmV3IEludDE2QXJyYXkoXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhQb2ludENvdW50ICogb2Zmc2V0U2l6ZSAqIDZcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBjb25zdCBpbnRlbnNpdHlCdWZmZXJEYXRhID0gbmV3IFVpbnQ4QXJyYXkoXG4gICAgICAgICAgICAgICAgdGhpcy5tYXhQb2ludENvdW50ICogaW50ZW5zaXR5U2l6ZSAqIDZcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICByZXR1cm4geyBwb3NpdGlvbkJ1ZmZlckRhdGEsIG9mZnNldEJ1ZmZlckRhdGEsIGludGVuc2l0eUJ1ZmZlckRhdGEgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIF9pbml0TWVzaCgpIHtcbiAgICAgICAgICAgIHRoaXMuX3JlbmRlcmVyID0gbmV3IHJlc2hhZGVyLlJlbmRlcmVyKHRoaXMuZGV2aWNlKTtcbiAgICAgICAgICAgIHRoaXMuX2dlb21ldHJ5ID0gbmV3IHJlc2hhZGVyLkdlb21ldHJ5KFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgYVBvc2l0aW9uOiB0aGlzLnBvc2l0aW9uQnVmZmVyRGF0YSxcbiAgICAgICAgICAgICAgICAgICAgYU9mZnNldDogdGhpcy5vZmZzZXRCdWZmZXJEYXRhLFxuICAgICAgICAgICAgICAgICAgICBhSW50ZW5zaXR5OiB0aGlzLmludGVuc2l0eUJ1ZmZlckRhdGFcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgdGhpcy5wb2ludENvdW50ICogNixcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uU2l6ZTogMlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLl9nZW9tZXRyeS5nZW5lcmF0ZUJ1ZmZlcnModGhpcy5kZXZpY2UpO1xuICAgICAgICAgICAgdGhpcy5fbWVzaCA9IG5ldyByZXNoYWRlci5NZXNoKHRoaXMuX2dlb21ldHJ5KTtcbiAgICAgICAgICAgIHRoaXMuX3NjZW5lID0gbmV3IHJlc2hhZGVyLlNjZW5lKFt0aGlzLl9tZXNoXSk7XG4gICAgICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhcztcbiAgICAgICAgICAgIGNvbnN0IGNvbG9yID0gdGhpcy5kZXZpY2UudGV4dHVyZSh7XG4gICAgICAgICAgICAgICAgdHlwZTogJ2Zsb2F0MTYnLFxuICAgICAgICAgICAgICAgIG1pbjogJ25lYXJlc3QnLFxuICAgICAgICAgICAgICAgIG1hZzogJ25lYXJlc3QnLFxuICAgICAgICAgICAgICAgIHdpZHRoOiBjYW52YXMud2lkdGgsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBjYW52YXMuaGVpZ2h0LFxuICAgICAgICAgICAgICAgIC8vIG5lZWRlZCBieSB3ZWJncHVcbiAgICAgICAgICAgICAgICBzYW1wbGVDb3VudDogNFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLl9mYm8gPSB0aGlzLmRldmljZS5mcmFtZWJ1ZmZlcih7XG4gICAgICAgICAgICAgICAgd2lkdGg6IGNhbnZhcy53aWR0aCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGNhbnZhcy5oZWlnaHQsXG4gICAgICAgICAgICAgICAgY29sb3JzOiBbY29sb3JdLFxuICAgICAgICAgICAgICAgIGNvbG9yRm9ybWF0OiAncmdiYScsXG4gICAgICAgICAgICAgICAgZGVwdGhTdGVuY2lsOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHF1YWQgPSBuZXcgSW50OEFycmF5KFtcbiAgICAgICAgICAgICAgICAtMSwgLTEsIDAsIDEsIDEsIC0xLCAwLCAxLCAtMSwgMSwgMCwgMSwgLTEsIDEsIDAsIDEsIDEsIC0xLCAwLCAxLCAxLCAxLCAwLCAxXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50R2VvbWV0cnkgPSBuZXcgcmVzaGFkZXIuR2VvbWV0cnkoXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBhUG9zaXRpb246IHF1YWRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAgMCxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uU2l6ZTogNFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB0aGlzLl9ncmFkaWVudEdlb21ldHJ5LmdlbmVyYXRlQnVmZmVycyh0aGlzLmRldmljZSk7XG4gICAgICAgICAgICB0aGlzLl9ncmFkaWVudE1lc2ggPSBuZXcgcmVzaGFkZXIuTWVzaCh0aGlzLl9ncmFkaWVudEdlb21ldHJ5KTtcbiAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50U2NlbmUgPSBuZXcgcmVzaGFkZXIuU2NlbmUoW3RoaXMuX2dyYWRpZW50TWVzaF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgX2luaXRHcmFkaWVudCgpIHtcbiAgICAgICAgICAgIGNvbnN0IGdyYWRpZW50RGF0YSA9IGdyYWRpZW50KHRoaXMubGF5ZXIub3B0aW9uc1snZ3JhZGllbnQnXSk7XG4gICAgICAgICAgICBpZiAodGhpcy5fZ3JhZGllbnRUZXh0dXJlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX2dyYWRpZW50VGV4dHVyZS51cGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZ3JhZGllbnRUZXh0dXJlLnVwZGF0ZShncmFkaWVudERhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50VGV4dHVyZShncmFkaWVudERhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fZ3JhZGllbnRUZXh0dXJlID0gdGhpcy5kZXZpY2UudGV4dHVyZShncmFkaWVudERhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fZ3JhZGllbnRNZXNoLnNldFVuaWZvcm0oJ3NvdXJjZScsIHRoaXMuX2Zibyk7XG4gICAgICAgIH1cblxuICAgICAgICBhZGRWZXJ0ZXgoeCwgeSwgeHMsIHlzLCBpbnRlbnNpdHkpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hcCA9IHRoaXMuZ2V0TWFwKCk7XG4gICAgICAgICAgICBjb25zdCBnbFJlcyA9IG1hcC5nZXRHTFJlcygpO1xuICAgICAgICAgICAgQ09PUkQuc2V0KHgsIHkpO1xuICAgICAgICAgICAgY29uc3QgcG9pbnQgPSBtYXAuY29vcmRUb1BvaW50QXRSZXMoQ09PUkQsIGdsUmVzLCBQT0lOVCk7XG4gICAgICAgICAgICB4ID0gcG9pbnQueDtcbiAgICAgICAgICAgIHkgPSBwb2ludC55O1xuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJ1ZmZlckRhdGFbdGhpcy5idWZmZXJJbmRleCsrXSA9IHg7XG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uQnVmZmVyRGF0YVt0aGlzLmJ1ZmZlckluZGV4KytdID0geTtcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0QnVmZmVyRGF0YVt0aGlzLm9mZnNldEluZGV4KytdID0geHM7XG4gICAgICAgICAgICB0aGlzLm9mZnNldEJ1ZmZlckRhdGFbdGhpcy5vZmZzZXRJbmRleCsrXSA9IHlzO1xuICAgICAgICAgICAgdGhpcy5pbnRlbnNpdHlCdWZmZXJEYXRhW3RoaXMuaW50ZW5zaXR5SW5kZXgrK10gPSBpbnRlbnNpdHkgKiAyNTU7XG4gICAgICAgIH1cblxuICAgICAgICBhZGRQb2ludCh4LCB5LCBpbnRlbnNpdHkpIHtcbiAgICAgICAgICAgIGNvbnN0IHNpemUgPSB0aGlzLmxheWVyLm9wdGlvbnNbJ3JhZGl1cyddIHx8IDI1O1xuICAgICAgICAgICAgaWYgKGludGVuc2l0eSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaW50ZW5zaXR5ID0gMC4yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbWF4ID0gdGhpcy5sYXllci5vcHRpb25zWydtYXgnXSB8fCAxO1xuICAgICAgICAgICAgaW50ZW5zaXR5IC89IG1heDtcbiAgICAgICAgICAgIHRoaXMuX2NoZWNrKCk7XG4gICAgICAgICAgICBjb25zdCBzID0gc2l6ZTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksIC1zLCAtcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksICtzLCAtcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksIC1zLCArcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksIC1zLCArcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksICtzLCAtcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkVmVydGV4KHgsIHksICtzLCArcywgaW50ZW5zaXR5KTtcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb2ludENvdW50ICs9IDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgX2NoZWNrKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMucG9pbnRDb3VudCA+PSB0aGlzLm1heFBvaW50Q291bnQgLSAxKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXhQb2ludENvdW50ICs9IDEwMjQgKiAxMDtcbiAgICAgICAgICAgICAgICBjb25zdCB7IHBvc2l0aW9uQnVmZmVyRGF0YSwgb2Zmc2V0QnVmZmVyRGF0YSwgaW50ZW5zaXR5QnVmZmVyRGF0YSB9ID0gdGhpcy5faW5pdEJ1ZmZlcnMoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVmZmVySW5kZXg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbkJ1ZmZlckRhdGFbaV0gPSB0aGlzLnBvc2l0aW9uQnVmZmVyRGF0YVtpXTtcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0QnVmZmVyRGF0YVtpXSA9IHRoaXMub2Zmc2V0QnVmZmVyRGF0YVtpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmludGVuc2l0eUluZGV4OyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaW50ZW5zaXR5QnVmZmVyRGF0YVtpXSA9IHRoaXMuaW50ZW5zaXR5QnVmZmVyRGF0YVtpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5wb3NpdGlvbkJ1ZmZlckRhdGEgPSBwb3NpdGlvbkJ1ZmZlckRhdGE7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmZzZXRCdWZmZXJEYXRhID0gb2Zmc2V0QnVmZmVyRGF0YTtcbiAgICAgICAgICAgICAgICB0aGlzLmludGVuc2l0eUJ1ZmZlckRhdGEgPSBpbnRlbnNpdHlCdWZmZXJEYXRhO1xuICAgICAgICAgICAgICAgIHRoaXMuX3VwZGF0ZUdlb21ldHJ5RGF0YSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgX3VwZGF0ZUdlb21ldHJ5RGF0YSgpIHtcbiAgICAgICAgICAgIHRoaXMuX2dlb21ldHJ5LnVwZGF0ZURhdGEoJ2FQb3NpdGlvbicsIHRoaXMucG9zaXRpb25CdWZmZXJEYXRhKTtcbiAgICAgICAgICAgIHRoaXMuX2dlb21ldHJ5LnVwZGF0ZURhdGEoJ2FPZmZzZXQnLCB0aGlzLm9mZnNldEJ1ZmZlckRhdGEpO1xuICAgICAgICAgICAgdGhpcy5fZ2VvbWV0cnkudXBkYXRlRGF0YSgnYUludGVuc2l0eScsIHRoaXMuaW50ZW5zaXR5QnVmZmVyRGF0YSk7XG4gICAgICAgIH1cblxuICAgICAgICBvblJlc2l6ZShwYXJhbXMpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9mYm8gJiYgdGhpcy5jYW52YXMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYW52YXMgPSB0aGlzLmNhbnZhcztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fZmJvLndpZHRoICE9PSBjYW52YXMud2lkdGggfHwgdGhpcy5fZmJvLmhlaWdodCAhPT0gY2FudmFzLmhlaWdodCkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLl9mYm8ucmVzaXplKGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3VwZXIub25SZXNpemUocGFyYW1zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG9uUmVtb3ZlKCkge1xuICAgICAgICAgICAgdGhpcy5fcmVzZXQoKTtcbiAgICAgICAgICAgIGlmICh0aGlzLl9wb2ludFNoYWRlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuX3BvaW50U2hhZGVyLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdGhpcy5fcG9pbnRTaGFkZXI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5fZ3JhZGllbnRTaGFkZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9ncmFkaWVudFNoYWRlci5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2dyYWRpZW50U2hhZGVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2dyYWRpZW50VGV4dHVyZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50VGV4dHVyZS5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2dyYWRpZW50VGV4dHVyZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9tZXNoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWVzaC5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX21lc2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5fZ2VvbWV0cnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9nZW9tZXRyeS5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2dlb21ldHJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMuX2Zibykge1xuICAgICAgICAgICAgICAgIHRoaXMuX2Ziby5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXMuX2ZibztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0aGlzLl9ncmFkaWVudE1lc2gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9ncmFkaWVudE1lc2guZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ncmFkaWVudE1lc2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5fZ3JhZGllbnRHZW9tZXRyeSkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2dyYWRpZW50R2VvbWV0cnkuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLl9ncmFkaWVudEdlb21ldHJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMucG9zaXRpb25CdWZmZXJEYXRhO1xuICAgICAgICAgICAgZGVsZXRlIHRoaXMub2Zmc2V0QnVmZmVyRGF0YTtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmludGVuc2l0eUJ1ZmZlckRhdGE7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fcmVuZGVyZXI7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fc2NlbmU7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fZ3JhZGllbnRTY2VuZTtcbiAgICAgICAgICAgIHN1cGVyLm9uUmVtb3ZlKCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ3JhZGllbnQoZ3JhZCkge1xuICAgIC8vIGNyZWF0ZSBhIDI1NngxIGdyYWRpZW50IHRoYXQgd2UnbGwgdXNlIHRvIHR1cm4gYSBncmF5c2NhbGUgaGVhdG1hcCBpbnRvIGEgY29sb3JlZCBvbmVcbiAgICBjb25zdCBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKSxcbiAgICAgICAgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJywge3dpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZX0pLFxuICAgICAgICBncmFkaWVudCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCAwLCAwLCAyNTYpO1xuXG4gICAgY2FudmFzLndpZHRoID0gMjU2O1xuICAgIGNhbnZhcy5oZWlnaHQgPSAxO1xuXG4gICAgZm9yIChjb25zdCBpIGluIGdyYWQpIHtcbiAgICAgICAgZ3JhZGllbnQuYWRkQ29sb3JTdG9wKCtpLCBncmFkW2ldKTtcbiAgICB9XG5cbiAgICBjdHguZmlsbFN0eWxlID0gZ3JhZGllbnQ7XG4gICAgY3R4LmZpbGxSZWN0KDAsIDAsIDEsIDI1Nik7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBkYXRhOiBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIDEsIDI1NikuZGF0YSxcbiAgICAgICAgd2lkdGg6IGNhbnZhcy53aWR0aCxcbiAgICAgICAgaGVpZ2h0OiBjYW52YXMuaGVpZ2h0XG4gICAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUNBO0FBQ21DLE1BQUEsQ0FBQSxPQUFBLEdBQWlCLFVBQVUsQ0FBQztBQUMvRDtBQUNBLFNBQVMsVUFBVSxDQUFDLE1BQU0sRUFBRTtBQUM1QixJQUFJLElBQUksRUFBRSxJQUFJLFlBQVksVUFBVSxDQUFDLEVBQUUsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNyRTtBQUNBLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxNQUFNLEdBQUcsT0FBTyxNQUFNLEtBQUssUUFBUSxH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T0FBTyxJQUFJLENBQUM7QUFDcEIsS0FBSztBQUNMO0FBQ0EsSUFBSSxJQUFJLEVBQUUsVUFBVSxVQUFVLEVBQUU7QUFDaEMsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUMzRCxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzdEO0FBQ0EsUUFBUSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQzVCO0FBQ0EsUUFBUSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkQ7QUFDQTtBQUNBLFFBQVEsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ2xFLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsWUFBWSxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxLQUFLLFNBQVMsR0FBRyxJQUFJLEdBQUcsVUFBVSxDQUFDLENBQUM7QUFDdkcsWUFBWSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN4RSxTQUFTO0FBQ1Q7QUFDQTtBQUNBLFFBQVEs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
