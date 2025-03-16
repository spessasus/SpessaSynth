import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getVersion, serveSettings, serveSfontList, serveStaticFile } from "./serve.js";
import { openURL } from "./open.js";

let PORT = 8181;
const HOST = "0.0.0.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.join(path.dirname(__filename), "../../");

export const configPath = path.join(__dirname, "/website/server/config.json");
export const soundfontsPath = path.join(__dirname, "../soundfonts");
export const packageJSON = path.join(__dirname, "../package.json");

fs.writeFile(configPath, "{}", { flag: "wx" }, () =>
{
});


const server = http.createServer((req, res) =>
{
    switch (req.url.split("?")[0])
    {
        case "/":
            serveStaticFile(
                res,
                path.join(__dirname, "website/local_edition_index.html"),
                "text/html"
            );
            break;
        
        case "/soundfonts":
            serveSfontList(res);
            break;
        
        case "/setlastsf2":
            const urlParams = new URL(
                req.url,
                `http://${req.headers.host}`
            ).searchParams;
            const sfname = urlParams.get("sfname");
            
            let configJson = fs.readFileSync(configPath, "utf-8").trim();
            if (configJson.length < 1)
            {
                configJson = "{}";
            }
            
            const config = JSON.parse(configJson);
            config["lastUsedSf2"] = sfname;
            
            fs.writeFile(configPath, JSON.stringify(config), { flag: "w" }, () =>
            {
            });
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("Soundfont updated");
            break;
        
        case "/savesettings":
            let body = "";
            req.on("data", chunk =>
            {
                body += chunk.toString();
            });
            req.on("end", () =>
            {
                const settings = JSON.parse(body);
                const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                config.settings = settings;
                
                fs.writeFile(configPath, JSON.stringify(config), { flag: "w" }, () =>
                {
                });
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end("Settings saved");
            });
            break;
        
        case "/getsettings":
            serveSettings(res);
            break;
        
        case "/getversion":
            getVersion(res);
            break;
        
        default:
            serveStaticFile(res, path.join(__dirname, req.url));
    }
});

// look for a port that isn't occupied
let served = false;

function tryServer()
{
    server.listen(PORT, HOST, () =>
    {
        if (served)
        {
            return;
        }
        served = true;
        let url = `http://localhost:${PORT}`;
        console.log(`Running on ${url}. A browser window should open.`);
        openURL(url);
    }).on("error", e =>
    {
        if (e.code === "EADDRINUSE")
        {
            console.log(`Port ${PORT} seems to be occupied, trying again...`);
            PORT++;
            tryServer();
        }
        else
        {
            throw e;
        }
    });
}

tryServer();
