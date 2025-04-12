// Tests were performed by John Novak
// https://github.com/dosbox-staging/dosbox-staging/pull/2705

/*
CC 5 value  Portamento time
----------  ---------------
     0          0.000 s
     1          0.006 s
     2          0.023 s
     4          0.050 s
     8          0.110 s
    16          0.250 s
    32          0.500 s
    64          2.060 s
    80          4.200 s
    96          8.400 s
   112         19.500 s
   116         26.700 s
   120         40.000 s
   124         80.000 s
   127        480.000 s
*/

const portamentoLookup = {
    0: 0.000,
    1: 0.006,
    2: 0.023,
    4: 0.050,
    8: 0.110,
    16: 0.250,
    32: 0.500,
    64: 2.060,
    80: 4.200,
    96: 8.400,
    112: 19.500,
    116: 26.700,
    120: 40.000,
    124: 80.000,
    127: 480.000
};

/**
 * @param value {number}
 * @returns {number}
 */
function getLookup(value)
{
    if (portamentoLookup[value] !== undefined)
    {
        return portamentoLookup[value];
    }
    // get the nearest lower and upper points from the lookup table
    let lower = null;
    let upper = null;
    
    for (let key of Object.keys(portamentoLookup))
    {
        key = parseInt(key);
        if (key < value && (lower === null || key > lower))
        {
            lower = key;
        }
        if (key > value && (upper === null || key < upper))
        {
            upper = key;
        }
    }
    
    // if we have found both lower and upper points, perform linear interpolation
    if (lower !== null && upper !== null)
    {
        let lowerTime = portamentoLookup[lower];
        let upperTime = portamentoLookup[upper];
        
        // linear interpolation
        return lowerTime + ((value - lower) * (upperTime - lowerTime)) / (upper - lower);
    }
    return 0;
}


/**
 * Converts portamento time to seconds
 * @param time {number} 0 - 127
 * @param distance {number} distance in keys
 * @returns {number} seconds
 */
export function portamentoTimeToSeconds(time, distance)
{
    // this seems to work fine for the MIDIs I have
    return getLookup(time) * (distance / 30);
}