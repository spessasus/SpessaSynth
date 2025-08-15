import http from "http";
import path from "path";
import {
    getVersion,
    serveSettings,
    serveSfontList,
    serveStaticFile
} from "./serve.js";
import { openURL } from "./open.js";
import { type SavedSettings } from "./saved_settings.ts";
import { LocalEditionConfig } from "./config_management.ts";

let PORT = 8181;
const HOST = "0.0.0.0";

const __dirname = import.meta.dirname;

export const soundfontsPath = path.join(__dirname, "../soundfonts");
export const packageJSON = path.join(__dirname, "../package.json");
export const rootFile = path.join(
    __dirname,
    "../local-dev/local_edition_index.html"
);

const configManager = await LocalEditionConfig.initialize();

const server = http.createServer(async (req, res) => {
    if (!req.url) {
        return;
    }
    switch (req.url.split("?")[0]) {
        default:
            serveStaticFile(
                res,
                path.join(__dirname, "../local-dev/", req.url)
            );
            break;

        case "/":
            serveStaticFile(res, rootFile, "text/html");
            break;

        case "/soundfonts":
            await serveSfontList(res, configManager);
            break;

        case "/setlastsf2":
            const urlParams = new URL(req.url, `http://${req.headers.host}`)
                .searchParams;
            const sfname = urlParams.get("sfname");

            configManager.config.lastUsedSf2 = sfname;
            await configManager.flush();
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Soundfont updated");
            break;

        case "/savesettings":
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

        case "/getsettings":
            serveSettings(res, configManager);
            break;

        case "/getversion":
            getVersion(res);
            break;
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
