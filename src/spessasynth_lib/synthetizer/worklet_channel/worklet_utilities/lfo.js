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

    const timeElapsed = currentTime - startTime;
    const angularFrequency = 2 * Math.PI * frequency;
    return Math.sin(angularFrequency * timeElapsed);
}
