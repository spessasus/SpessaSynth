import fs from 'fs';
import path from 'path';

const copyFile = (src, destFile) => {
    fs.copyFile(src, destFile, (err) => {
        if (err) {
            console.error(`Error copying file: ${err.message}`);
        } else {
            console.log(`File copied to: ${destFile}`, performance.now());
        }
    });
}

function copyToFileOrDir(src, dest) {
    const destFile = path.extname(dest) ? dest : path.join(dest, path.basename(src));
    const destDir = path.dirname(destFile);
    fs.stat(destDir, (err, stats) => {
        if (!err) {
            copyFile(src, destFile);
            return;
        }
        if (err.code === 'ENOENT') {
            fs.mkdir(destDir, { recursive: true }, (err) => {
                if (err) {
                    console.error(`Error creating directory: ${err.message}`);
                } else {
                    copyFile(src, destFile);
                }
            })
        } else {
            console.error(`Error checking directory: ${err.message}`);
        }
    });
}

const findValidArrItem = (arr, i) => {
    if (arr[i]) {
        return arr[i];
    }
    if (i > 0) {
        return findValidArrItem(arr, i - 1);
    }
}

const config = (from, to) => {
    return from.map((file, index) => {
        return {
            from: file,
            to: findValidArrItem(to, index),
        };
    });
}

export const copyFiles = (from, to) => {
    const files = config(from, to);
    files.forEach(({ from, to }) => {
        copyToFileOrDir(from, to);
    });
}

export const copyFilesPlugin = ({ from, to }) => ({
    name: 'copy-files-plugin',
    setup(build) {
        build.onDispose(async () => {
            copyFiles(from, to);
        });
    },
});
