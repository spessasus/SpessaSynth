import fs from "fs";
import path from "path";
import { configPath, packageJSON, soundfontsPath } from "./server.js";
import type { ServerResponse } from "node:http";
import { type ConfigFile, DEFAULT_CONFIG_FILE } from "./saved_settings.ts";

export function serveSfont(path: string, res: ServerResponse) {
    const fileStream = fs.createReadStream(path);

    const size = fs.statSync(path).size;

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

function isSoundBank(name: string): boolean {
    const fName = name.toLowerCase();
    return (
        fName.endsWith("sf2") ||
        fName.endsWith("sf3") ||
        fName.endsWith("sfogg") ||
        fName.endsWith("dls")
    );
}

export function serveSfontList(res: ServerResponse) {
    const fileNames = fs
        .readdirSync(soundfontsPath)
        .filter((fName) => isSoundBank(fName));

    let configJson = fs.readFileSync(configPath, "utf-8").trim();
    if (configJson.length < 1) {
        configJson = "{}";
    }
    let config = DEFAULT_CONFIG_FILE;
    try {
        config = JSON.parse(configJson) as ConfigFile;
    } catch (e) {
        console.error("error parsing config:", configJson, e);
    }
    if (config.lastUsedSf2) {
        if (fileNames.includes(config.lastUsedSf2)) {
            fileNames.splice(fileNames.indexOf(config.lastUsedSf2), 1);
            fileNames.unshift(config.lastUsedSf2);
        }
    } else {
        config.lastUsedSf2 = fileNames[0];
    }

    const files = fileNames.map((file) => {
        return { name: file };
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(files));
}

export function serveSettings(res: ServerResponse) {
    let configJson = fs.readFileSync(configPath, "utf-8").trim();
    if (configJson.length < 1) {
        configJson = "{}";
    }
    let config = DEFAULT_CONFIG_FILE;
    try {
        config = JSON.parse(configJson) as ConfigFile;
    } catch (e) {
        console.error("error parsing config:", configJson, e);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(config.settings || {}));
}

export function serveStaticFile(
    res: ServerResponse,
    filePath: string,
    mimeType?: string
) {
    filePath = decodeURIComponent(filePath);
    // Filter out the something.js?hash=5637f
    const questionMark = filePath.split("?");
    if (questionMark.length === 2) {
        filePath = questionMark[0];
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
        console.log("Not found for", filePath);
        res.writeHead(404);
        res.end(`
<html lang='en'>
    <head>
        <meta http-equiv='Refresh' content='0; URL=/' /><title>Not found</title>
    </head>
    <body>
    <h1><pre>${filePath}</pre> not Found!</h1>
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
    const text = fs.readFileSync(packageJSON, "utf-8");
    const jason = JSON.parse(text) as { version: string };
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(jason.version);
    return jason.version;
}
