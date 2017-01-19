describe('Layer', function () {
    var container, map;
    beforeEach(function () {
        container = document.createElement('div');
        container.style.width = '400px';
        container.style.height = '300px';
        document.body.appendChild(container);
        map = new maptalks.Map(container, {
            center : [0, 0],
            zoom : 17
        });
    });

    afterEach(function () {
        map.remove();
        maptalks.DomUtil.removeDomNode(container);
    });

    //heat data to test
    var data = [
        //x, y, heat
        [0, 0, 1],
        [0, 0, 2],
        [0, 0, 3]
    ];

    it('should display when added to map', function (done) {
        var layer = new maptalks.HeatLayer('g', data);
        layer.on('layerload', function () {
            expect(layer).to.be.painted();
            done();
        })
        .addTo(map);
    });

    it('should display if added again after removed', function (done) {
        var layer = new maptalks.HeatLayer('g', data);
        layer.once('layerload', function () {
            expect(layer).to.be.painted();
            map.removeLayer(layer);
            layer.once('layerload', function () {
                expect(layer).to.be.painted();
                done();
            });
            map.addLayer(layer);
        });
        map.addLayer(layer);
    });

    it('should display after zooming', function (done) {
        var layer = new maptalks.HeatLayer('g', data);
        layer.once('layerload', function () {
            map.on('zoomend', function () {
                expect(layer).to.be.painted();
                done();
            });
            map.zoomIn();
        });
        map.addLayer(layer);
    });


    it('should show', function (done) {
        var layer = new maptalks.HeatLayer('g', data, { visible : false });
        layer.once('layerload', function () {
            expect(layer).not.to.be.painted();
            layer.once('layerload', function () {
                expect(layer).to.be.painted();
                done();
            });
            layer.show();
        });
        map.addLayer(layer);
    });

    it('should hide', function (done) {
        var layer = new maptalks.HeatLayer('g', data);
        layer.once('layerload', function () {
            expect(layer).to.be.painted();
            layer.once('hide', function () {
                expect(layer).not.to.be.painted();
                done();
            });
            layer.hide();
        });
        map.addLayer(layer);
    });

    it('should serialized with JSON', function (done) {
        var layer = new maptalks.HeatLayer('g', data);
        var json = layer.toJSON();
        var copy = maptalks.Layer.fromJSON(json);
        copy.on('layerload', function () {
            expect(copy).to.be.painted();
            done();
        })
        .addTo(map);
    });

    it('should can add point', function (done) {
        var layer = new maptalks.HeatLayer('g');
        layer.once('layerload', function () {
            expect(layer).not.to.be.painted();
            layer.once('layerload', function () {
                expect(layer).to.be.painted();
                done();
            });
            layer.addPoint([0, 0, 1]);
        })
        .addTo(map);
    });

    it('should can set data', function (done) {
        var layer = new maptalks.HeatLayer('g');
        layer.once('layerload', function () {
            expect(layer).not.to.be.painted();
            layer.once('layerload', function () {
                expect(layer).to.be.painted();
                done();
            });
            layer.setData([[0, 0, 1]]);
        })
        .addTo(map);
    });
});
