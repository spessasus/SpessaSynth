import { workerMessageType, WorkerSoundfontManagerMessageType } from "../worker_thread/worker_message.js";

export class SoundfontManager
{
    /**
     * Creates a new instance of the soundfont manager
     * @param synth {CustomSynth}
     */
    constructor(synth)
    {
        /**
         * The current list of soundfonts, in order from the most important to the least.
         * @type {{
         *     id: string,
         *     bankOffset: number
         * }[]}
         */
        this.soundfontList = [{
            id: "main",
            bankOffset: 0
        }];
        
        /**
         * @type {Worker}
         * @private
         */
        this._port = synth.worker;
        this.synth = synth;
    }
    
    /**
     * @private
     * @param type {WorkerSoundfontManagerMessageType}
     * @param data {any}
     * @param transferable {ArrayBuffer[]}
     */
    _sendToWorker(type, data, transferable)
    {
        this._port.postMessage({
            messageType: workerMessageType.soundFontManager,
            messageData: [
                type,
                data
            ]
        }, transferable);
    }
    
    /**
     * Adds a new soundfont buffer with a given ID
     * @param soundfontBuffer {ArrayBuffer} - the soundfont's buffer
     * @param id {string} - the soundfont's unique identifier
     * @param bankOffset {number} - the soundfont's bank offset. Default is 0
     */
    async addNewSoundFont(soundfontBuffer, id, bankOffset = 0)
    {
        this._sendToWorker(
            WorkerSoundfontManagerMessageType.addNewSoundFont,
            [soundfontBuffer, id, bankOffset],
            [soundfontBuffer]
        );
        await new Promise(r => this.synth._resolveWhenReady = r);
        if (this.soundfontList.find(s => s.id === id) !== undefined)
        {
            this.soundfontList.find(s => s.id === id).bankOffset = bankOffset;
        }
        else
        {
            this.soundfontList.push({
                id: id,
                bankOffset: bankOffset
            });
        }
    }
}