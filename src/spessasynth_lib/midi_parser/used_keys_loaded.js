import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo } from '../utils/loggin.js'
import { consoleColors } from '../utils/other.js'
import { DEFAULT_PERCUSSION } from '../synthetizer/synthetizer.js'
import { messageTypes, midiControllers } from './midi_message.js'

/**
 * @param mid {MIDI}
 * @param soundfont {SoundFont2}
 */
export function getUsedProgramsAndKeys(mid, soundfont)
{
    SpessaSynthGroupCollapsed("%cSearching for all used programs and keys...",
        consoleColors.info);
    // find every bank:program combo and every key:velocity for each. Make sure to care about ports and drums
    const channelsAmount = 16 + mid.midiPortChannelOffsets.reduce((max, cur) => cur > max ? cur: max);
    /**
     * @type {{program: number, bank: number, drums: boolean, string: string}[]}
     */
    const channelPresets = [];
    for (let i = 0; i < channelsAmount; i++) {
        const bank = i % 16 === DEFAULT_PERCUSSION ? 128 : 0;
        channelPresets.push({
            program: 0,
            bank: bank,
            drums: i % 16 === DEFAULT_PERCUSSION, // drums appear on 9 every 16 channels,
            string: `${bank}:0`,
        });
    }

    function updateString(ch)
    {
        // check if this exists in the soundfont
        let exists = soundfont.getPreset(ch.bank, ch.program);
        if(exists.bank !== ch.bank && mid.embeddedSoundFont)
        {
            // maybe it doesn't exists becase RMIDI has a bank shift?
            exists = soundfont.getPreset(ch.bank - 1, ch.program);
        }
        ch.bank = exists.bank;
        ch.program = exists.program;
        ch.string = ch.bank + ":" + ch.program;
        if(!usedProgramsAndKeys[ch.string])
        {
            SpessaSynthInfo(`%cDetected a new preset: %c${ch.string}`,
                consoleColors.info,
                consoleColors.recognized);
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
        mid.tracks.forEach((track, i) => {
            if(eventIndexes[i] >= track.length)
            {
                return;
            }
            if(track[eventIndexes[i]].ticks < ticks)
            {
                index = i;
                ticks = track[eventIndexes[i]].ticks;
            }
        });
        return index;
    }
    const ports = mid.midiPorts.slice();
    // check for xg
    let system = "gs";
    while(remainingTracks > 0)
    {
        let trackNum = findFirstEventIndex();
        const track = mid.tracks[trackNum];
        if(eventIndexes[trackNum] >= track.length)
        {
            remainingTracks--;
            continue;
        }
        const event = track[eventIndexes[trackNum]];
        eventIndexes[trackNum]++;

        if(event.messageStatusByte === messageTypes.midiPort)
        {
            ports[trackNum] = event.messageData[0];
            continue;
        }
        const status = event.messageStatusByte & 0xF0;
        if(
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
        switch(status)
        {
            case messageTypes.programChange:
                ch.program = event.messageData[0];
                updateString(ch);
                break;

            case messageTypes.controllerChange:
                if(event.messageData[0] !== midiControllers.bankSelect)
                {
                    // we only care about bank select
                    continue;
                }
                if(system === "gs" && ch.drums)
                {
                    // gs drums get changed via sysex, ignore here
                    continue;
                }
                const bank = event.messageData[1];
                if(system === "xg")
                {
                    // check for xg drums
                    const drumsBool = bank === 120 || bank === 126 || bank === 127;
                    if(drumsBool !== ch.drums)
                    {
                        // drum change is a program change
                        ch.drums = drumsBool;
                        ch.bank = ch.drums ? 128 : bank;
                        updateString(ch);
                    }
                    else
                    {
                        ch.bank = ch.drums ? 128 : bank;
                    }
                    continue;
                }
                channelPresets[channel].bank = bank;
                // do not update the data, bank change doesnt change the preset
                break;

            case messageTypes.noteOn:
                if(event.messageData[1] === 0)
                {
                    // that's a note off
                    continue;
                }
                updateString(ch);
                usedProgramsAndKeys[ch.string].add(`${event.messageData[0]}-${event.messageData[1]}`);
                break;

            case messageTypes.systemExclusive:
                // check for drum sysex
                if(
                    event.messageData[0] !== 0x41 || // roland
                    event.messageData[2] !== 0x42 || // GS
                    event.messageData[3] !== 0x12 || // GS
                    event.messageData[4] !== 0x40 || // system parameter
                    (event.messageData[5] & 0x10 ) === 0 || // part parameter
                    event.messageData[6] !== 0x15 // drum pars

                )
                {
                    // check for XG
                    if(
                        event.messageData[0] === 0x43 && // yamaha
                        event.messageData[2] === 0x4C && // sXG ON
                        event.messageData[5] === 0x7E &&
                        event.messageData[6] === 0x00
                    )
                    {
                        system = "xg";
                    }
                    continue;
                }
                const sysexChannel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][event.messageData[5] & 0x0F] + mid.midiPortChannelOffsets[ports[trackNum]];
                const isDrum = !!(event.messageData[7] > 0 && event.messageData[5] >> 4);
                ch = channelPresets[sysexChannel];
                ch.drums = isDrum;
                ch.bank = isDrum ? 128 : 0;
                updateString(ch);
                break;

        }
    }
    for(const key of Object.keys(usedProgramsAndKeys))
    {
        if(usedProgramsAndKeys[key].size === 0)
        {
            SpessaSynthInfo(`%cDetected change but no keys for %c${key}`,
                consoleColors.info,
                consoleColors.value)
            delete usedProgramsAndKeys[key];
        }
    }
    SpessaSynthGroupEnd();
    return usedProgramsAndKeys;
}