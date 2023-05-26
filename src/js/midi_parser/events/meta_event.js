/**
 * @typedef {"Sequence Number"|
 *          "Text Event"|
 *          "Copyright"|
 *          "Track Name"|
 *          "Instrument Name"|
 *          "Lyrics"|
 *          "Marker"|
 *          "Cue Point"|
 *          "Device Port"|
 *          "Channel Prefix"|
 *          "Midi Port"|
 *          "End Of Track"|
 *          "Set Tempo"|
 *          "SMPTE Offset"|
 *          "Time Signature"|
 *          "Key Signature"} MetaTypes
 */

/**
 *
 * @type {Object<string, MetaTypes>}
 */
const types =
    {
        // type name
        0x00: "Sequence Number",
        0x01: "Text Event",
        0x02: "Copyright",
        0x03: "Track Name",
        0x04: "Instrument Name",
        0x05: "Lyrics",
        0x06: "Marker",
        0x07: "Cue Point",
        0x09: "Device Port",
        0x20: "Channel Prefix", // midi channel prefix
        0x21: "Midi Port",
        0x2F: "End Of Track", // end of track
        0x51: "Set Tempo",
        0x54: "SMPTE Offset",
        0x58: "Time Signature",
        0x59: "Key Signature"
    };
export class MetaEvent
{
    /**
     * @param array {Array}
     * @param delta {number}
     */
    constructor(array, delta) {
        this.delta = delta;

        // skip the 0xFF
        array.shift();

        let type = array.shift()

        // look up the type
        if(types[type])
        {
            /**
             * @type {MetaTypes}
             */
            this.type = types[type];
        }
        else
        {
            throw "Unknown Meta Event type!";
        }

        // read the length and read all the bytes
        let metaLength = 0;
        while(array.length)
        {
            let byte = array.shift();
            // extract the first 7 bytes
            metaLength = (metaLength << 7) | (byte & 127);

            // if the last byte isn't 1, stop
            if((byte >> 7) !== 1)
            {
                break;
            }
        }

        this.data = [];
        for (let byte = 0; byte < metaLength; byte++) {
            this.data.push(array.shift());
        }
    }
}