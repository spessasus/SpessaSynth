import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo } from "../../utils/loggin.js";
import { consoleColors } from "../../utils/other.js";
import { messageTypes, midiControllers } from "../midi_message.js";
import { DEFAULT_PERCUSSION } from "../../synthetizer/synth_constants.js";
import { chooseBank, isSystemXG, parseBankSelect } from "../../utils/xg_hacks.js";
import { isGSDrumsOn, isXGOn } from "../../utils/sysex_detector.js";

/**
 * Gets the used programs and keys for this MIDI file with a given sound bank
 * @this {BasicMIDI}
 * @param soundfont {BasicSoundBank|WorkletSoundfontManager} - the sound bank
 * @returns {Object<string, Set<string>>} Object<bank:program, Set<key-velocity>>
 */
export function getUsedProgramsAndKeys(soundfont)
{
    const mid = this;
    SpessaSynthGroupCollapsed(
        "%cSearching for all used programs and keys...",
        consoleColors.info
    );
    // Find every bank:program combo and every key:velocity for each. Make sure to care about ports and drums
    const channelsAmount = 16 + mid.midiPortChannelOffsets.reduce((max, cur) => cur > max ? cur : max);
    /**
     * @type {{program: number, bank: number, bankLSB: number, drums: boolean, string: string, actualBank: number}[]}
     */
    const channelPresets = [];
    for (let i = 0; i < channelsAmount; i++)
    {
        const bank = i % 16 === DEFAULT_PERCUSSION ? 128 : 0;
        channelPresets.push({
            program: 0,
            bank: bank,
            bankLSB: 0,
            actualBank: bank,
            drums: i % 16 === DEFAULT_PERCUSSION, // drums appear on 9 every 16 channels,
            string: `${bank}:0`
        });
    }
    
    // check for xg
    let system = "gs";
    
    function updateString(ch)
    {
        const bank = chooseBank(ch.bank, ch.bankLSB, ch.drums, isSystemXG(system));
        // check if this exists in the soundfont
        let exists = soundfont.getPreset(bank, ch.program, isSystemXG(system));
        ch.actualBank = exists.bank;
        ch.program = exists.program;
        ch.string = ch.actualBank + ":" + ch.program;
        if (!usedProgramsAndKeys[ch.string])
        {
            SpessaSynthInfo(
                `%cDetected a new preset: %c${ch.string}`,
                consoleColors.info,
                consoleColors.recognized
            );
            usedProgramsAndKeys[ch.string] = new Set();
        }
    }
    
    /**
     * find all programs used and key-velocity combos in them
     * bank:program each has a set of midiNote-velocity
     * @type {Object<string, Set<string>>}
     */
    const usedProgramsAndKeys = {};
    
    /**
     * indexes for tracks
     * @type {number[]}
     */
    const eventIndexes = Array(mid.tracks.length).fill(0);
    let remainingTracks = mid.tracks.length;
    
    function findFirstEventIndex()
    {
        let index = 0;
        let ticks = Infinity;
        mid.tracks.forEach((track, i) =>
        {
            if (eventIndexes[i] >= track.length)
            {
                return;
            }
            if (track[eventIndexes[i]].ticks < ticks)
            {
                index = i;
                ticks = track[eventIndexes[i]].ticks;
            }
        });
        return index;
    }
    
    const ports = mid.midiPorts.slice();
    // initialize
    channelPresets.forEach(c =>
    {
        updateString(c);
    });
    while (remainingTracks > 0)
    {
        let trackNum = findFirstEventIndex();
        const track = mid.tracks[trackNum];
        if (eventIndexes[trackNum] >= track.length)
        {
            remainingTracks--;
            continue;
        }
        const event = track[eventIndexes[trackNum]];
        eventIndexes[trackNum]++;
        
        if (event.messageStatusByte === messageTypes.midiPort)
        {
            ports[trackNum] = event.messageData[0];
            continue;
        }
        const status = event.messageStatusByte & 0xF0;
        if (
            status !== messageTypes.noteOn &&
            status !== messageTypes.controllerChange &&
            status !== messageTypes.programChange &&
            status !== messageTypes.systemExclusive
        )
        {
            continue;
        }
        const channel = (event.messageStatusByte & 0xF) + mid.midiPortChannelOffsets[ports[trackNum]] || 0;
        let ch = channelPresets[channel];
        switch (status)
        {
            case messageTypes.programChange:
                ch.program = event.messageData[0];
                updateString(ch);
                break;
            
            case messageTypes.controllerChange:
                const isLSB = event.messageData[0] === midiControllers.lsbForControl0BankSelect;
                if (event.messageData[0] !== midiControllers.bankSelect && !isLSB)
                {
                    // we only care about bank select
                    continue;
                }
                if (system === "gs" && ch.drums)
                {
                    // gs drums get changed via sysex, ignore here
                    continue;
                }
                const bank = event.messageData[1];
                const realBank = Math.max(0, bank - mid.bankOffset);
                if (isLSB)
                {
                    ch.bankLSB = realBank;
                }
                else
                {
                    ch.bank = realBank;
                }
                // interpret the bank
                const intepretation = parseBankSelect(
                    ch.bank,
                    realBank,
                    system,
                    isLSB,
                    ch.drums,
                    channel
                );
                switch (intepretation.drumsStatus)
                {
                    case 0:
                        // no change
                        break;
                    
                    case 1:
                        // drums changed to off
                        // drum change is a program change
                        ch.drums = false;
                        updateString(ch);
                        break;
                    
                    case 2:
                        // drums changed to on
                        // drum change is a program change
                        ch.drums = true;
                        updateString(ch);
                        break;
                }
                // do not update the data, bank change doesn't change the preset
                break;
            
            case messageTypes.noteOn:
                if (event.messageData[1] === 0)
                {
                    // that's a note off
                    continue;
                }
                usedProgramsAndKeys[ch.string].add(`${event.messageData[0]}-${event.messageData[1]}`);
                break;
            
            case messageTypes.systemExclusive:
                // check for drum sysex
                if (!isGSDrumsOn(event))
                {
                    // check for XG
                    if (isXGOn(event))
                    {
                        system = "xg";
                        SpessaSynthInfo(
                            "%cXG on detected!",
                            consoleColors.recognized
                        );
                    }
                    continue;
                }
                const sysexChannel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][event.messageData[5] & 0x0F] + mid.midiPortChannelOffsets[ports[trackNum]];
                const isDrum = !!(event.messageData[7] > 0 && event.messageData[5] >> 4);
                ch = channelPresets[sysexChannel];
                ch.drums = isDrum;
                updateString(ch);
                break;
            
        }
    }
    for (const key of Object.keys(usedProgramsAndKeys))
    {
        if (usedProgramsAndKeys[key].size === 0)
        {
            SpessaSynthInfo(
                `%cDetected change but no keys for %c${key}`,
                consoleColors.info,
                consoleColors.value
            );
            delete usedProgramsAndKeys[key];
        }
    }
    SpessaSynthGroupEnd();
    return usedProgramsAndKeys;
}