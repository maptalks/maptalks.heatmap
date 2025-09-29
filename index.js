import * as maptalks from 'maptalks';
import simpleheat from 'simpleheat';
import { reshader, CanvasCompatible } from '@maptalks/gl';
import vert from './glsl/points.vert';
import frag from './glsl/points.frag';
import gradientVert from './glsl/gradient.vert';
import gradientFrag from './glsl/gradient.frag';

const options = {
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
    'heatValueScale': 1,
    'minOpacity': 0.05,
    'hitDetect': false
};

const COORD = new maptalks.Coordinate(0, 0);
const POINT = new maptalks.Point(0, 0);

export class HeatLayer extends maptalks.Layer {

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
            'type': this.getJSONType(),
            'id': this.getId(),
            'options': this.config()
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
        //fix https://github.com/maptalks/maptalks.heatmap/issues/55
        if (this._heater) {
            const width = this._heater._width, height = this._heater._height;
            if (Math.min(width, height) <= 0) {
                this.completeRender();
                return;
            }
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
            offsetX = Math.abs(panePos.x) % cellSize,
            offsetY = Math.abs(panePos.y) % cellSize;
        let heat, p, cell, x, y, k;
        // displayExtent = displayExtent.expand(r).convertTo(c => new maptalks.Point(map._containerPointToPrj(c)));
        const { xmin, ymin, xmax, ymax } = displayExtent.expand(r);
        this._heatRadius = r;
        const coord = new maptalks.Coordinate(0, 0);
        for (let i = 0, l = heats.length; i < l; i++) {
            heat = heats[i];
            if (!this._heatViews[i]) {
                this._heatViews[i] = projection.project(coord.set(heat[0], heat[1]));
            }
            p = this._heatViews[i];
            //fix https://github.com/maptalks/maptalks.heatmap/issues/54
            // if (displayExtent.contains(p)) {
            p = map._prjToContainerPoint(p);
            if (p.x < xmin || p.x > xmax || p.y < ymin || p.y > ymax) {
                continue;
            }
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
            // }
        }
        for (let i = 0, l = grid.length; i < l; i++) {
            if (grid[i] && grid[i].length) {
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
            this._heater._width = this.canvas.width;
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
            }
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
