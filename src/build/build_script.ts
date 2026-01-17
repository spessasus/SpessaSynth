import path from "node:path";
import fs from "node:fs/promises";
import * as esbuild from "esbuild";
import metaUrlPlugin from "@chialab/esbuild-plugin-meta-url";
import JSZip from "jszip";
import { INSTALL_INSTRUCTIONS } from "./install_instructions.ts";
import { fileURLToPath } from "node:url";

export async function buildSpessaSynth() {
    // Don't use meta.dirname: https://github.com/spessasus/SpessaSynth
    const REPO_ROOT = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "../.."
    );

    const WEBSITE_DIR = path.resolve(REPO_ROOT, "src/website");
    const WORKLET_NAME = "spessasynth_processor.min.js";
    const WORKLET_PATH = path.resolve(
        REPO_ROOT,
        `node_modules/spessasynth_lib/dist/${WORKLET_NAME}`
    );
    const SOUNDFONT_NAME = "GeneralUserGS.sf3";

    const DEMO_DIR_SRC = path.resolve(REPO_ROOT, "dist/minified");
    const DEMO_DIR = path.resolve(REPO_ROOT, "dist");
    const LOCAL_DIR = path.resolve(REPO_ROOT, "local-dev");
    const SERVER_DIR = path.resolve(REPO_ROOT, "server");
    const OUTPUT_ZIP = "SpessaSynth-LocalEdition.zip";

    const print = (t = "") => {
        console.info(t);
    };

    const printStep = (s: string) => {
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

    // Html
    await fs.cp(
        path.resolve(WEBSITE_DIR, "html/demo_index.html"),
        path.resolve(DEMO_DIR, "index.html")
    );
    await fs.cp(
        path.resolve(WEBSITE_DIR, "html/local_edition_index.html"),
        path.resolve(LOCAL_DIR, "local_edition_index.html")
    );

    // Worklet
    await fs.cp(WORKLET_PATH, path.resolve(DEMO_DIR, WORKLET_NAME));
    await fs.cp(WORKLET_PATH, path.resolve(LOCAL_DIR, WORKLET_NAME));
    // Sourcemap
    await fs.cp(
        WORKLET_PATH + ".map",
        path.resolve(LOCAL_DIR, WORKLET_NAME + ".map")
    );

    // Favicon
    await fs.cp(
        path.resolve(WEBSITE_DIR, "favicon.ico"),
        path.resolve(DEMO_DIR, "favicon.ico")
    );
    await fs.cp(
        path.resolve(WEBSITE_DIR, "favicon.ico"),
        path.resolve(LOCAL_DIR, "favicon.ico")
    );

    // Package and soundfont
    await fs.cp(
        path.resolve(REPO_ROOT, "package.json"),
        path.resolve(DEMO_DIR, "package.json")
    );
    await fs.cp(
        path.resolve(REPO_ROOT, "soundfonts", SOUNDFONT_NAME),
        path.resolve(DEMO_DIR, "soundfonts", SOUNDFONT_NAME),
        { recursive: true }
    );

    printStep("️⚙️  3) Build");

    const demoInput = path.resolve(WEBSITE_DIR, "js/main/demo_main.ts");
    const localInput = path.resolve(WEBSITE_DIR, "js/main/local_main.ts");
    const serverInput = path.resolve(WEBSITE_DIR, "server/server.ts");
    const stylesInput = path.resolve(WEBSITE_DIR, "css/style.css");

    const regularOptions: esbuild.BuildOptions = {
        minify: true,
        bundle: true,
        treeShaking: true,
        format: "esm",
        platform: "browser",
        logLevel: "info",
        tsconfig: path.resolve(REPO_ROOT, "tsconfig.json")
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

    print("Building local edition server...");
    await esbuild.build({
        entryPoints: [serverInput],
        ...regularOptions,
        platform: "node",
        outdir: SERVER_DIR,
        sourcemap: "linked"
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

    const mainZip = new JSZip();
    // Install instructions
    mainZip.file(
        "INSTALL_INSTRUCTIONS.txt",
        new TextEncoder().encode(INSTALL_INSTRUCTIONS)
    );

    const ZIP_FOLDER_NAME = `spessasynth-local-edition`;
    const zip = mainZip.folder(ZIP_FOLDER_NAME);
    if (zip === null) {
        throw new Error("Error creating the zip file.");
    }
    const localDev = zip.folder("local-dev");
    if (localDev === null) {
        throw new Error("Error creating the zip file.");
    }
    const copyFileToZip = async (p: string, zip: JSZip) => {
        const name = path.basename(p);
        try {
            const f = await fs.readFile(p);
            zip.file(name, f);
        } catch (e) {
            console.error(e);
        }
    };

    // Rsync (copy all js files)
    const copyFolder = async (p: string, zip: JSZip) => {
        const entries = await fs.readdir(p, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.resolve(p, entry.name);
            // Don't copy maps
            if (!entry.name.endsWith(".map")) {
                const bin = await fs.readFile(srcPath);
                zip.file(entry.name, bin);
            }
        }
    };
    await copyFolder(LOCAL_DIR, localDev);
    const serverFolder = zip.folder("server");
    if (serverFolder === null) {
        throw new Error("Error creating the zip file.");
    }
    await copyFileToZip(path.resolve(SERVER_DIR, "server.js"), serverFolder);

    // Copy files to the root folder
    await copyFileToZip(path.resolve(REPO_ROOT, "package.json"), zip);
    await copyFileToZip(path.resolve(REPO_ROOT, "README.md"), zip);
    await copyFileToZip(path.resolve(REPO_ROOT, "LICENSE"), zip);
    await copyFileToZip(path.resolve(REPO_ROOT, "Open SpessaSynth.bat"), zip);

    // Copy the sf folder
    const soundBankFolder = zip.folder("soundfonts");
    if (!soundBankFolder) {
        throw new Error("Error creating the zip file.");
    }
    await copyFileToZip(
        path.resolve(REPO_ROOT, "soundfonts", SOUNDFONT_NAME),
        soundBankFolder
    );

    const targetZip = path.resolve(DEMO_DIR, OUTPUT_ZIP);
    const zippedFile = await mainZip.generateAsync({ type: "nodebuffer" });
    await fs.writeFile(targetZip, zippedFile);

    print("✅ Build complete!");
    print(" • dist/                                ← Github Pages");
    print(
        " • local/                               ← Local Edition ready for debugging"
    );
    print(` • dist/${OUTPUT_ZIP}    ← Local‑Edition zip`);
}
