import * as maptalks from 'maptalks';
import simpleheat from 'simpleheat';

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
    'minOpacity' : 0.05
};

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
        return this.redraw();
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
        return this.redraw();
    }

    onConfig(conf) {
        super.onConfig.apply(this, arguments);
        for (const p in conf) {
            if (options[p]) {
                return this.redraw();
            }
        }
        return this;
    }

    redraw() {
        const renderer = this._getRenderer();
        if (renderer) {
            renderer.clearHeatCache();
            renderer.setToRedraw();
        }
        return this;
    }

    isEmpty() {
        if (!this._heats.length) {
            return true;
        }
        return false;
    }

    clear() {
        this._heats = [];
        this.redraw();
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
            maxZoom = maptalks.Util.isNil(layer.options['maxZoom']) ? map.getMaxZoom() : layer.options['maxZoom'],
            v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - map.getZoom(), 12))),
            cellSize = r / 2,
            grid = [],
            panePos = map.offsetPlatform(),
            offsetX = panePos.x % cellSize,
            offsetY = panePos.y % cellSize;
        let heat, p, alt, cell, x, y, k;
        displayExtent = displayExtent.expand(r).convertTo(c => new maptalks.Point(map._containerPointToPrj(c)));
        this._heatRadius = r;
        for (let i = 0, l = heats.length; i < l; i++) {
            heat = heats[i];
            if (!this._heatViews[i]) {
                this._heatViews[i] = projection.project(new maptalks.Coordinate(heat[0], heat[1]));
            }
            p = this._heatViews[i];
            if (displayExtent.contains(p)) {
                p = map._prjToContainerPoint(p);
                x = Math.floor((p.x - offsetX) / cellSize) + 2;
                y = Math.floor((p.y - offsetY) / cellSize) + 2;

                alt =
                    heat.alt !== undefined ? heat.alt :
                    heat[2] !== undefined ? +heat[2] : 1;
                k = alt * v;

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
        this._heater._width  = this.canvas.width;
        this._heater._height = this.canvas.height;
        super.onResize.apply(this, arguments);
    }

    onRemove() {
        this.clearHeatCache();
        delete this._heater;
    }

    clearHeatCache() {
        delete this._heatViews;
    }
});
