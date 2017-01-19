module.exports = {
    basePath : '.',
    frameworks: ['mocha', 'expect', 'expect-maptalks', 'happen'],
    files: [
        'node_modules/maptalks/dist/maptalks.js',
        'dist/maptalks.heatlayer.js',
        'test/**/*.js'
    ],
    preprocessors: {
    },
    browsers: ['Chrome'],
    reporters: ['mocha'],
    customLaunchers: {
        IE10: {
            base: 'IE',
            'x-ua-compatible': 'IE=EmulateIE10'
        },
        IE9: {
            base: 'IE',
            'x-ua-compatible': 'IE=EmulateIE9'
        }
    },
    singleRun : true
};
