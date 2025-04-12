/**
 * lfo.js
 * purpose: low frequency triangel oscillator
 */

/**
 * Calculates a triangular wave value for the given time
 * @param startTime {number} seconds
 * @param frequency {number} Hz
 * @param currentTime {number} seconds
 * @return {number} the value from -1 to 1
 */
export function getLFOValue(startTime, frequency, currentTime)
{
    if (currentTime < startTime)
    {
        return 0;
    }
    
    const xVal = (currentTime - startTime) / (1 / frequency) + 0.25;
    // offset by -0.25, otherwise we start at -1 and can have unexpected jump in pitch or low-pass
    // (happened with Synth Strings 2)
    
    // triangle, not sine
    return Math.abs(xVal - (~~(xVal + 0.5))) * 4 - 1;
}
