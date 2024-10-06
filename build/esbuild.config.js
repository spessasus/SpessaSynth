import { copyFilesPlugin } from './copy.plugin.js'

export const LIB_FILES = {
    from: [
        './src/spessasynth_lib/minified/worklet_processor_main.min.js',
        './src/spessasynth_lib/synthetizer/audio_effects/impulse_response_2.flac'
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
    const isLib = params.includes('--lib');

    const mainDir = isLib ? './src/spessasynth_lib' : './src/website';
    const cssFiles = `${mainDir}/**/*_main.css`;
    const jsFiles = `${mainDir}/**/*_main.js`;
    const outdir = `${mainDir}/minified`;


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

    if (!skipCopy && !css && !isLib) {
        plugins.push(copyFilesPlugin(LIB_FILES));
    }

    console.log('[BUILD] start.', {  watch, sourcemap, minify, skipCopy, entryPoints });
    return {
        entryPoints,
        outdir,
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
