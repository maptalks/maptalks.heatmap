# maptalks.heatmap

[![CircleCI](https://circleci.com/gh/maptalks/maptalks.heatmap.svg?style=shield)](https://circleci.com/gh/maptalks/maptalks.heatmap)

A plugin of [maptalks.js](https://github.com/maptalks/maptalks.js) to draw heatmap on maps, based on mourner's [simpleheat](https://github.com/mourner/simpleheat).

![screenshot](https://cloud.githubusercontent.com/assets/13678919/25303099/98ad71fa-277e-11e7-8722-a3435d11e1f5.jpg)

## Install

* Install with npm: ```npm install maptalks.heatmap```. 
* Download from [dist directory](https://github.com/maptalks/maptalks.heatmap/tree/gh-pages/dist).
* Use unpkg CDN: ```https://unpkg.com/maptalks.heatmap/dist/maptalks.heatmap.min.js```

## Usage

As a plugin, ```maptalks.heatmap``` must be loaded after ```maptalks.js``` in browsers.
```html
<script type="text/javascript" src="https://unpkg.com/maptalks/dist/maptalks.min.js"></script>
<script type="text/javascript" src="https://unpkg.com/maptalks.heatmap/dist/maptalks.heatmap.min.js"></script>
<script>
var data = [[0, 0, 0.3], [0, 0, 0.4], [0, 0, 0.4]];
var heatLayer = new maptalks.HeatLayer('heat', data).addTo(map);
</script>
```

## Supported Browsers

IE 9-11, Chrome, Firefox, other modern and mobile browsers.

## Examples

* A heatmap of [50000 points](https://maptalks.github.io/maptalks.heatmap/demo/). (data from [Leaflet.Heat](https://github.com/Leaflet/Leaflet.heat))

## API Reference

### *`Constructor`*

```javascript
new maptalks.HeatmapLayer(id, data, options)
```

* id **String** layer id
* data **Array[]** layer data: [[x, y, value], [x, y, value]..]
* options **Object** options
    * max **Number** max data value (1 by default) 
    * radius **Number** point radius(25 by default)
    * blur **Number**  blur radius(15 by default)
    * minOpacity **Number** minimum point opacity (0.05 by default)
    * gradient **Object** set gradient colors as {\<stop\>: '\<color\>'}, default by { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }

### *`config(key, value)`*

config layer's options and redraw the layer if necessary

```javascript
heatLayer.config('max', 10);
heatLayer.config({
    'radius' : 80,
    'blur' : 30,
    'grdient' : {0.4: 'blue', 0.65: 'lime', 1: 'red'}
});
```

**Returns** `this`

### *`getData`*

get layer's data

**Returns** `Array[]`

### *`setData(data)`*

set new data

* data **Array[]** data to set

**Returns** `this`

### *`addPoint(point)`*

add more points

* point **Array[]** points to add, [[x, y, value], [x, y, value]..]

**Returns** `this`

### *`redraw()`*

**Returns** `this`

### *`isEmpty()`*

**Returns** `Boolean`

### *`clear()`*

**Returns** `this`

### *`toJSON(options)`*

export the layer's JSON.

* options **Object** options
    * clipExtent **maptalks.Extent** the extent to clip
```javascript
// only export points in map's current extent.
heatLayer.toJSON({
    'clipExtent' : map.getExtent()
});
```

**Returns** `Object`