# maptalks.heatmap

[![CircleCI](https://circleci.com/gh/maptalks/maptalks.heatmap.svg?style=shield)](https://circleci.com/gh/maptalks/maptalks.heatmap)

A plugin of [maptalks.js](https://github.com/maptalks/maptalks.js) to draw heatmap on maps, based on mourner's [simpleheat](https://github.com/mourner/simpleheat).

## Install

* Install with npm: ```npm install maptalks.heatmap```. 
* Download from [dist directory](https://github.com/maptalks/maptalks.heatmap/tree/gh-pages/dist).
* Use unpkg CDN: ```https://unpkg.com/maptalks.heatmap/dist/maptalks.heatmap.min.js```

## Supported Browsers

IE 9-11, Chrome, Firefox, other modern and mobile browsers.

## API Reference

```new maptalks.HeatmapLayer(id, data, options)```

* ```id``` **String** layer id
* ```data``` **Array[]** layer data ```[[x, y, value], [x, y, value]..]```
* ```options``` **Object** options
    * ```max``` **Number** max data value (1 by default) 
    * ```radius``` **Number** point radius(25 by default)
    * ```blur``` **Number**  blur radius(15 by default)
    * ```minOpacity``` **Number** minimum point opacity (0.05 by default)
    * ```gradient``` **Object** set gradient colors as {\<stop\>: '\<color\>'}, default by { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }

```config(key, value)``` > **this** config layer's options and redraw the layer if necessary
```javascript
heatLayer.config('max', 10);
heatLayer.config({
    'radius' : 80,
    'blur' : 30,
    'grdient' : {0.4: 'blue', 0.65: 'lime', 1: 'red'}
});
```

```getData``` > **Array[]** get layer's data

```setData(data)``` > **this** set new data
* ```data``` **Array[]** data to set

```addPoint(point)``` > **this** add more points
* ```point``` **Array[]** points to add, [[x, y, value], [x, y, value]..]

```redraw()``` > **this**

```isEmpty()``` > **Boolean**

```clear()``` > **this**

```toJSON(options)``` > **Object** export the layer's JSON.
* ```options``` **Object** options
    * ```clipExtent``` **maptalks.Extent** the extent to clip
```javascript
// only export points in map's current extent.
heatLayer.toJSON({
    'clipExtent' : map.getExtent()
});
```
