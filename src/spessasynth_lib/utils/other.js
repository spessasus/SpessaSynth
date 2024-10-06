/**
 * other.js
 * purpose: contains some useful functions that don't belong in any specific category
 */

/**
 * Formats the given seconds to nice readable time
 * @param totalSeconds {number} time in seconds
 * @return {{seconds: number, minutes: number, time: string}}
 */
export function formatTime(totalSeconds) {
    totalSeconds = Math.floor(totalSeconds);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.round(totalSeconds - (minutes * 60));
    return {"minutes": minutes, "seconds": seconds, "time": `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
}

/**
 * @param fileName {string}
 * @returns {string}
 */
export function formatTitle(fileName)
{
    return fileName
        .trim()
        .replaceAll(".mid", "")
        .replaceAll(".rmi", "")
        .replaceAll("_", " ");
}

/**
 * Does what it says
 * @param arr {number[]}
 * @returns {string}
 */
export function arrayToHexString(arr) {
    let hexString = '';

    for (let i = 0; i < arr.length; i++) {
        const hex = arr[i].toString(16).padStart(2, '0').toUpperCase();
        hexString += hex;
        hexString += ' ';
    }

    return hexString;
}

export const consoleColors = {
    warn: "color: orange;",
    unrecognized: "color: red;",
    info: "color: aqua;",
    recognized: "color: lime",
    value: "color: yellow; background-color: black;"
}