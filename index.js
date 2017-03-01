import * as maptalks from 'maptalks';
import simpleheat from 'simpleheat';

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
        this._heats = heats;
        return this.redraw();
    }

    addPoint(heat) {
        this._heats.push(heat);
        return this.redraw();
    }

    getMax() {
        return this.options['max'];
    }

    setMax(max) {
        this.options['max'] = max;
        return this.redraw();
    }

    redraw() {
        const renderer = this._getRenderer();
        if (renderer) {
            renderer.clearHeatCache();
            renderer.render();
        }
        return this;
    }

    isEmpty() {
        if (!this._heats || !this._heats.length) {
            return true;
        }
        return false;
    }

    clear() {
        delete this._heats;
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
            let r = this._getHeatRadius();
            if (r) {
                clipExtent = clipExtent._expand(r);
            }
            let clipped = [];
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


HeatLayer.registerJSONType('HeatLayer');

HeatLayer.registerRenderer('canvas', class extends maptalks.renderer.CanvasRenderer {

    draw() {
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
        var leftTop = map._pointToContainerPoint(extent2d.getMin());

        if (!this._heater) {
            this._heater = simpleheat(this.canvas);
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
            i, len, heat, p, alt, cell, x, y, j, len2, k;
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

                alt =
                    heat.alt !== undefined ? heat.alt :
                    heat[2] !== undefined ? +heat[2] : 1;
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
                        data.push([
                            Math.round(cell[0]),
                            Math.round(cell[1]),
                            Math.min(cell[2], max)
                        ]);
                    }
                }
            }
        }
        this._heater.data(data).draw(layer.options['minOpacity']);
        this.completeRender();
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
