/**
 * unit_converter.js
 * purpose: converts soundfont units into more useable values with the use of lookup tables to improve performance
 */


// timecent lookup table
const MIN_TIMECENT = -15000;
const MAX_TIMECENT = 15000;
const timecentLookupTable = new Float32Array(MAX_TIMECENT - MIN_TIMECENT + 1);
for (let i = 0; i < timecentLookupTable.length; i++)
{
    const timecents = MIN_TIMECENT + i;
    timecentLookupTable[i] = Math.pow(2, timecents / 1200);
}

/**
 * Converts timecents to seconds
 * @param timecents {number} timecents
 * @returns {number} seconds
 */
export function timecentsToSeconds(timecents)
{
    if (timecents <= -32767)
    {
        return 0;
    }
    return timecentLookupTable[timecents - MIN_TIMECENT];
}

// abs cent lookup table
const MIN_ABS_CENT = -20000; // freqVibLfo
const MAX_ABS_CENT = 16500; // filterFc
const absoluteCentLookupTable = new Float32Array(MAX_ABS_CENT - MIN_ABS_CENT + 1);
for (let i = 0; i < absoluteCentLookupTable.length; i++)
{
    const absoluteCents = MIN_ABS_CENT + i;
    absoluteCentLookupTable[i] = 440 * Math.pow(2, (absoluteCents - 6900) / 1200);
}

/**
 * Converts absolute cents to hertz
 * @param cents {number} absolute cents
 * @returns {number} hertz
 */
export function absCentsToHz(cents)
{
    if (cents < MIN_ABS_CENT || cents > MAX_ABS_CENT)
    {
        return 440 * Math.pow(2, (cents - 6900) / 1200);
    }
    return absoluteCentLookupTable[~~(cents) - MIN_ABS_CENT];
}

// decibel lookup table (2 points of precision)
const MIN_DECIBELS = -1660;
const MAX_DECIBELS = 1600;
const decibelLookUpTable = new Float32Array((MAX_DECIBELS - MIN_DECIBELS) * 100 + 1);
for (let i = 0; i < decibelLookUpTable.length; i++)
{
    const decibels = (MIN_DECIBELS * 100 + i) / 100;
    decibelLookUpTable[i] = Math.pow(10, -decibels / 20);
}

/**
 * convers decibel attenuation to gain
 * @param decibels {number} the decibel attenuation
 * @returns {number} gain
 */
export function decibelAttenuationToGain(decibels)
{
    return decibelLookUpTable[Math.floor((decibels - MIN_DECIBELS) * 100)];
}