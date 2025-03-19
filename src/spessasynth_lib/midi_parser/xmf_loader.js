import { readBytesAsString } from "../utils/byte_functions/string.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo } from "../utils/loggin.js";
import { arrayToHexString, consoleColors } from "../utils/other.js";
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

/**
 * @enum {number}
 */
const referenceTypeIds = {
    inLineResource: 1,
    inFileResource: 2,
    inFileNode: 3,
    externalFile: 4,
    externalXMF: 5,
    XMFFileURIandNodeID: 6
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
     * @type {XMFNode[]}
     */
    innerNodes = [];
    
    /**
     * @param binaryData {IndexedByteArray}
     */
    constructor(binaryData)
    {
        let nodeStartIndex = binaryData.currentIndex;
        this.length = readVariableLengthQuantity(binaryData);
        this.itemCount = readVariableLengthQuantity(binaryData);
        console.log("node length", this.length, "child count", this.itemCount);
        // header length
        const headerLength = readVariableLengthQuantity(binaryData);
        const readBytes = binaryData.currentIndex - nodeStartIndex;
        
        const remainingHeader = headerLength - readBytes;
        const headerData = binaryData.slice(
            binaryData.currentIndex,
            binaryData.currentIndex + remainingHeader
        );
        binaryData.currentIndex += remainingHeader;
        const dataLength = this.length - headerLength;
        
        this.metadataLength = readVariableLengthQuantity(headerData);
        
        const metadataChunk = headerData.slice(
            headerData.currentIndex,
            headerData.currentIndex + this.metadataLength
        );
        headerData.currentIndex += this.metadataLength;
        console.log("meta length", this.metadataLength);
        
        /**
         * @type {metadataTypes|string|number}
         */
        let fieldSpecifier;
        let key;
        while (metadataChunk.currentIndex < metadataChunk.length)
        {
            console.log(
                "meta",
                arrayToHexString(metadataChunk.slice(metadataChunk.currentIndex))
            );
            const firstSpecifierByte = metadataChunk[metadataChunk.currentIndex];
            if (firstSpecifierByte === 0)
            {
                metadataChunk.currentIndex++;
                fieldSpecifier = readVariableLengthQuantity(metadataChunk);
                if (Object.values(metadataTypes).indexOf(fieldSpecifier) === -1)
                {
                    throw new Error(`Unknown field specifier: ${fieldSpecifier}`);
                }
                key = Object.keys(metadataTypes).find(k => metadataTypes[k] === fieldSpecifier);
            }
            else
            {
                // this is the length of string
                const stringLength = readVariableLengthQuantity(metadataChunk);
                fieldSpecifier = readBytesAsString(metadataChunk, stringLength);
                console.log(`string specifier: "${fieldSpecifier}"`);
                key = fieldSpecifier;
            }
            
            const numberOfVersions = readVariableLengthQuantity(metadataChunk);
            if (numberOfVersions === 0)
            {
                const dataLength = readVariableLengthQuantity(metadataChunk);
                const contentsChunk = metadataChunk.slice(
                    metadataChunk.currentIndex,
                    metadataChunk.currentIndex + dataLength
                );
                metadataChunk.currentIndex += dataLength;
                const formatID = readVariableLengthQuantity(contentsChunk);
                // text only
                if (formatID < 4)
                {
                    const obj = {};
                    obj[key] = readBytesAsString(contentsChunk, dataLength);
                    this.metadata.push(obj);
                }
                else
                {
                    const obj = {};
                    obj[key] = contentsChunk;
                    this.metadata.push(obj);
                }
                console.log(this.metadata);
            }
            else
            {
                // throw new Error ("International content is not supported.");
                // Skip the number of versions
                console.warn(`International content: ${numberOfVersions}`);
                // Length in bytes.
                // Skip the whole thing!
                metadataChunk.currentIndex += readVariableLengthQuantity(metadataChunk);
            }
        }
        
        
        const unpackersLength = readVariableLengthQuantity(headerData);
        headerData.currentIndex += unpackersLength;
        if (unpackersLength > 0)
        {
            console.warn(`packed content: ${unpackersLength}`);
            throw new Error("XMF contains packed content.");
        }
        
        /**
         * @type {referenceTypeIds|number}
         */
        this.referenceTypeID = readVariableLengthQuantity(binaryData);
        this.nodeData = binaryData.slice(binaryData.currentIndex, binaryData.currentIndex + dataLength);
        binaryData.currentIndex += dataLength;
        switch (this.referenceTypeID)
        {
            case referenceTypeIds.inLineResource:
                break;
            
            case referenceTypeIds.externalXMF:
            case referenceTypeIds.inFileNode:
            case referenceTypeIds.XMFFileURIandNodeID:
            case referenceTypeIds.externalFile:
            case referenceTypeIds.inFileResource:
                throw new Error(`Unsupported reference type: ${this.referenceTypeID}`);
            
            default:
                throw new Error(`Unknown reference type: ${this.referenceTypeID}`);
        }
        
        // read the data
        console.log(arrayToHexString(this.nodeData));
        if (this.itemCount > 0)
        {
            // folder node
            console.log("folder node", this.length, this.itemCount);
            while (this.nodeData.currentIndex < this.nodeData.length)
            {
                this.innerNodes.push(new XMFNode(this.nodeData));
            }
        }
        
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