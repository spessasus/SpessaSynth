import { context } from 'esbuild'
import { getConfig } from './esbuild.config.js'

(async () => {
    const watch = process.argv.includes('--watch');
    const config = getConfig(process.argv);
    const ctx = await context(config);

    if (watch) {
        await ctx.watch();
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log('[BUILD] done.');
    }
})();
