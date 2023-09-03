
// timecent lookup table
const MIN_TIMECENT = -12000;
const MAX_TIMECENT = 8000;
const timecentLookupTable = new Float32Array(MAX_TIMECENT - MIN_TIMECENT);
for (let i = 0; i < timecentLookupTable.length; i++) {
    const timecents = MIN_TIMECENT + i;
    timecentLookupTable[i] = Math.pow(2, timecents / 1200);
}

export const HALF_PI = Math.PI / 2;

/**
 * @param timecents {number} timecents
 * @returns {number} seconds
 */
export function timecentsToSeconds(timecents)
{
    return timecentLookupTable[timecents - MIN_TIMECENT];
}

// abs cent lookup table
const MIN_ABS_CENT = -16000; // freqVibLfo
const MAX_ABS_CENT = 13500; // filterFc
const absoluteCentLookupTable = new Float32Array(MAX_ABS_CENT - MIN_ABS_CENT);
for (let i = 0; i < absoluteCentLookupTable.length; i++) {
    const absoluteCents = MIN_ABS_CENT + i;
    absoluteCentLookupTable[i] = 440 * Math.pow(2, (absoluteCents - 6900) / 1200);
}

/**
 * @param cents {number}
 * @returns {number} hertz
 */
export function absCentsToHz(cents)
{
    return absoluteCentLookupTable[cents - MIN_ABS_CENT];
}

// decibel lookup table (2 points of precision)
const MIN_DECIBELS = -10;
const MAX_DECIBELS = 144;
const decibelLookUpTable = new Float32Array((MAX_DECIBELS- MIN_DECIBELS) * 100);
for (let i = 0; i < decibelLookUpTable.length; i++) {
    const decibels = (MIN_DECIBELS * 100 + i) / 100;
    decibelLookUpTable[i] = Math.pow(10, -decibels / 20);
}


export function decibelAttenuationToGain(decibels)
{
    return decibelLookUpTable[Math.floor((decibels - MIN_DECIBELS) * 100)];
}