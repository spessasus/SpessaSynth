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