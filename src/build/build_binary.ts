import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import child_process from "node:child_process";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { Canvas, loadImage } from "skia-canvas";
import { buildSpessaSynth } from "./build_script.ts";
import { runSync } from "./run_command.ts";
import { createTarGz } from "./tar.ts";
import { LOCAL_EDITION_ZIP_NAME } from "./local_edition_zip_name.ts";
import {
    BINARY_PLATFORMS,
    type BinaryPlatform,
    DOWNLOADS_MANIFEST_NAME,
    type DownloadsManifest
} from "./downloads.ts";

// Builds the standalone executables into dist/ and writes dist/downloads.json

// Don't use meta.dirname: https://github.com/spessasus/SpessaSynth
const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../.."
);
const EXE_DIR = path.resolve(REPO_ROOT, "src/executable");
const WEB_DIR = path.resolve(EXE_DIR, "web");
const DIST_DIR = path.resolve(REPO_ROOT, "dist");
const LOCAL_DIR = path.resolve(REPO_ROOT, "local-dev");
const LOGO = path.resolve(
    REPO_ROOT,
    "src/website/spessasynth_logo_rounded.png"
);
const SOUND_BANK = "soundfonts/GeneralUserGS.sf3";

const printStep = (s: string) => {
    console.info("\n--------------------------");
    console.info(s);
    console.info("--------------------------");
};

async function exists(p: string) {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

async function describe(file: string) {
    const data = await fs.readFile(path.resolve(DIST_DIR, file));
    return {
        file,
        size: data.length,
        sha256: crypto.createHash("sha256").update(data).digest("hex")
    };
}

// Pages URL of this repository, so a fork's builds use the fork's site
function pagesBaseURL() {
    const repo = process.env.GITHUB_REPOSITORY ?? "spessasus/SpessaSynth";
    const [owner, name] = repo.split("/");
    if (name.toLowerCase() === `${owner.toLowerCase()}.github.io`) {
        return `https://${owner}.github.io/`;
    }
    return `https://${owner}.github.io/${name}/`;
}

const version = (
    JSON.parse(
        await fs.readFile(path.resolve(REPO_ROOT, "package.json"), "utf8")
    ) as { version: string }
).version;

const goCheck = child_process.spawnSync("go", ["version"], {
    encoding: "utf8"
});
if (goCheck.status !== 0) {
    console.error(
        "Go is needed for the standalone executables, see src/executable/go.mod for the version."
    );
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
}

printStep("⚙️  1) Web build");
if (
    !(await exists(path.resolve(LOCAL_DIR, "local_edition_index.html"))) ||
    !(await exists(path.resolve(DIST_DIR, SOUND_BANK))) ||
    !(await exists(path.resolve(DIST_DIR, LOCAL_EDITION_ZIP_NAME)))
) {
    console.info("The web build is missing, building it first...");
    await buildSpessaSynth();
}

printStep("🗂️  2) Copy the web files for embedding");
for (const entry of await fs.readdir(WEB_DIR)) {
    // The placeholder keeps the folder in git
    if (entry !== "README.txt") {
        await fs.rm(path.resolve(WEB_DIR, entry), { recursive: true });
    }
}
for (const entry of await fs.readdir(LOCAL_DIR, { withFileTypes: true })) {
    if (entry.isFile() && !entry.name.endsWith(".map")) {
        await fs.cp(
            path.resolve(LOCAL_DIR, entry.name),
            path.resolve(WEB_DIR, entry.name)
        );
    }
}
// A small copy of the logo for the Linux launcher icon
const logo = await loadImage(LOGO);
const icon = new Canvas(256, 256);
icon.getContext("2d").drawImage(logo, 0, 0, 256, 256);
await fs.writeFile(
    path.resolve(WEB_DIR, "spessasynth_logo.png"),
    await icon.toBuffer("png")
);

printStep("🔎  3) Go checks");
const unformatted = runSync("gofmt", ["-l", "."], {
    cwd: EXE_DIR,
    capture: true
}).trim();
if (unformatted) {
    console.error(`These files need gofmt -w:\n${unformatted}`);
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1);
}
runSync("go", ["vet", "./..."], { cwd: EXE_DIR, shell: false });
runSync("go", ["tool", "staticcheck", "./..."], { cwd: EXE_DIR, shell: false });
runSync("go", ["test", "./..."], { cwd: EXE_DIR, shell: false });

printStep("🪟  4) Windows resources");
// Windows wants four numbers
const winVersion = [...version.split("."), "0", "0", "0", "0"]
    .slice(0, 4)
    .join(".");
runSync(
    "go",
    [
        "tool",
        "go-winres",
        "simply",
        "--icon",
        LOGO,
        "--manifest",
        "cli",
        "--product-name",
        "SpessaSynth",
        "--file-description",
        "SpessaSynth Local Edition",
        "--product-version",
        winVersion,
        "--file-version",
        winVersion,
        "--original-filename",
        BINARY_PLATFORMS["win-x64"].executable,
        "--copyright",
        "Copyright (c) spessasus, Apache-2.0 license",
        "--arch",
        "amd64",
        "--out",
        "rsrc"
    ],
    { cwd: EXE_DIR, shell: false }
);

printStep("🛠️  5) Build and archive");
const baseURL = pagesBaseURL();
console.info(`Version ${version}, downloads from ${baseURL}`);
const license = await fs.readFile(path.resolve(REPO_ROOT, "LICENSE"));
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "spessasynth-binary-"));
const platforms: DownloadsManifest["platforms"] = {};
try {
    for (const [key, target] of Object.entries(BINARY_PLATFORMS) as [
        BinaryPlatform,
        (typeof BINARY_PLATFORMS)[BinaryPlatform]
    ][]) {
        const out = path.join(tmp, key, target.executable);
        runSync(
            "go",
            [
                "build",
                "-trimpath",
                "-ldflags",
                `-s -w -X main.version=${version} -X main.baseURL=${baseURL}`,
                "-o",
                out,
                "."
            ],
            {
                cwd: EXE_DIR,
                shell: false,
                env: {
                    CGO_ENABLED: "0",
                    GOOS: target.goos,
                    GOARCH: target.goarch
                }
            }
        );
        const binary = await fs.readFile(out);

        let archive: Uint8Array;
        if (target.archive.endsWith(".zip")) {
            const zip = new JSZip();
            zip.file(target.executable, binary);
            zip.file("LICENSE", license);
            archive = await zip.generateAsync({
                type: "uint8array",
                compression: "DEFLATE",
                compressionOptions: { level: 9 }
            });
        } else {
            archive = createTarGz(
                [
                    { name: target.executable, data: binary, mode: 0o755 },
                    { name: "LICENSE", data: license, mode: 0o644 }
                ],
                new Date()
            );
        }
        await fs.writeFile(path.resolve(DIST_DIR, target.archive), archive);
        platforms[key] = await describe(target.archive);
        console.info(
            `${target.archive}: ${(binary.length / 1e6).toFixed(1)} MB raw, ${(archive.length / 1e6).toFixed(1)} MB archived`
        );
    }
} finally {
    await fs.rm(tmp, { recursive: true, force: true });
}

printStep("📝  6) downloads.json");
const manifest: DownloadsManifest = {
    version,
    soundBank: await describe(SOUND_BANK),
    localEdition: await describe(LOCAL_EDITION_ZIP_NAME),
    platforms
};
await fs.writeFile(
    path.resolve(DIST_DIR, DOWNLOADS_MANIFEST_NAME),
    JSON.stringify(manifest, null, 4)
);
console.info(JSON.stringify(manifest, null, 4));
console.info("✅ Standalone executables built!");
