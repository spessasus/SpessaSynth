import { readBytesAsString } from "../utils/byte_functions/string.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from "../utils/loggin.js";
import { consoleColors } from "../utils/other.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";
import { readVariableLengthQuantity } from "../utils/byte_functions/variable_length_quantity.js";

/**
 * @enum {number}
 */
const metadataTypes = {
    XMFFileType: 0,
    nodeName: 1,
    nodeIDNumber: 2,
    resourceFormat: 3,
    filenameOnDisk: 4,
    filenameExtensionOnDisk: 5,
    macOSFileTypeAndCreator: 6,
    mimeType: 7,
    title: 8,
    copyrightNotice: 9,
    comment: 10
};

class XMFNode
{
    length = 0;
    /**
     * 0 means it's a file node
     * @type {number}
     */
    itemCount = 0;
    metadataLength = 0;
    
    /**
     * @type {Object<string, any>[]}
     */
    metadata = [];
    
    /**
     * @type {IndexedByteArray}
     */
    nodeData;
    
    /**
     * @param binaryData {IndexedByteArray}
     */
    constructor(binaryData)
    {
        this.length = readVariableLengthQuantity(binaryData);
        this.itemCount = readVariableLengthQuantity(binaryData);
        // header length
        const headerLength = readVariableLengthQuantity(binaryData);
        const headerData = binaryData.slice(binaryData.currentIndex, binaryData.currentIndex + headerLength);
        binaryData.currentIndex += headerLength;
        this.metadataLength = readVariableLengthQuantity(headerData);
        const metadataChunk = headerData.slice(headerData.currentIndex, headerData.currentIndex + this.metadataLength);
        headerData.currentIndex += this.metadataLength;
        /**
         * @type {metadataTypes|string|number}
         */
        let fieldSpecifier;
        while (metadataChunk.currentIndex < metadataChunk.length)
        {
            const firstSpecifierByte = metadataChunk.currentIndex;
            if (firstSpecifierByte === 0)
            {
                metadataChunk.currentIndex++;
                fieldSpecifier = readVariableLengthQuantity(metadataChunk);
            }
            else
            {
                // this is the length of string
                fieldSpecifier = readBytesAsString(metadataChunk, firstSpecifierByte);
            }
            
            const numberOfVersions = readVariableLengthQuantity(metadataChunk);
            if (numberOfVersions === 0)
            {
                const dataLength = readVariableLengthQuantity(metadataChunk);
                const formatID = readVariableLengthQuantity(metadataChunk);
                const data = metadataChunk.slice(metadataChunk.currentIndex, metadataChunk.currentIndex + dataLength);
                metadataChunk.currentIndex += dataLength;
                // text only
                if (formatID < 4)
                {
                    const obj = {};
                    obj[fieldSpecifier] = readBytesAsString(data, dataLength);
                    this.metadata.push(obj);
                }
                else
                {
                    const obj = {};
                    obj[fieldSpecifier] = data;
                    this.metadata.push(obj);
                }
            }
            else
            {
                // skip number of versions
                readVariableLengthQuantity(metadataChunk);
                // Length in bytes. Skip the whole thing!
                metadataChunk.currentIndex += readVariableLengthQuantity(metadataChunk);
            }
        }
        
        const unpackersLength = readVariableLengthQuantity(headerData);
        headerData.currentIndex += unpackersLength;
        if (unpackersLength > 0)
        {
            throw new Error("XMF contains packed content.");
        }
        
        this.referenceTypeID = readVariableLengthQuantity(binaryData);
        const dataLength = this.length - binaryData.currentIndex;
        console.log(dataLength, binaryData.currentIndex);
        this.nodeData = binaryData.slice(binaryData.currentIndex, binaryData.currentIndex + dataLength);
        binaryData.currentIndex += dataLength;
        console.log(this);
        
    }
    
    get isFile()
    {
        return this.itemCount === 0;
    }
}

/**
 * @param midi {MIDI}
 * @param binaryData {IndexedByteArray}
 * @returns {IndexedByteArray} the file byte array
 */
export function loadXMF(midi, binaryData)
{
    // https://amei.or.jp/midistandardcommittee/Recommended_Practice/e/xmf-v1a.pdf
    // https://wiki.multimedia.cx/index.php?title=Extensible_Music_Format_(XMF)
    const sanityCheck = readBytesAsString(binaryData, 4);
    if (sanityCheck !== "XMF_")
    {
        SpessaSynthGroupEnd();
        throw new SyntaxError(`Invalid XMF Header! Expected "_XMF", got "${sanityCheck}"`);
    }
    
    SpessaSynthGroup("%cParsing XMF file...", consoleColors.info);
    const version = readBytesAsString(binaryData, 4);
    SpessaSynthInfo(
        `%cXMF version: %c${version}`,
        consoleColors.info, consoleColors.recognized
    );
    // https://amei.or.jp/midistandardcommittee/Recommended_Practice/e/rp43.pdf
    // version 2.00 has additional bytes
    if (version === "2.00")
    {
        const fileTypeId = readBytesAsUintBigEndian(binaryData, 4);
        const fileTypeRevisionId = readBytesAsUintBigEndian(binaryData, 4);
        SpessaSynthInfo(
            `%cFile Type ID: %c${fileTypeId}%c, File Type Revision ID: %c${fileTypeRevisionId}`,
            consoleColors.info,
            consoleColors.recognized,
            consoleColors.info,
            consoleColors.recognized
        );
    }
    
    // file length
    readVariableLengthQuantity(binaryData);
    
    const metadataTableLength = readVariableLengthQuantity(binaryData);
    // skip metadata
    binaryData.currentIndex += metadataTableLength;
    
    // skip to tree root
    binaryData.currentIndex = readVariableLengthQuantity(binaryData);
    const rootNode = new XMFNode(binaryData);
    console.log(rootNode);
    SpessaSynthGroupEnd();
}