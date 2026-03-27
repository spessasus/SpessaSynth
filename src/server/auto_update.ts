import { getCurrentVersion, isVersionNewer, rootDir } from "./server_utils.ts";
import {
    LOCAL_EDITION_ZIP_FOLDER_NAME,
    LOCAL_EDITION_ZIP_NAME
} from "../build/local_edition_zip_name.ts";
import JSZip from "jszip";
import path from "node:path";
import fs from "node:fs/promises";
import child_process from "node:child_process";

// Runs on server boot
export async function autoUpdate() {
    const currentVersion = getCurrentVersion();
    console.info("-------------");
    console.info("Checking for updates...");
    let response: Response;
    try {
        response = await fetch(
            "https://spessasus.github.io/SpessaSynth/package.json"
        );
    } catch (error) {
        console.error(
            "Failed to check for new version:",
            (error as TypeError).message
        );
        return;
    }
    if (!response.ok) {
        console.error(
            "Failed to check for new version: website returned status",
            response.status
        );
        return;
    }
    const onlineVersion =
        ((await response.json()) as { version: string })?.version || "4.2.0";
    if (!isVersionNewer(onlineVersion, currentVersion)) {
        console.info("No updates found.");
        console.info("-------------");
        return;
    }
    console.info(`New update found! (${currentVersion}) -> (${onlineVersion})`);
    console.info("-------------");
    await performLocaEditionUpdate();
}

const progressBarWidth = 30;
function renderProgress(progress: number) {
    const percent = progress;
    const filled = Math.floor(percent * progressBarWidth);
    const empty = progressBarWidth - filled;

    const bar = `${"=".repeat(filled)}>${" ".repeat(empty)}`;
    const percentText = `${Math.round(percent * 100)}%`;

    process.stdout.write(`\r|${bar}| ${percentText}`);
}

async function downloadUpdate() {
    let fetched: Response;
    try {
        fetched = await fetch(
            `https://spessasus.github.io/SpessaSynth/${LOCAL_EDITION_ZIP_NAME}`
        );
    } catch (error) {
        console.error(
            "Failed to download the new version:",
            (error as TypeError).message
        );
        return;
    }
    if (!fetched.ok || !fetched.body) {
        console.error(
            "Failed to download the new version: website returned status",
            fetched.status
        );
        return;
    }
    const reader = fetched.body.getReader();
    let done = false;
    const size = Number.parseInt(fetched.headers.get("content-length") ?? "0");
    console.info(`Downloading the new version (${size / 1000 ** 2} MB)`);
    const zipFile = new Uint8Array(size);
    let offset = 0;
    do {
        const readData = await reader.read();
        if (readData.value) {
            zipFile.set(readData.value, offset);
            offset += readData.value.length;
        }
        done = readData.done;
        renderProgress(offset / size);
    } while (!done);
    console.info(`\nDownloaded succesfully!`);
    return zipFile;
}

const FILES_TO_REPLACE = [
    "package.json",
    "README.md",
    "LICENSE",
    "Open SpessaSynth.bat"
];

async function clearDirs() {
    console.info("Removing current version...");
    const localDir = path.resolve(rootDir, "local-dev");
    await fs.rm(localDir, { recursive: true, force: true });
    const serverDir = path.resolve(rootDir, "server");
    // Read config before deleting
    let configData = "{}";
    try {
        configData = await fs.readFile(path.resolve(serverDir, "config.json"), {
            encoding: "utf-8"
        });
    } catch {
        console.warn("No config found to migrate.");
    }
    await fs.rm(serverDir, { recursive: true, force: true });
    await Promise.all(
        FILES_TO_REPLACE.map((file) =>
            fs.rm(path.resolve(rootDir, file), { force: true })
        )
    );
    return configData;
}

async function performLocaEditionUpdate() {
    console.info("Updating SpessaSynth Local Edition...");
    const binary = await downloadUpdate();
    if (!binary) {
        return;
    }
    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(binary);
    } catch {
        console.error("Failed to unzip the file. Aborting...");
        return;
    }

    // Clean dirs
    const configJson = await clearDirs();

    console.info("Writing new files...");
    // Write files from jszip
    for (const [fileName, file] of Object.entries(zip.files)) {
        if (
            fileName.endsWith("/") ||
            fileName.includes("soundfonts/") ||
            !fileName.includes(LOCAL_EDITION_ZIP_FOLDER_NAME)
        ) {
            continue;
        }
        const realPath = path.resolve(
            rootDir,
            fileName.replace(`${LOCAL_EDITION_ZIP_FOLDER_NAME}/`, "./")
        );
        await fs.mkdir(path.dirname(realPath), { recursive: true });
        await fs.writeFile(realPath, await file.async("uint8array"));
    }
    // Write configuration
    await fs.mkdir(path.resolve(rootDir, "server"), { recursive: true });
    await fs.writeFile(
        path.resolve(rootDir, "server/config.json"),
        configJson,
        { encoding: "utf-8" }
    );
    console.info("Update succesful!");

    // Run the new project
    const serverFilePath = path.resolve(rootDir, "server/server.js");
    const promise = new Promise<void>((resolve) => {
        const updatedServer = child_process.spawn("node", [serverFilePath], {
            stdio: "inherit"
        });
        updatedServer.on("close", () => resolve());
    });
    await promise;

    // Prevent the current server from starting
    // eslint-disable-next-line
    process.exit(0);
}
