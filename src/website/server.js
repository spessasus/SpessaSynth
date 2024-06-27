import open from 'open'
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express();
const PORT = 8181;
const HOST = "0.0.0.0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(express.static("src"));
app.use(express.static("soundfonts"));
app.use(express.json());

const configPath = path.join(__dirname, "config.json");
const soundfontsPath = path.join(__dirname, "../../soundfonts");

fs.writeFile(configPath, "{}", {flag: "wx"}, () => {});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "local_edition_index.html"));
})

app.get("/soundfonts", (req, res) => {
    const fileNames = fs.readdirSync(soundfontsPath).filter(fName => fName.slice(-3).toLowerCase() === "sf2" || fName.slice(-3).toLowerCase() === "sf3" );

    // check for last used soundfont
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    if(config['lastUsedSf2'])
    {
        if(fileNames.includes(config['lastUsedSf2']))
        {
            // make the last used soundfont appear first, so the js will load it first
            fileNames.splice(fileNames.indexOf(config['lastUsedSf2']), 1);
            fileNames.unshift(config['lastUsedSf2']);
        }
    }
    else
    {
        config['latUsedSf2'] = fileNames[0];
    }

    const files = fileNames.map(file => {
        return {
            name: file
        };
    });

    res.contentType("application/json");
    res.send(JSON.stringify(files));
})

app.get("/setlastsf2", (req) => {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    config["lastUsedSf2"] = req.query['sfname'];

    fs.writeFile(configPath, JSON.stringify(config), { flag: "w"}, () => {});
});

app.post("/savesettings", (req) => {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

    config.settings = req.body;

    fs.writeFile(configPath, JSON.stringify(config), { flag: "w"}, () => {});
})

app.get("/getsettings", (req, res) => {
    /**
     * @type {{
     *     lastUsedSf2: string,
     *     settings: SavedSettings
     * }}
     */
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    res.send(config.settings || {});
})

app.listen(PORT,  HOST, undefined, () =>{
    let url = `http://localhost:${PORT}`;
    open(url).then(() => {
        console.log(`Running on ${url}. A browser window should open.`);
    });
});