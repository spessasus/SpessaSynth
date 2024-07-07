import fs from 'fs';
import path from 'path'
import { configPath, soundfontsPath } from './server.js'
/**
 * @param res {ServerResponse}
 * @param path {string}
 */
export async function serveSfont(path, res)
{
    const fileStream = fs.createReadStream(path);

    const size = fs.statSync(path).size;

    fileStream.on('error', (error) => {
        if (error.code === 'ENOENT')
        {
            res.writeHead(404);
            res.end('Soundfont not found');
        }
        else
        {
            res.writeHead(500);
            res.end('Internal server error');
        }
    });

    fileStream.once('open', () => {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', size);
        fileStream.pipe(res);
    });
    fileStream.on("end", () => {
        fileStream.close();
        res.end();
    })
}

/**
 * @param res {ServerResponse}
 */
export function serveSfontList(res)
{
    const fileNames = fs.readdirSync(soundfontsPath).filter(fName => {
        return fName.slice(-3).toLowerCase() === 'sf2' || fName.slice(-3).toLowerCase() === 'sf3';
    });

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config['lastUsedSf2'])
    {
        if (fileNames.includes(config['lastUsedSf2']))
        {
            fileNames.splice(fileNames.indexOf(config['lastUsedSf2']), 1);
            fileNames.unshift(config['lastUsedSf2']);
        }
    }
    else
    {
        config['lastUsedSf2'] = fileNames[0];
    }

    const files = fileNames.map(file => {
        return { name: file };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(files));
}

/**
 * @param res {ServerResponse}
 */
export function serveSettings(res)
{
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config.settings || {}));
}

/**
 * @param res {ServerResponse}
 * @param filePath {string}
 * @param mimeType {string}
 */
export function serveStaticFile(res, filePath, mimeType=undefined)
{
    filePath = decodeURIComponent(filePath);
    if(filePath.toLowerCase().endsWith(".sf3") || filePath.toLowerCase().endsWith(".sf2"))
    {
        filePath = path.join(path.dirname(filePath), "../soundfonts", path.basename(filePath));
        serveSfont(filePath, res).then();
        return;

    }
    const file = fs.readFileSync(filePath);
    let type = {};
    if(mimeType)
    {
        type = { 'Content-Type': mimeType}
    }
    if(filePath.endsWith(".js"))
    {
        type = { 'Content-Type': 'text/javascript'}
    }
    res.writeHead(200, type);
    res.end(file);
}