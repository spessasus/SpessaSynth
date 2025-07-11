import path from "node:path";
import fs from "node:fs/promises";
import * as esbuild from "esbuild";
import metaUrlPlugin from "@chialab/esbuild-plugin-meta-url";
import JSZip from "jszip";

export async function buildSpessaSynth()
{
    const REPO_ROOT = path.resolve(import.meta.dirname, "../..");
    
    const WEBSITE_DIR = path.resolve(REPO_ROOT, "src/website");
    const SOUNDFONT_NAME = "GeneralUserGS.sf3";
    
    const DEMO_DIR_SRC = path.resolve(REPO_ROOT, "dist/minified");
    const DEMO_DIR = path.resolve(REPO_ROOT, "dist");
    const LOCAL_DIR = path.resolve(REPO_ROOT, "local-dev");
    const OUTPUT_ZIP = "SpessaSynth-LocalEdition.zip";
    
    
    const print = (t = "") =>
    {
        console.info(t);
    };
    
    const printStep = s =>
    {
        print("\n--------------------------");
        print(s);
        print("--------------------------");
    };
    
    print("Building SpessaSynth...");
    
    printStep("⚙️  1) Clean dist directories");
    
    await fs.rm(DEMO_DIR, { recursive: true, force: true });
    await fs.rm(LOCAL_DIR, { recursive: true, force: true });
    
    printStep("⚙️  2) Create directories and copy files");
    
    await fs.mkdir(DEMO_DIR_SRC, { recursive: true });
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    
    // html
    await fs.cp(path.resolve(WEBSITE_DIR, "html/demo_index.html"), path.resolve(DEMO_DIR, "index.html"));
    await fs.cp(
        path.resolve(WEBSITE_DIR, "html/local_edition_index.html"),
        path.resolve(LOCAL_DIR, "local_edition_index.html")
    );
    
    // favicon
    await fs.cp(path.resolve(WEBSITE_DIR, "favicon.ico"), path.resolve(DEMO_DIR, "favicon.ico"));
    await fs.cp(path.resolve(WEBSITE_DIR, "favicon.ico"), path.resolve(LOCAL_DIR, "favicon.ico"));
    
    // server
    await fs.cp(path.resolve(WEBSITE_DIR, "server"), path.resolve(REPO_ROOT, "server"), { recursive: true });
    
    // package and soundfont
    await fs.cp(path.resolve(REPO_ROOT, "package.json"), path.resolve(DEMO_DIR, "package.json"));
    await fs.cp(
        path.resolve(REPO_ROOT, "soundfonts", SOUNDFONT_NAME),
        path.resolve(DEMO_DIR, "soundfonts", SOUNDFONT_NAME),
        { recursive: true }
    );
    
    printStep("️  3) Build");
    
    const demoInput = path.resolve(WEBSITE_DIR, "js/main/demo_main.js");
    const localInput = path.resolve(WEBSITE_DIR, "js/main/local_main.js");
    const stylesInput = path.resolve(WEBSITE_DIR, "css/style.css");
    
    const regularOptions = {
        minify: true,
        bundle: true,
        treeShaking: true,
        format: "esm",
        platform: "browser",
        logLevel: "info"
    };
    
    print("Building demo...");
    await esbuild.build({
        plugins: [metaUrlPlugin()],
        entryPoints: [demoInput],
        splitting: true,
        ...regularOptions,
        outdir: DEMO_DIR_SRC,
        logLevel: "info"
    });
    
    print("Building local edition with sourcemaps...");
    await esbuild.build({
        plugins: [metaUrlPlugin()],
        entryPoints: [localInput],
        ...regularOptions,
        splitting: true,
        sourcemap: "linked",
        outdir: LOCAL_DIR
    });
    
    
    print("Building styles for both...");
    await esbuild.build({
        entryPoints: [stylesInput],
        ...regularOptions,
        outfile: path.resolve(DEMO_DIR_SRC, "style.min.css"),
        logLevel: "info"
    });
    await esbuild.build({
        entryPoints: [stylesInput],
        ...regularOptions,
        sourcemap: "linked",
        outfile: path.resolve(LOCAL_DIR, "style.min.css")
    });
    
    printStep("🗂️  4) Prepare The Local‑Edition Distribution ZIP");
    
    const ZIP_FOLDER_NAME = `local-edition-compiled-${new Date().toISOString().split("T")[0]}`;
    const mainZip = new JSZip();
    const zip = mainZip.folder(ZIP_FOLDER_NAME);
    const localDev = zip.folder("local-dev");
    
    const copyFileToZip = async (p, zip) =>
    {
        const name = path.basename(p);
        try
        {
            const f = await fs.readFile(p);
            zip.file(name, f);
        }
        catch (e)
        {
            console.error(e);
        }
    };
    
    // rsync (copy all js files)
    const copyFolder = async (p, zip) =>
    {
        const entries = await fs.readdir(p, { withFileTypes: true });
        for (const entry of entries)
        {
            const srcPath = path.resolve(p, entry.name);
            // don't copy maps
            if (!entry.name.endsWith(".map"))
            {
                const bin = await fs.readFile(srcPath);
                zip.file(entry.name, bin);
            }
        }
    };
    await copyFolder(LOCAL_DIR, localDev);
    await copyFolder(path.resolve(WEBSITE_DIR, "server"), zip.folder("server"));
    
    // copy files to the root folder
    await copyFileToZip(path.resolve(REPO_ROOT, "package.json"), zip);
    await copyFileToZip(path.resolve(REPO_ROOT, "README.md"), zip);
    await copyFileToZip(path.resolve(REPO_ROOT, "LICENSE"), zip);
    await copyFileToZip(path.resolve(REPO_ROOT, "Open SpessaSynth.bat"), zip);
    
    // copy sfont
    await copyFileToZip(path.resolve(REPO_ROOT, "soundfonts", SOUNDFONT_NAME), zip.folder("soundfonts"));
    
    const targetZip = path.resolve(DEMO_DIR, OUTPUT_ZIP);
    const zippedFile = await mainZip.generateAsync({ type: "nodebuffer" });
    await fs.writeFile(targetZip, zippedFile);
    
    print("✅ Build complete!");
    print(" • dist/                                ← Github Pages");
    print(" • local/                               ← Local Edition ready for debugging");
    print(` • dist/${OUTPUT_ZIP}    ← Local‑Edition zip`);
    
}