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