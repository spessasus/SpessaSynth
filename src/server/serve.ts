import fs from "node:fs";
import path from "node:path";
import type { ServerResponse } from "node:http";
import type { LocalEditionConfig } from "./config_management.ts";

import {
    getCurrentVersion,
    isSoundBank,
    soundfontsPath
} from "./server_utils.ts";

export function serveSfont(path: string, res: ServerResponse) {
    let size;
    try {
        size = fs.statSync(path).size;
    } catch {
        res.writeHead(404);
        res.end("Soundfont not found");
        return;
    }
    const fileStream = fs.createReadStream(path);

    fileStream.on("error", (error) => {
        if ("code" in error && error.code === "ENOENT") {
            res.writeHead(404);
            res.end("Soundfont not found");
        } else {
            res.writeHead(500);
            res.end("Internal server error");
        }
    });

    fileStream.once("open", () => {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Length", size);
        fileStream.pipe(res);
    });
    fileStream.on("end", () => {
        fileStream.close();
        res.end();
    });
}

export async function serveSfontList(
    res: ServerResponse,
    config: LocalEditionConfig
) {
    const fileNames = fs
        .readdirSync(soundfontsPath)
        .filter((fName) => isSoundBank(fName));

    if (config.config.lastUsedSf2) {
        if (fileNames.includes(config.config.lastUsedSf2)) {
            fileNames.splice(fileNames.indexOf(config.config.lastUsedSf2), 1);
            fileNames.unshift(config.config.lastUsedSf2);
        }
    } else {
        config.config.lastUsedSf2 = fileNames[0];
    }
    await config.flush();

    const files = fileNames.map((file) => {
        return { name: file };
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(files));
}

export function serveSettings(res: ServerResponse, config: LocalEditionConfig) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(config.config.settings));
}

export function resolveRequestPath(directory: string, url: string) {
    // Filter out the something.js?hash=5637f
    let decoded;
    try {
        decoded = decodeURIComponent(url.split("?")[0]);
    } catch {
        return;
    }
    const root = path.resolve(directory);
    const filePath = path.resolve(root, "." + decoded);
    // The server is reachable from the network, never serve files outside the directory
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        return;
    }
    return filePath;
}

export function serveStaticFile(
    res: ServerResponse,
    filePath: string | undefined,
    mimeType?: string
) {
    if (filePath === undefined) {
        res.writeHead(400);
        res.end("Invalid path");
        return;
    }
    if (
        filePath.toLowerCase().endsWith(".sf3") ||
        filePath.toLowerCase().endsWith(".sf2") ||
        filePath.toLowerCase().endsWith(".sfogg") ||
        filePath.toLowerCase().endsWith(".dls")
    ) {
        filePath = path.join(
            path.dirname(filePath),
            "../soundfonts",
            path.basename(filePath)
        );
        serveSfont(filePath, res);
        return;
    }

    let file;
    try {
        file = fs.readFileSync(filePath);
    } catch {
        console.warn("Not found for", filePath);
        // The path is not echoed back, as it comes from the request
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(`
<html lang='en'>
    <head>
        <meta http-equiv='Refresh' content='0; URL=/' /><title>Not found</title>
    </head>
    <body>
    <h1>Not Found!</h1>
</body>
</html>`);
        return;
    }
    let type = {};
    if (mimeType) {
        type = { "Content-Type": mimeType };
    }
    if (filePath.endsWith(".js")) {
        type = { "Content-Type": "text/javascript" };
    }
    res.writeHead(200, type);
    res.end(file);
}

export function getVersion(res: ServerResponse) {
    const v = getCurrentVersion();
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(v);
}
