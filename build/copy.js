import { copyFiles } from './copy.plugin.js'
import { LIB_FILES } from './esbuild.config.js'

copyFiles(LIB_FILES.from, LIB_FILES.to);
