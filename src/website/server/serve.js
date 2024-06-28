import fs from 'fs';
import path from 'path'
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
 * @param filePath {string}
 * @param mimeType {string}
 */
export function serveStaticFile(res, filePath, mimeType=undefined)
{
    filePath = decodeURIComponent(filePath);
    if(filePath.endsWith(".sf3") || filePath.endsWith(".sf2"))
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