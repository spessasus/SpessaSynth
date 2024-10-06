import { workletMessageType } from './worklet_system/message_protocol/worklet_message.js'
import {
    WorkletSoundfontManagerMessageType
} from './worklet_system/worklet_methods/worklet_soundfont_manager/sfman_message.js'
import { SpessaSynthWarn } from '../utils/loggin.js'

export class SoundfontManager
{
    /**
     * Creates a new instance of the soundfont manager
     * @param synth {Synthetizer}
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
         * @type {MessagePort}
         * @private
         */
        this._port = synth.worklet.port;
        this.synth = synth;
    }

    /**
     * @private
     * @param type {WorkletSoundfontManagerMessageType}
     * @param data {any}
     */
    _sendToWorklet(type, data)
    {
        this._port.postMessage({
            messageType: workletMessageType.soundFontManager,
            messageData: [
                type,
                data
            ]
        });
    }

    /**
     * Adds a new soundfont buffer with a given ID
     * @param soundfontBuffer {ArrayBuffer} - the soundfont's buffer
     * @param id {string} - the soundfont's unique identifier
     * @param bankOffset {number} - the soundfont's bank offset. Default is 0
     */
    async addNewSoundFont(soundfontBuffer, id, bankOffset = 0)
    {
        if(this.soundfontList.find(s => s.id === id) !== undefined)
        {
            throw new Error("Cannot overwrite the existing soundfont. Use soundfontManager.delete(id) instead.");
        }
        this._sendToWorklet(WorkletSoundfontManagerMessageType.addNewSoundFont, [soundfontBuffer, id, bankOffset]);
        await new Promise(r => this.synth.resolveWhenReady = r);
        this.soundfontList.push({
            id: id,
            bankOffset: bankOffset
        });
    }

    /**
     * Deletes a soundfont with the given ID
     * @param id {string} - the soundfont to delete
     */
    deleteSoundFont(id)
    {
        if(this.soundfontList.length === 0)
        {
            SpessaSynthWarn("1 soundfont left. Aborting!");
            return;
        }
        if(this.soundfontList.findIndex(s => s.id === id) === -1)
        {
            SpessaSynthWarn(`No soundfont with id of "${id}" found. Aborting!`);
            return;
        }
        this._sendToWorklet(WorkletSoundfontManagerMessageType.deleteSoundFont, id);
    }

    /**
     * Rearranges the soundfonts in a given order
     * @param newList {string[]} the order of soundfonts, a list of identifiers, first overwrites second
     */
    rearrangeSoundFonts(newList)
    {
        this._sendToWorklet(WorkletSoundfontManagerMessageType.rearrangeSoundFonts, newList);
        this.soundfontList.sort((a, b) =>
            newList.indexOf(a.id) - newList.indexOf(b.id)
        );
    }

    /**
     * DELETES ALL SOUNDFONTS!! and creates a new one with id "main"
     * @param newBuffer {ArrayBuffer}
     */
    async reloadManager(newBuffer)
    {
        this._sendToWorklet(WorkletSoundfontManagerMessageType.reloadSoundFont, newBuffer);
        await new Promise(r => this.synth.resolveWhenReady = r);
    }
}