import { copyFilesPlugin } from './copy.plugin.js'

export const LIB_FILES = {
    from: [
        './node_modules/spessasynth_lib/synthetizer/worklet_processor.min.js',
        './node_modules/spessasynth_lib/synthetizer/worklet_system/worklet_processor.js',
        './node_modules/spessasynth_lib/synthetizer/audio_effects/impulse_response_2.flac'
    ],
    to: ['./src/website/lib'],
};

export const getConfig = (params) =>{
    const watch = params.includes('--watch');
    const sourcemap = params.includes('--sourcemap');
    const js = params.includes('--js');
    const css = params.includes('--css');
    const minify = !params.includes('--skipminify');
    const skipCopy = params.includes('--skipcopy');

    const cssFiles = './src/**/*_main.css';
    const jsFiles = './src/**/*_main.js';

    const entryPoints = [];
    const plugins = [];
    if (js) {
        entryPoints.push(jsFiles);
    }

    if (css) {
        entryPoints.push(cssFiles);
    }

    if (!js && !css) {
        entryPoints.push(jsFiles, cssFiles);
    }

    if (!skipCopy && !css) {
        plugins.push(copyFilesPlugin(LIB_FILES));
    }

    console.log('[BUILD] start.', {  watch, sourcemap, minify, skipCopy, entryPoints });
    return {
        entryPoints,
        outdir: './src/website/minified',
        entryNames: '[name].min',
        bundle: true,
        format: 'esm',
        platform: 'browser',
        minify,
        logLevel: 'info',
        sourcemap: sourcemap || watch,
        plugins,
    };
};
