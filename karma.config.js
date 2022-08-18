const pkg = require('./package.json');

module.exports = function (config) {
    config.set({
        basePath : '.',
        client: {
            mocha: {
                timeout : 36000
            }
        },
        frameworks: ['mocha', 'expect', 'expect-maptalks', 'happen'],
        files: [
            'node_modules/maptalks/dist/maptalks.js',
            pkg.main,
            'test/**/*.js'
        ],
        preprocessors: {
        },
        browsers: ['Chrome'],
        reporters: ['mocha'],
        singleRun : true
    })
};
