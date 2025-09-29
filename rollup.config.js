const { nodeResolve: resolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('rollup-plugin-terser').terser;
const pkg = require('./package.json');


function glsl() {
    return {
        transform(code, id) {
            if (/\.vert$/.test(id) === false && /\.frag$/.test(id) === false && /\.glsl$/.test(id) === false) return null;
            let transformedCode = JSON.stringify(code.trim()
                .replace(/\r/g, '')
                .replace(/[ \t]*\/\/.*\n/g, '') // remove //
                .replace(/[ \t]*\/\*[\s\S]*?\*\//g, '') // remove /* */
                .replace(/\n{2,}/g, '\n')); // # \n+ to \n;;
            transformedCode = `export default ${transformedCode};`;
            return {
                code: transformedCode,
                map: { mappings: '' }
            };
        }
    };
}


const production = process.env.BUILD === 'production';
const outputFile = production ? 'dist/maptalks.heatmap.js' : 'dist/maptalks.heatmap.js';
const outputESFile = 'dist/maptalks.heatmap.es.js'
const plugins = [
    ].concat(production ? [
    removeGlobal(),
    terser({
        output : {
            keep_quoted_props: true,
            beautify: false,
            comments : '/^!/'
        }
    })
] : []);

//worker.js中的global可能被webpack替换为全局变量，造成worker代码执行失败，所以这里统一把typeof global替换为typeof undefined
function removeGlobal() {
    return {
        transform(code, id) {
            if (id.indexOf('worker.js') === -1) return null;
            const commonjsCode = /typeof global/g;
            const transformedCode = code.replace(commonjsCode, 'typeof undefined');
            return {
                code: transformedCode,
                map: { mappings: '' }
            };
        }
    };
}

const banner = `/*!\n * ${pkg.name} v${pkg.version}\n * LICENSE : ${pkg.license}\n * (c) 2016-${new Date().getFullYear()} maptalks.org\n */`;

let outro = pkg.name + ' v' + pkg.version;
if (pkg.peerDependencies && pkg.peerDependencies['maptalks']) {
    outro += `, requires maptalks@${pkg.peerDependencies.maptalks}.`;
}

outro = `typeof console !== 'undefined' && console.log('${outro}');`;

module.exports = [
    {
        input: 'index.js',
        plugins: [
            glsl(),
            resolve({
                browser: true,
                preferBuiltins: false
            }),
            commonjs({
                // global keyword handling causes Webpack compatibility issues, so we disabled it:
                // https://github.com/mapbox/mapbox-gl-js/pull/6956
                ignoreGlobal: true
            })
        ].concat(plugins),
        external: ['maptalks', '@maptalks/gl'],
        output: {
            globals: {
                'maptalks': 'maptalks',
                '@maptalks/gl': 'maptalks'
            },
            banner,
            outro,
            extend: true,
            name: 'maptalks',
            file: outputFile,
            format: 'umd',
            sourcemap: production ? false : 'inline',
        },
        watch: {
            include: ['index.js', '**/*/*.vert', '**/*/*.frag', '**/*/*.wgsl']
        }
    },
    {
        input: 'index.js',
        plugins: [
            glsl(),
            resolve({
                browser: true,
                preferBuiltins: false
            }),
            commonjs({
                // global keyword handling causes Webpack compatibility issues, so we disabled it:
                // https://github.com/mapbox/mapbox-gl-js/pull/6956
                ignoreGlobal: true
            })
        ].concat(plugins),
        external: ['maptalks', '@maptalks/gl'],
        output: {
            globals: {
                'maptalks': 'maptalks',
                '@maptalks/gl': 'maptalks'
            },
            banner,
            outro,
            extend: true,
            name: 'maptalks',
            file: outputESFile,
            format: 'es',
            sourcemap: production ? false : 'inline',
        },
        watch: {
            include: ['index.js']
        }
    }
];
