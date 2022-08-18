const pkg = require('./package.json');

module.exports = function (config) {
    config.set({
        browserDisconnectTimeout: 100000,
        browserNoActivityTimeout: 100000,
        browserDisconnectTolerance: 12,
        frameworks: ['mocha', 'expect', 'expect-maptalks'],
        basePath: '.',
        client: {
            mocha: {
                timeout : 36000
            }
        },
        files: [
            'node_modules/maptalks/dist/maptalks.js',
            pkg.main,
            'test/test.js'
        ],
        proxies: {
        },
        preprocessors: {
        },
        browsers: ['Chrome'],
        reporters: ['mocha']
    });
};
