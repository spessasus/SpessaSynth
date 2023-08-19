/**
 * Formats the given seconds to nice readable time
 * @param totalSeconds {number} time in seconds
 * @return {{seconds: number, minutes: number, time: string}}
 */
export function formatTime(totalSeconds) {
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = Math.round(totalSeconds - (minutes * 60));
    return {"minutes": minutes, "seconds": seconds, "time": `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
}

/**
 * performs the given function on an rgb string and returns a new one
 * @param rgbString {string} the rgb string, ex. "rgb(255, 0, 00)"
 * @param operation {function(number): number} the function for calculation
 * @returns {string}
 */
export function calculateRGB(rgbString, operation)
{
    let rgbValues = rgbString.replace(/[^\d,]/g, '').split(',');
    return `rgb(${operation(parseInt(rgbValues[0]))}, ${operation(parseInt(rgbValues[1]))}, ${operation(parseInt(rgbValues[2]))})`;
}

/**
 * Does what it says
 * @param arr {ShiftableByteArray}
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

/**
 * @type {string[]}
 */
export const supportedEncodings = [
    "utf-8",
    "utf-16",
    "utf-16le",
    "utf-16be",
    "latin1",
    "ISO-8859-2",
    "ISO-8859-3",
    "ISO-8859-4",
    "ISO-8859-5",
    "ISO-8859-6",
    "ISO-8859-7",
    "ISO-8859-8",
    "ISO-8859-9",
    "ISO-8859-10",
    "ISO-8859-11",
    "ISO-8859-13",
    "ISO-8859-14",
    "ISO-8859-15",
    "ISO-8859-16",
    "windows-1250",
    "windows-1251",
    "windows-1252",
    "windows-1253",
    "windows-1254",
    "windows-1255",
    "windows-1256",
    "windows-1257",
    "windows-1258",
    "Shift_JIS",
    "EUC-JP",
    "ISO-2022-JP",
    "EUC-KR",
    "Big5",
    "GB18030",
];