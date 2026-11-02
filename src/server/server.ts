import http from "node:http";
import path from "node:path";
import {
    getVersion,
    resolveRequestPath,
    serveSettings,
    serveSfont,
    serveSfontList,
    serveStaticFile
} from "./serve.js";
import { openURL } from "./open.js";
import { type SavedSettings } from "./saved_settings.ts";
import { LocalEditionConfig } from "./config_management.ts";
import {
    getCurrentVersion,
    isSafeBankName,
    rootDir,
    rootFile,
    soundfontsPath
} from "./server_utils.ts";
import { API, type LastUsedSoundBankBody, PAGE_HEADER } from "./api.ts";
import { autoUpdate } from "./auto_update.ts";

let PORT = 8181;
const HOST = "0.0.0.0";

console.info(`\nSpessaSynth: Local Edition, version ${getCurrentVersion()}`);
console.info(`Copyright (c) spessasus ${new Date().getFullYear()}`);
console.info(
    "This project is licensed under Apache-2.0 license, see LICENSE file for more details.\n"
);

await autoUpdate();

const configManager = await LocalEditionConfig.initialize();

function readBody(req: http.IncomingMessage) {
    return new Promise<string>((resolve, reject) => {
        let body = "";
        req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
        });
        req.on("end", () => resolve(body));
        req.on("error", reject);
    });
}

function sendText(res: http.ServerResponse, status: number, text: string) {
    res.writeHead(status, { "Content-Type": "text/plain" });
    res.end(text);
}

const server = http.createServer(async (req, res) => {
    if (!req.url) {
        return;
    }
    const pathname = req.url.split("?")[0];
    const method = req.method ?? "GET";

    // State-changing requests must come from the page, see PAGE_HEADER
    if (
        method !== "GET" &&
        method !== "HEAD" &&
        !req.headers[PAGE_HEADER.toLowerCase()]
    ) {
        sendText(res, 403, `Missing ${PAGE_HEADER} header`);
        return;
    }

    if (method === "GET" && pathname.startsWith(API.soundBanks + "/")) {
        let name;
        try {
            name = decodeURIComponent(
                pathname.slice(API.soundBanks.length + 1)
            );
        } catch {
            sendText(res, 400, "Invalid sound bank name");
            return;
        }
        if (!isSafeBankName(name)) {
            sendText(res, 400, "Invalid sound bank name");
            return;
        }
        serveSfont(path.join(soundfontsPath, name), res);
        return;
    }

    switch (`${method} ${pathname}`) {
        default: {
            serveStaticFile(
                res,
                resolveRequestPath(path.join(rootDir, "local-dev"), req.url)
            );
            break;
        }

        case "GET /": {
            serveStaticFile(res, rootFile, "text/html");
            break;
        }

        case `GET ${API.soundBanks}`: {
            await serveSfontList(res, configManager);
            break;
        }

        case `PUT ${API.lastUsedSoundBank}`: {
            let name: unknown;
            try {
                name = (
                    JSON.parse(
                        await readBody(req)
                    ) as Partial<LastUsedSoundBankBody>
                ).name;
            } catch {
                // An exception here would stop the server, prevent that.
                sendText(res, 400, "Invalid body");
                return;
            }
            if (typeof name !== "string" || !isSafeBankName(name)) {
                sendText(res, 400, "Invalid sound bank name");
                return;
            }
            configManager.config.lastUsedSf2 = name;
            await configManager.flush();
            sendText(res, 200, "Sound bank updated");
            break;
        }

        case `PUT ${API.settings}`: {
            try {
                configManager.config.settings = JSON.parse(
                    await readBody(req)
                ) as SavedSettings;
            } catch {
                // An exception here would stop the server, prevent that.
                sendText(res, 400, "Invalid settings");
                return;
            }
            await configManager.flush();
            sendText(res, 200, "Settings saved");
            break;
        }

        case `GET ${API.settings}`: {
            serveSettings(res, configManager);
            break;
        }

        case `GET ${API.version}`: {
            getVersion(res);
            break;
        }
    }
});

// Look for a port that isn't occupied
let served = false;

function tryServer() {
    server
        .listen(PORT, HOST, () => {
            if (served) {
                return;
            }
            served = true;
            const url = `http://localhost:${PORT}`;
            console.info(`Running on ${url}. A browser window should open.`);
            openURL(url);
        })
        .on("error", (e) => {
            if ("code" in e && e.code === "EADDRINUSE") {
                console.warn(
                    `Port ${PORT} seems to be occupied, trying a different one...`
                );
                PORT++;
                tryServer();
            } else {
                throw e;
            }
        });
}

tryServer();
