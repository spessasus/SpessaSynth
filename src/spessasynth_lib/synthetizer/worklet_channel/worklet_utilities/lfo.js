/**
 * @param startTime {number} seconds
 * @param frequency {number} Hz
 * @param currentTime {number} seconds
 * @return {number} the value from -1 to 1
 */
export function getLFOValue(startTime, frequency, currentTime) {
    if (currentTime < startTime) {
        return 0;
    }

    const xVal = (currentTime - startTime) / (1 / frequency);

    // triangle, not sine
    return Math.abs(xVal - ~~(xVal + 0.5)) * 4 - 1;
}
