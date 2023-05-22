import open from "open";
import express from "express";

const app = express();
const PORT = 81;
const HOST = "localhost";

app.use(express.static("src"));
app.use(express.static("soundfonts"));

app.listen(PORT,  HOST, undefined, () =>{
    let url = `http://${HOST}:${PORT}`;
    open(url).then(() => {
        console.log(`Running on ${url}. A browser window should open.`);
    });
})