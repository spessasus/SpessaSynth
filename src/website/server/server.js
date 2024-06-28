import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { serveStaticFile } from './serve.js'
import { openURL } from './open.js'

const PORT = 8181;
const HOST = '0.0.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.join(path.dirname(__filename), "../../");

const configPath = path.join(__dirname, '/website/server/config.json');
const soundfontsPath = path.join(__dirname, '../soundfonts');

fs.writeFile(configPath, '{}', { flag: 'wx' }, () => {});


const server = http.createServer((req, res) => {
    // main page
    if (req.method === 'GET' && req.url === '/')
    {
        serveStaticFile(res, path.join(__dirname, 'website/local_edition_index.html'), 'text/html');
    }
    // soundfont list
    else if (req.method === 'GET' && req.url.startsWith('/soundfonts'))
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
    // set last used soundfont
    else if (req.method === 'GET' && req.url.startsWith('/setlastsf2'))
    {
        const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        const sfname = urlParams.get('sfname');

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config['lastUsedSf2'] = sfname;

        fs.writeFile(configPath, JSON.stringify(config), { flag: 'w' }, () => {});
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Soundfont updated');
    }
    // save settings
    else if (req.method === 'POST' && req.url === '/savesettings')
    {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            const settings = JSON.parse(body);
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            config.settings = settings;

            fs.writeFile(configPath, JSON.stringify(config), { flag: 'w' }, () => {});
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Settings saved');
        });
    }
    // get settings
    else if (req.method === 'GET' && req.url === '/getsettings')
    {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(config.settings || {}));
    }
    // serve a static file
    else if (req.method === 'GET')
    {
        serveStaticFile(res, path.join(__dirname, req.url));
    }
    // no idea
    else
    {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
});

server.listen(PORT, HOST, () => {
    let url = `http://localhost:${PORT}`;

    console.log(`Running on ${url}. A browser window should open.`);
    openURL(url);
});
