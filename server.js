import open from "open";
import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 81;
const HOST = "localhost";

app.use(express.static("src"));
app.use(express.static("soundfonts"));

app.get("/soundfonts", (req, res) => {
    const fileNames = fs.readdirSync("soundfonts");

    const files = fileNames.map(file => {
        const stats = fs.statSync(path.join("soundfonts", file));
        return {
            name: file,
            size: stats.size
        };
    });

    // Sort the files by size
    files.sort((a, b) => a.size - b.size);

    res.contentType("application/json");
    res.send(JSON.stringify(files));
})

app.listen(PORT,  HOST, undefined, () =>{
    let url = `http://${HOST}:${PORT}`;
    open(url, {app: {name: 'chrome'}}).then(() => {
        console.log(`Running on ${url}. A browser window should open.`);
    });
})