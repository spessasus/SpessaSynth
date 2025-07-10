import * as esbuild from "esbuild";
import path from "path";
import metaUrlPlugin from "@chialab/esbuild-plugin-meta-url";

const buildRoot = import.meta.dirname;
const repoRoot = path.resolve(buildRoot, "../..");
const websiteRoot = path.resolve(buildRoot, "../website");
const demoInput = path.resolve(websiteRoot, "js/main/demo_main.js");
const localInput = path.resolve(websiteRoot, "js/main/local_main.js");
const stylesInput = path.resolve(websiteRoot, "css/style.css");

const demoDir = path.resolve(repoRoot, "dist/minified");
const localDir = path.resolve(repoRoot, "local-dev");

const regularOptions = {
    minify: true,
    bundle: true,
    treeShaking: true,
    format: "esm",
    platform: "browser",
    logLevel: "info"
};

await esbuild.build({
    plugins: [metaUrlPlugin()],
    entryPoints: [demoInput],
    splitting: true,
    ...regularOptions,
    outdir: demoDir,
    logLevel: "info"
});

await esbuild.build({
    entryPoints: [stylesInput],
    ...regularOptions,
    outfile: path.resolve(demoDir, "style.min.css"),
    logLevel: "info"
});

// local edition
await esbuild.build({
    plugins: [metaUrlPlugin()],
    entryPoints: [localInput],
    ...regularOptions,
    splitting: true,
    sourcemap: "linked",
    outdir: localDir
});
await esbuild.build({
    entryPoints: [stylesInput],
    ...regularOptions,
    sourcemap: "linked",
    outfile: path.resolve(localDir, "style.min.css")
});