import child_process from 'node:child_process'

export function openURL(url)
{
    switch (process.platform) {
        case 'linux':
            child_process.exec(`xdg-open ${url}`);
            break;
        case 'win32':
            child_process.exec(`explorer "${url}"`);
            break;
        case 'darwin':
            child_process.exec(`open "${url}"`);
            break;
        default:
            console.log('Could not open the browser. Open the link below:');
            console.log(url);
    }
}