import {signedInt16, readByte, readBytesAsUintLittleEndian} from "../../utils/byte_functions.js";
import {generators} from "./generators.js";


export class Modulator{
    /**
     * Creates a modulator
     * @param dataArray {ShiftableUint8Array}
     */
    constructor(dataArray) {
        this.modulatorSource = readBytesAsUintLittleEndian(dataArray, 2);
        this.modulatorDestination = generators[readBytesAsUintLittleEndian(dataArray, 2)];
        this.modulationAmount = signedInt16(readByte(dataArray), readByte(dataArray));
        this.modulationDegree = readBytesAsUintLittleEndian(dataArray, 2);
        this.transformType = readBytesAsUintLittleEndian(dataArray, 2);
    }
}

/**
 * Reads the modulator chunk
 * @param modulatorChunk {RiffChunk}
 * @returns {Modulator[]}
 */
export function readModulators(modulatorChunk)
{
    let gens = [];
    while(modulatorChunk.chunkData.length > modulatorChunk.chunkData.currentIndex)
    {
        gens.push(new Modulator(modulatorChunk.chunkData));
    }
    return gens;
}