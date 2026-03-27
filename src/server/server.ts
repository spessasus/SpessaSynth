import http from "node:http";
import path from "node:path";
import {
    getVersion,
    serveSettings,
    serveSfontList,
    serveStaticFile
} from "./serve.js";
import { openURL } from "./open.js";
import { type SavedSettings } from "./saved_settings.ts";
import { LocalEditionConfig } from "./config_management.ts";
import { getCurrentVersion, rootDir, rootFile } from "./server_utils.ts";
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

const server = http.createServer(async (req, res) => {
    if (!req.url) {
        return;
    }
    switch (req.url.split("?")[0]) {
        default: {
            serveStaticFile(res, path.join(rootDir, "local-dev/", req.url));
            break;
        }

        case "/": {
            serveStaticFile(res, rootFile, "text/html");
            break;
        }

        case "/soundfonts": {
            await serveSfontList(res, configManager);
            break;
        }

        case "/setlastsf2": {
            const urlParams = new URL(req.url, `http://${req.headers.host}`)
                .searchParams;

            configManager.config.lastUsedSf2 = urlParams.get("sfname");
            await configManager.flush();
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Soundfont updated");
            break;
        }

        case "/savesettings": {
            let body = "";
            req.on("data", (chunk: number) => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                configManager.config.settings = JSON.parse(
                    body
                ) as SavedSettings;
                await configManager.flush();
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end("Settings saved");
            });
            break;
        }

        case "/getsettings": {
            serveSettings(res, configManager);
            break;
        }

        case "/getversion": {
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
