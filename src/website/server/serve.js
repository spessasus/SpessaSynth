import fs from "fs";
import path from "path";
import { configPath, packageJSON, soundfontsPath } from "./server.js";

/**
 * @param res {ServerResponse}
 * @param path {string}
 */
export async function serveSfont(path, res)
{
    const fileStream = fs.createReadStream(path);
    
    const size = fs.statSync(path).size;
    
    fileStream.on("error", (error) =>
    {
        if (error.code === "ENOENT")
        {
            res.writeHead(404);
            res.end("Soundfont not found");
        }
        else
        {
            res.writeHead(500);
            res.end("Internal server error");
        }
    });
    
    fileStream.once("open", () =>
    {
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Length", size);
        fileStream.pipe(res);
    });
    fileStream.on("end", () =>
    {
        fileStream.close();
        res.end();
    });
}

/**
 * @param name {string}
 * @returns {boolean}
 */
function isSoundFont(name)
{
    const fName = name.toLowerCase();
    return fName.slice(-3) === "sf2" ||
        fName.slice(-3) === "sf3" ||
        fName.slice(-5) === "sfogg" ||
        fName.slice(-3) === "dls";
}

/**
 * @param res {ServerResponse}
 */
export function serveSfontList(res)
{
    const fileNames = fs.readdirSync(soundfontsPath).filter(fName => isSoundFont(fName));
    
    let configJson = fs.readFileSync(configPath, "utf-8").trim();
    if (configJson.length < 1)
    {
        configJson = "{}";
    }
    let config = {};
    try
    {
        config = JSON.parse(configJson);
    }
    catch (e)
    {
        console.error("error parsing config:", configJson, e);
    }
    if (config["lastUsedSf2"])
    {
        if (fileNames.includes(config["lastUsedSf2"]))
        {
            fileNames.splice(fileNames.indexOf(config["lastUsedSf2"]), 1);
            fileNames.unshift(config["lastUsedSf2"]);
        }
    }
    else
    {
        config["lastUsedSf2"] = fileNames[0];
    }
    
    const files = fileNames.map(file =>
    {
        return { name: file };
    });
    
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(files));
}

/**
 * @param res {ServerResponse}
 */
export function serveSettings(res)
{
    let configJson = fs.readFileSync(configPath, "utf-8").trim();
    if (configJson.length < 1)
    {
        configJson = "{}";
    }
    let config = {};
    try
    {
        config = JSON.parse(configJson);
    }
    catch (e)
    {
        console.error("error parsing config:", configJson, e);
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(config.settings || {}));
}

/**
 * @param res {ServerResponse}
 * @param filePath {string}
 * @param mimeType {string}
 */
export function serveStaticFile(res, filePath, mimeType = undefined)
{
    filePath = decodeURIComponent(filePath);
    if (
        filePath.toLowerCase().endsWith(".sf3") ||
        filePath.toLowerCase().endsWith(".sf2") ||
        filePath.toLowerCase().endsWith(".sfogg") ||
        filePath.toLowerCase().endsWith(".dls")
    )
    {
        filePath = path.join(path.dirname(filePath), "../soundfonts", path.basename(filePath));
        serveSfont(filePath, res).then();
        return;
        
    }
    let file;
    try
    {
        file = fs.readFileSync(filePath);
    }
    catch (e)
    {
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
    if (mimeType)
    {
        type = { "Content-Type": mimeType };
    }
    if (filePath.endsWith(".js"))
    {
        type = { "Content-Type": "text/javascript" };
    }
    res.writeHead(200, type);
    res.end(file);
}

/**
 * @param res {ServerResponse}
 * @returns {string}
 */
export function getVersion(res)
{
    const text = fs.readFileSync(packageJSON, "utf-8");
    const jason = JSON.parse(text);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(jason.version);
}