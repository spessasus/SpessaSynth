/**
 * @param e {MIDIMessage}
 * @returns boolean
 */
export function isXGOn(e)
{
    return e.messageData[0] === 0x43 && // Yamaha
        e.messageData[2] === 0x4C &&    // XG ON
        e.messageData[5] === 0x7E &&
        e.messageData[6] === 0x00;
}

/**
 * @param e {MIDIMessage}
 * @returns boolean
 */
export function isGSDrumsOn(e)
{
    return e.messageData[0] === 0x41 &&     // roland
        e.messageData[2] === 0x42 &&        // GS
        e.messageData[3] === 0x12 &&        // GS
        e.messageData[4] === 0x40 &&        // system parameter
        (e.messageData[5] & 0x10) !== 0 &&  // part parameter
        e.messageData[6] === 0x15;          // drum pars
}

/**
 * @param e {MIDIMessage}
 * @returns boolean
 */
export function isGSOn(e)
{
    return e.messageData[0] === 0x41  // roland
        && e.messageData[2] === 0x42  // GS
        && e.messageData[6] === 0x7F; // Mode set
}

/**
 * @param e {MIDIMessage}
 * @returns boolean
 */
export function isGMOn(e)
{
    return e.messageData[0] === 0x7E  // non realtime
        && e.messageData[2] === 0x09  // gm system
        && e.messageData[3] === 0x01; // gm1
}

/**
 * @param e {MIDIMessage}
 * @returns boolean
 */
export function isGM2On(e)
{
    return e.messageData[0] === 0x7E  // non realtime
        && e.messageData[2] === 0x09  // gm system
        && e.messageData[3] === 0x03; // gm2
}