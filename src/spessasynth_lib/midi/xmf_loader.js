import { readBytesAsString } from "../utils/byte_functions/string.js";
import { SpessaSynthGroup, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthWarn } from "../utils/loggin.js";
import { consoleColors } from "../utils/other.js";
import { readBytesAsUintBigEndian } from "../utils/byte_functions/big_endian.js";
import { readVariableLengthQuantity } from "../utils/byte_functions/variable_length_quantity.js";
import { RMIDINFOChunks } from "./midi_tools/rmidi_writer.js";
import { inflateSync } from "../externals/fflate/fflate.min.js";
import { IndexedByteArray } from "../utils/indexed_array.js";

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
    comment: 10,
    autoStart: 11,                 // Node Name of the FileNode containing the SMF image to autostart when the XMF file loads
    preload: 12,                   // Used to preload specific SMF and DLS file images.
    contentDescription: 13,        // RP-42a (https://amei.or.jp/midistandardcommittee/Recommended_Practice/e/rp42.pdf)
    ID3Metadata: 14                // RP-47 (https://amei.or.jp/midistandardcommittee/Recommended_Practice/e/rp47.pdf)
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

/**
 * @enum {number}
 */
const resourceFormatIDs = {
    StandardMIDIFile: 0,
    StandardMIDIFileType1: 1,
    DLS1: 2,
    DLS2: 3,
    DLS22: 4,
    mobileDLS: 5
};

/**
 * @enum {number}
 */
const formatTypeIDs = {
    standard: 0,
    MMA: 1,
    registered: 2,
    nonRegistered: 3
};


/**
 * @enum {number}
 */
const unpackerIDs = {
    none: 0,
    MMAUnpacker: 1,
    registered: 2,
    nonRegistered: 3
};

class XMFNode
{
    /**
     * @type {number}
     */
    length;
    /**
     * 0 means it's a file node
     * @type {number}
     */
    itemCount;
    /**
     * @type {number}
     */
    metadataLength;
    
    /**
     * @type {Object<string, any>}
     */
    metadata = {};
    
    /**
     * @type {IndexedByteArray}
     */
    nodeData;
    
    /**
     * @type {XMFNode[]}
     */
    innerNodes = [];
    
    packedContent = false;
    
    nodeUnpackers = [];
    
    
    /**
     * @type {"StandardMIDIFile"|
     * "StandardMIDIFileType1"|
     * "DLS1"|
     * "DLS2"|
     * "DLS22"|
     * "mobileDLS"|
     * "unknown"|"folder"}
     */
    resourceFormat = "unknown";
    
    /**
     * @param binaryData {IndexedByteArray}
     */
    constructor(binaryData)
    {
        let nodeStartIndex = binaryData.currentIndex;
        this.length = readVariableLengthQuantity(binaryData);
        this.itemCount = readVariableLengthQuantity(binaryData);
        // header length
        const headerLength = readVariableLengthQuantity(binaryData);
        const readBytes = binaryData.currentIndex - nodeStartIndex;
        
        const remainingHeader = headerLength - readBytes;
        const headerData = binaryData.slice(
            binaryData.currentIndex,
            binaryData.currentIndex + remainingHeader
        );
        binaryData.currentIndex += remainingHeader;
        
        this.metadataLength = readVariableLengthQuantity(headerData);
        
        const metadataChunk = headerData.slice(
            headerData.currentIndex,
            headerData.currentIndex + this.metadataLength
        );
        headerData.currentIndex += this.metadataLength;
        
        /**
         * @type {metadataTypes|string|number}
         */
        let fieldSpecifier;
        let key;
        while (metadataChunk.currentIndex < metadataChunk.length)
        {
            const firstSpecifierByte = metadataChunk[metadataChunk.currentIndex];
            if (firstSpecifierByte === 0)
            {
                metadataChunk.currentIndex++;
                fieldSpecifier = readVariableLengthQuantity(metadataChunk);
                if (Object.values(metadataTypes).indexOf(fieldSpecifier) === -1)
                {
                    SpessaSynthWarn(`Unknown field specifier: ${fieldSpecifier}`);
                    key = `unknown_${fieldSpecifier}`;
                }
                else
                {
                    key = Object.keys(metadataTypes).find(k => metadataTypes[k] === fieldSpecifier);
                }
            }
            else
            {
                // this is the length of string
                const stringLength = readVariableLengthQuantity(metadataChunk);
                fieldSpecifier = readBytesAsString(metadataChunk, stringLength);
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
                    this.metadata[key] = readBytesAsString(contentsChunk, dataLength - 1);
                }
                else
                {
                    this.metadata[key] = contentsChunk.slice(contentsChunk.currentIndex);
                }
            }
            else
            {
                // throw new Error ("International content is not supported.");
                // Skip the number of versions
                SpessaSynthWarn(`International content: ${numberOfVersions}`);
                // Length in bytes
                // Skip the whole thing!
                metadataChunk.currentIndex += readVariableLengthQuantity(metadataChunk);
            }
        }
        
        const unpackersStart = headerData.currentIndex;
        const unpackersLength = readVariableLengthQuantity(headerData);
        const unpackersData = headerData.slice(headerData.currentIndex, unpackersStart + unpackersLength);
        headerData.currentIndex = unpackersStart + unpackersLength;
        if (unpackersLength > 0)
        {
            this.packedContent = true;
            while (unpackersData.currentIndex < unpackersLength)
            {
                const unpacker = {};
                unpacker.id = readVariableLengthQuantity(unpackersData);
                switch (unpacker.id)
                {
                    case unpackerIDs.nonRegistered:
                    case unpackerIDs.registered:
                        SpessaSynthGroupEnd();
                        throw new Error(`Unsupported unpacker ID: ${unpacker.id}`);
                    
                    default:
                        SpessaSynthGroupEnd();
                        throw new Error(`Unknown unpacker ID: ${unpacker.id}`);
                    
                    case unpackerIDs.none:
                        unpacker.standardID = readVariableLengthQuantity(unpackersData);
                        break;
                    
                    case unpackerIDs.MMAUnpacker:
                        let manufacturerID = unpackersData[unpackersData.currentIndex++];
                        // one or three byte form, depending on if the first byte is zero
                        if (manufacturerID === 0)
                        {
                            manufacturerID <<= 8;
                            manufacturerID |= unpackersData[unpackersData.currentIndex++];
                            manufacturerID <<= 8;
                            manufacturerID |= unpackersData[unpackersData.currentIndex++];
                        }
                        const manufacturerInternalID = readVariableLengthQuantity(unpackersData);
                        unpacker.manufacturerID = manufacturerID;
                        unpacker.manufacturerInternalID = manufacturerInternalID;
                        break;
                }
                unpacker.decodedSize = readVariableLengthQuantity(unpackersData);
                this.nodeUnpackers.push(unpacker);
            }
        }
        binaryData.currentIndex = nodeStartIndex + headerLength;
        /**
         * @type {referenceTypeIds|number}
         */
        this.referenceTypeID = readVariableLengthQuantity(binaryData);
        this.nodeData = binaryData.slice(binaryData.currentIndex, nodeStartIndex + this.length);
        binaryData.currentIndex = nodeStartIndex + this.length;
        switch (this.referenceTypeID)
        {
            case referenceTypeIds.inLineResource:
                break;
            
            case referenceTypeIds.externalXMF:
            case referenceTypeIds.inFileNode:
            case referenceTypeIds.XMFFileURIandNodeID:
            case referenceTypeIds.externalFile:
            case referenceTypeIds.inFileResource:
                SpessaSynthGroupEnd();
                throw new Error(`Unsupported reference type: ${this.referenceTypeID}`);
            
            default:
                SpessaSynthGroupEnd();
                throw new Error(`Unknown reference type: ${this.referenceTypeID}`);
        }
        
        // read the data
        if (this.isFile)
        {
            if (this.packedContent)
            {
                const compressed = this.nodeData.slice(2, this.nodeData.length);
                SpessaSynthInfo(
                    `%cPacked content. Attemting to deflate. Target size: %c${this.nodeUnpackers[0].decodedSize}`,
                    consoleColors.warn,
                    consoleColors.value
                );
                try
                {
                    this.nodeData = new IndexedByteArray(inflateSync(compressed).buffer);
                }
                catch (e)
                {
                    SpessaSynthGroupEnd();
                    throw new Error(`Error unpacking XMF file contents: ${e.message}.`);
                }
            }
            /**
             * interpret the content
             * @type {number[]}
             */
            const resourceFormat = this.metadata["resourceFormat"];
            if (resourceFormat === undefined)
            {
                SpessaSynthWarn("No resource format for this file node!");
            }
            else
            {
                const formatTypeID = resourceFormat[0];
                if (formatTypeID !== formatTypeIDs.standard)
                {
                    SpessaSynthWarn(`Non-standard formatTypeID: ${resourceFormat}`);
                    this.resourceFormat = resourceFormat.toString();
                }
                const resourceFormatID = resourceFormat[1];
                if (Object.values(resourceFormatIDs).indexOf(resourceFormatID) === -1)
                {
                    SpessaSynthWarn(`Unrecognized resource format: ${resourceFormatID}`);
                }
                else
                {
                    this.resourceFormat = Object.keys(resourceFormatIDs)
                        .find(k => resourceFormatIDs[k] === resourceFormatID);
                }
            }
        }
        else
        {
            // folder node
            this.resourceFormat = "folder";
            while (this.nodeData.currentIndex < this.nodeData.length)
            {
                const nodeStartIndex = this.nodeData.currentIndex;
                const nodeLength = readVariableLengthQuantity(this.nodeData);
                const nodeData = this.nodeData.slice(nodeStartIndex, nodeStartIndex + nodeLength);
                this.nodeData.currentIndex = nodeStartIndex + nodeLength;
                this.innerNodes.push(new XMFNode(nodeData));
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
    midi.bankOffset = 0;
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
    /**
     * @type {IndexedByteArray}
     */
    let midiArray;
    /**
     * find the stuff we care about
     * @param node {XMFNode}
     */
    const searchNode = node =>
    {
        const checkMeta = (xmf, rmid) =>
        {
            if (node.metadata[xmf] !== undefined && typeof node.metadata[xmf] === "string")
            {
                midi.RMIDInfo[rmid] = node.metadata[xmf];
            }
        };
        // meta
        checkMeta("nodeName", RMIDINFOChunks.name);
        checkMeta("title", RMIDINFOChunks.name);
        checkMeta("copyrightNotice", RMIDINFOChunks.copyright);
        checkMeta("comment", RMIDINFOChunks.comment);
        if (node.isFile)
        {
            switch (node.resourceFormat)
            {
                default:
                    return;
                case "DLS1":
                case "DLS2":
                case "DLS22":
                case "mobileDLS":
                    SpessaSynthInfo("%cFound embedded DLS!", consoleColors.recognized);
                    midi.embeddedSoundFont = node.nodeData.buffer;
                    break;
                
                case "StandardMIDIFile":
                case "StandardMIDIFileType1":
                    SpessaSynthInfo("%cFound embedded MIDI!", consoleColors.recognized);
                    midiArray = node.nodeData;
                    break;
            }
        }
        else
        {
            for (const n of node.innerNodes)
            {
                searchNode(n);
            }
        }
    };
    searchNode(rootNode);
    SpessaSynthGroupEnd();
    return midiArray;
}