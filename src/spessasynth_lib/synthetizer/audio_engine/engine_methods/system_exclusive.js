import { arrayToHexString, consoleColors } from "../../../utils/other.js";
import { SpessaSynthInfo, SpessaSynthWarn } from "../../../utils/loggin.js";
import { midiControllers } from "../../../midi/midi_message.js";
import { ALL_CHANNELS_OR_DIFFERENT_ACTION } from "../message_protocol/worklet_message.js";
import { isSystemXG } from "../../../utils/xg_hacks.js";
import { masterParameterType } from "./controller_control/master_parameters.js";

/**
 * KeyNum: tuning
 * @typedef {MTSNoteTuning[]} MTSProgramTuning
 */

/**
 * @typedef {Object} MTSNoteTuning
 * @property {number} midiNote - the base midi note to use, -1 means no change
 * @property {number} centTuning - additional tuning
 */

/**
 * Calculates freqency for MIDI Tuning Standard
 * @param byte1 {number}
 * @param byte2 {number}
 * @param byte3 {number}
 * @return {{midiNote: number, centTuning: number|null}}
 */
function getTuning(byte1, byte2, byte3)
{
    const midiNote = byte1;
    const fraction = (byte2 << 7) | byte3; // Combine byte2 and byte3 into a 14-bit number
    
    // no change
    if (byte1 === 0x7F && byte2 === 0x7F && byte3 === 0x7F)
    {
        return { midiNote: -1, centTuning: null };
    }
    
    // calculate cent tuning
    return { midiNote: midiNote, centTuning: fraction * 0.0061 };
}

/**
 * The text types for the synth display
 * @enum {number}
 */
export const SynthDisplayType = {
    SoundCanvasText: 0,
    XGText: 1,
    SoundCanvasDotDisplay: 2
};


/**
 * Executes a system exclusive
 * @param messageData {number[]|IndexedByteArray} - the message data without f0
 * @param channelOffset {number}
 * @this {SpessaSynthProcessor}
 */
export function systemExclusive(messageData, channelOffset = 0)
{
    const type = messageData[0];
    if (this.deviceID !== ALL_CHANNELS_OR_DIFFERENT_ACTION && messageData[1] !== 0x7F)
    {
        if (this.deviceID !== messageData[1])
        {
            // not our device ID
            return;
        }
    }
    switch (type)
    {
        default:
            SpessaSynthWarn(
                `%cUnrecognized SysEx: %c${arrayToHexString(messageData)}`,
                consoleColors.warn,
                consoleColors.unrecognized
            );
            break;
        
        // non realtime
        case 0x7E:
        case 0x7F:
            switch (messageData[2])
            {
                case 0x04:
                    let cents;
                    // device control
                    switch (messageData[3])
                    {
                        case 0x01:
                            // main volume
                            const vol = messageData[5] << 7 | messageData[4];
                            this.setMIDIVolume(vol / 16384);
                            SpessaSynthInfo(
                                `%cMaster Volume. Volume: %c${vol}`,
                                consoleColors.info,
                                consoleColors.value
                            );
                            break;
                        
                        case 0x02:
                            // main balance
                            // midi spec page 62
                            const balance = messageData[5] << 7 | messageData[4];
                            const pan = (balance - 8192) / 8192;
                            this.setMasterParameter(masterParameterType.masterPan, pan);
                            SpessaSynthInfo(
                                `%cMaster Pan. Pan: %c${pan}`,
                                consoleColors.info,
                                consoleColors.value
                            );
                            break;
                        
                        
                        case 0x03:
                            // fine-tuning
                            const tuningValue = ((messageData[5] << 7) | messageData[6]) - 8192;
                            cents = Math.floor(tuningValue / 81.92); // [-100;+99] cents range
                            this.setMasterTuning(cents);
                            SpessaSynthInfo(
                                `%cMaster Fine Tuning. Cents: %c${cents}`,
                                consoleColors.info,
                                consoleColors.value
                            );
                            break;
                        
                        case 0x04:
                            // coarse tuning
                            // lsb is ignored
                            const semitones = messageData[5] - 64;
                            cents = semitones * 100;
                            this.setMasterTuning(cents);
                            SpessaSynthInfo(
                                `%cMaster Coarse Tuning. Cents: %c${cents}`,
                                consoleColors.info,
                                consoleColors.value
                            );
                            break;
                        
                        default:
                            SpessaSynthWarn(
                                `%cUnrecognized MIDI Device Control Real-time message: %c${arrayToHexString(messageData)}`,
                                consoleColors.warn,
                                consoleColors.unrecognized
                            );
                    }
                    break;
                
                case 0x09:
                    // gm system related
                    if (messageData[3] === 0x01)
                    {
                        SpessaSynthInfo("%cGM1 system on", consoleColors.info);
                        this.setSystem("gm");
                    }
                    else if (messageData[3] === 0x03)
                    {
                        SpessaSynthInfo("%cGM2 system on", consoleColors.info);
                        this.setSystem("gm2");
                    }
                    else
                    {
                        SpessaSynthInfo("%cGM system off, defaulting to GS", consoleColors.info);
                        this.setSystem("gs");
                    }
                    break;
                
                // MIDI Tuning standard
                // https://midi.org/midi-tuning-updated-specification
                case 0x08:
                    switch (messageData[3])
                    {
                        // single note change
                        // single note change bank
                        case 0x02:
                        case 0x07:
                            let currentMessageIndex = 4;
                            if (messageData[3] === 0x07)
                            {
                                // skip the bank
                                currentMessageIndex++;
                            }
                            // get program and number of changes
                            const tuningProgram = messageData[currentMessageIndex++];
                            const numberOfChanges = messageData[currentMessageIndex++];
                            for (let i = 0; i < numberOfChanges; i++)
                            {
                                // set the given tuning to the program
                                this.tunings[tuningProgram][messageData[currentMessageIndex++]] = getTuning(
                                    messageData[currentMessageIndex++],
                                    messageData[currentMessageIndex++],
                                    messageData[currentMessageIndex++]
                                );
                            }
                            SpessaSynthInfo(
                                `%cSingle Note Tuning. Program: %c${tuningProgram}%c Keys affected: %c${numberOfChanges}`,
                                consoleColors.info,
                                consoleColors.recognized,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            break;
                        
                        // octave tuning (1 byte)
                        // and octave tuning (2 bytes)
                        case 0x09:
                        case 0x08:
                            // get tuning:
                            const newOctaveTuning = new Int8Array(12);
                            // start from bit 7
                            if (messageData[3] === 0x08)
                            {
                                // 1 byte tuning: 0 is -64 cents, 64 is 0, 127 is +63
                                for (let i = 0; i < 12; i++)
                                {
                                    newOctaveTuning[i] = messageData[7 + i] - 64;
                                }
                            }
                            else
                            {
                                // 2 byte tuning. Like fine tune: 0 is -100 cents, 8192 is 0 cents, 16,383 is +100 cents
                                for (let i = 0; i < 24; i += 2)
                                {
                                    const tuning = ((messageData[7 + i] << 7) | messageData[8 + i]) - 8192;
                                    newOctaveTuning[i / 2] = Math.floor(tuning / 81.92); // map to [-100;+99] cents
                                }
                            }
                            // apply to channels (ordered from 0)
                            // bit 1: 14 and 15
                            if ((messageData[4] & 1) === 1)
                            {
                                this.midiAudioChannels[14 + channelOffset].setOctaveTuning(newOctaveTuning);
                            }
                            if (((messageData[4] >> 1) & 1) === 1)
                            {
                                this.midiAudioChannels[15 + channelOffset].setOctaveTuning(newOctaveTuning);
                            }
                            
                            // bit 2: channels 7 to 13
                            for (let i = 0; i < 7; i++)
                            {
                                const bit = (messageData[5] >> i) & 1;
                                if (bit === 1)
                                {
                                    this.midiAudioChannels[7 + i + channelOffset].setOctaveTuning(newOctaveTuning);
                                }
                            }
                            
                            // bit 3: channels 0 to 16
                            for (let i = 0; i < 7; i++)
                            {
                                const bit = (messageData[6] >> i) & 1;
                                if (bit === 1)
                                {
                                    this.midiAudioChannels[i + channelOffset].setOctaveTuning(newOctaveTuning);
                                }
                            }
                            
                            SpessaSynthInfo(
                                `%cMIDI Octave Scale ${
                                    messageData[3] === 0x08 ? "(1 byte)" : "(2 bytes)"
                                } tuning via Tuning: %c${newOctaveTuning.join(" ")}`,
                                consoleColors.info,
                                consoleColors.value
                            );
                            break;
                        
                        default:
                            SpessaSynthWarn(
                                `%cUnrecognized MIDI Tuning standard message: %c${arrayToHexString(messageData)}`,
                                consoleColors.warn,
                                consoleColors.unrecognized
                            );
                            break;
                    }
                    break;
                
                default:
                    SpessaSynthWarn(
                        `%cUnrecognized MIDI Realtime/non realtime message: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized
                    );
                
            }
            break;
        
        // this is a roland sysex
        // http://www.bandtrax.com.au/sysex.htm
        // https://cdn.roland.com/assets/media/pdf/AT-20R_30R_MI.pdf
        case 0x41:
        
        function notRecognized()
        {
            // this is some other GS sysex...
            SpessaSynthWarn(
                `%cUnrecognized Roland %cGS %cSysEx: %c${arrayToHexString(messageData)}`,
                consoleColors.warn,
                consoleColors.recognized,
                consoleColors.warn,
                consoleColors.unrecognized
            );
        }
            
            if (messageData[2] === 0x42 && messageData[3] === 0x12)
            {
                // this is a GS sysex
                // messageData[5] and [6] is the system parameter, messageData[7] is the value
                const messageValue = messageData[7];
                if (messageData[6] === 0x7F)
                {
                    // GS mode set
                    if (messageValue === 0x00)
                    {
                        // this is a GS reset
                        SpessaSynthInfo("%cGS Reset received!", consoleColors.info);
                        this.resetAllControllers(false);
                        this.setSystem("gs");
                    }
                    else if (messageValue === 0x7F)
                    {
                        // GS mode off
                        SpessaSynthInfo("%cGS system off, switching to GM2", consoleColors.info);
                        this.resetAllControllers(false);
                        this.setSystem("gm2");
                    }
                    return;
                }
                else if (messageData[4] === 0x40)
                {
                    // this is a system parameter
                    if ((messageData[5] & 0x10) > 0)
                    {
                        // this is an individual part (channel) parameter
                        // determine the channel 0 means channel 10 (default), 1 means 1 etc.
                        const channel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][messageData[5] & 0x0F] + channelOffset;
                        // for example, 0x1A means A = 11, which corresponds to channel 12 (counting from 1)
                        const channelObject = this.midiAudioChannels[channel];
                        switch (messageData[6])
                        {
                            default:
                                // this is some other GS sysex...
                                notRecognized();
                                break;
                            
                            case 0x15:
                                // this is the Use for Drum Part sysex (multiple drums)
                                const isDrums = messageValue > 0 && messageData[5] >> 4; // if set to other than 0, is a drum channel
                                channelObject.setDrums(isDrums);
                                SpessaSynthInfo(
                                    `%cChannel %c${channel}%c ${isDrums ?
                                        "is now a drum channel"
                                        :
                                        "now isn't a drum channel"
                                    }%c via: %c${arrayToHexString(messageData)}`,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value
                                );
                                return;
                            
                            case 0x16:
                                // this is the pitch key shift sysex
                                const keyShift = messageValue - 64;
                                channelObject.transposeChannel(keyShift);
                                SpessaSynthInfo(
                                    `%cChannel %c${channel}%c pitch shift. Semitones %c${keyShift}%c, with %c${arrayToHexString(
                                        messageData)}`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info,
                                    consoleColors.value
                                );
                                return;
                            
                            // pan position
                            case 0x1C:
                                // 0 is random
                                let panpot = messageValue;
                                if (panpot === 0)
                                {
                                    channelObject.randomPan = true;
                                    SpessaSynthInfo(
                                        `%cRandom pan is set to %cON%c for %c${channel}`,
                                        consoleColors.info,
                                        consoleColors.recognized,
                                        consoleColors.info,
                                        consoleColors.value
                                    );
                                }
                                else
                                {
                                    channelObject.randomPan = false;
                                    channelObject.controllerChange(midiControllers.pan, panpot);
                                }
                                break;
                            
                            // chorus send
                            case 0x21:
                                channelObject.controllerChange(midiControllers.chorusDepth, messageValue);
                                break;
                            
                            // reverb send
                            case 0x22:
                                channelObject.controllerChange(midiControllers.reverbDepth, messageValue);
                                break;
                            
                            case 0x40:
                            case 0x41:
                            case 0x42:
                            case 0x43:
                            case 0x44:
                            case 0x45:
                            case 0x46:
                            case 0x47:
                            case 0x48:
                            case 0x49:
                            case 0x4A:
                            case 0x4B:
                                // scale tuning: up to 12 bytes
                                const tuningBytes = messageData.length - 9; // data starts at 7, minus checksum and f7
                                // read em bytes
                                const newTuning = new Int8Array(12);
                                for (let i = 0; i < tuningBytes; i++)
                                {
                                    newTuning[i] = messageData[i + 7] - 64;
                                }
                                channelObject.setOctaveTuning(newTuning);
                                const cents = messageValue - 64;
                                SpessaSynthInfo(
                                    `%cChannel %c${channel}%c octave scale tuning. Cents %c${newTuning.join(
                                        " ")}%c, with %c${arrayToHexString(messageData)}`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info,
                                    consoleColors.value
                                );
                                channelObject.setTuning(cents);
                                break;
                        }
                        return;
                    }
                    else
                        // this is a global system parameter
                    if (messageData[5] === 0x00 && messageData[6] === 0x06)
                    {
                        // roland master pan
                        SpessaSynthInfo(
                            `%cRoland GS Master Pan set to: %c${messageValue}%c with: %c${arrayToHexString(
                                messageData)}`,
                            consoleColors.info,
                            consoleColors.value,
                            consoleColors.info,
                            consoleColors.value
                        );
                        this.setMasterParameter(masterParameterType.masterPan, (messageValue - 64) / 64);
                        return;
                    }
                    else if (messageData[5] === 0x00 && messageData[6] === 0x05)
                    {
                        // roland master key shift (transpose)
                        const transpose = messageValue - 64;
                        SpessaSynthInfo(
                            `%cRoland GS Master Key-Shift set to: %c${transpose}%c with: %c${arrayToHexString(
                                messageData)}`,
                            consoleColors.info,
                            consoleColors.value,
                            consoleColors.info,
                            consoleColors.value
                        );
                        this.setMasterTuning(transpose * 100);
                        return;
                    }
                    else if (messageData[5] === 0x00 && messageData[6] === 0x04)
                    {
                        // roland GS master volume
                        SpessaSynthInfo(
                            `%cRoland GS Master Volume set to: %c${messageValue}%c with: %c${arrayToHexString(
                                messageData)}`,
                            consoleColors.info,
                            consoleColors.value,
                            consoleColors.info,
                            consoleColors.value
                        );
                        this.setMIDIVolume(messageValue / 127);
                        return;
                    }
                }
                // this is some other GS sysex...
                notRecognized();
                return;
            }
            else if (messageData[2] === 0x45 && messageData[3] === 0x12)
            {
                // 0x45: GS Display Data, 0x12: DT1 (Device Transmit)
                // check for embedded copyright
                // (roland SC display sysex) http://www.bandtrax.com.au/sysex.htm
                
                if (
                    messageData[4] === 0x10 && // Sound Canvas Display
                    messageData[6] === 0x00    // Data follows
                )
                {
                    if (messageData[5] === 0x00) // Display letters
                    {
                        // get the text
                        // and header ends with (checksum) F7
                        const text = new Uint8Array(messageData.slice(7, messageData.length - 2));
                        this.callEvent(
                            "synthdisplay",
                            {
                                displayData: text,
                                displayType: SynthDisplayType.SoundCanvasText
                            }
                        );
                    }
                    else if (messageData[5] === 0x01) // Matrix display
                    {
                        // get the data
                        // and header ends with (checksum) F7
                        const dotMatrixData = new Uint8Array(messageData.slice(7, messageData.length - 3));
                        this.callEvent(
                            "synthdisplay",
                            {
                                displayData: dotMatrixData,
                                displayType: SynthDisplayType.SoundCanvasDotDisplay
                            }
                        );
                        SpessaSynthInfo(
                            `%cRoland SC Display Dot Matrix via: %c${arrayToHexString(
                                messageData)}`,
                            consoleColors.info,
                            consoleColors.value
                        );
                    }
                    else
                    {
                        // this is some other GS sysex...
                        notRecognized();
                    }
                }
            }
            else if (messageData[2] === 0x16 && messageData[3] === 0x12 && messageData[4] === 0x10)
            {
                // this is a roland master volume message
                this.setMIDIVolume(messageData[7] / 100);
                SpessaSynthInfo(
                    `%cRoland Master Volume control set to: %c${messageData[7]}%c via: %c${arrayToHexString(
                        messageData)}`,
                    consoleColors.info,
                    consoleColors.value,
                    consoleColors.info,
                    consoleColors.value
                );
                return;
            }
            else
            {
                // this is something else...
                SpessaSynthWarn(
                    `%cUnrecognized Roland SysEx: %c${arrayToHexString(messageData)}`,
                    consoleColors.warn,
                    consoleColors.unrecognized
                );
                return;
            }
            break;
        
        // yamaha
        // http://www.studio4all.de/htmle/main91.html
        case 0x43:
            // XG sysex
            if (messageData[2] === 0x4C)
            {
                // XG system parameter
                if (messageData[3] === 0x00 && messageData[4] === 0x00)
                {
                    switch (messageData[5])
                    {
                        // master volume
                        case 0x04:
                            const vol = messageData[6];
                            this.setMIDIVolume(vol / 127);
                            SpessaSynthInfo(
                                `%cXG master volume. Volume: %c${vol}`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            break;
                        
                        // master transpose
                        case 0x06:
                            const transpose = messageData[6] - 64;
                            this.transposeAllChannels(transpose);
                            SpessaSynthInfo(
                                `%cXG master transpose. Volume: %c${transpose}`,
                                consoleColors.info,
                                consoleColors.recognized
                            );
                            break;
                        
                        // XG on
                        case 0x7E:
                            SpessaSynthInfo("%cXG system on", consoleColors.info);
                            this.resetAllControllers(false);
                            this.setSystem("xg");
                            break;
                    }
                }
                else
                    // XG part parameter
                if (messageData[3] === 0x08)
                {
                    if (!isSystemXG(this.system))
                    {
                        return;
                    }
                    const channel = messageData[4] + channelOffset;
                    if (channel >= this.midiAudioChannels.length)
                    {
                        // invalid channel
                        return;
                    }
                    const channelObject = this.midiAudioChannels[channel];
                    const value = messageData[6];
                    switch (messageData[5])
                    {
                        // bank-select MSB
                        case 0x01:
                            channelObject.controllerChange(midiControllers.bankSelect, value);
                            break;
                        
                        // bank-select LSB
                        case 0x02:
                            channelObject.controllerChange(midiControllers.lsbForControl0BankSelect, value);
                            break;
                        
                        // program change
                        case 0x03:
                            channelObject.programChange(value);
                            break;
                        
                        // note shift
                        case 0x08:
                            if (channelObject.drumChannel)
                            {
                                return;
                            }
                            const semitones = value - 64;
                            channelObject.channelTransposeKeyShift = semitones;
                            break;
                        
                        // volume
                        case 0x0B:
                            channelObject.controllerChange(midiControllers.mainVolume, value);
                            break;
                        
                        // pan position
                        case 0x0E:
                            let pan = value;
                            if (pan === 0)
                            {
                                // 0 means random
                                channelObject.randomPan = true;
                                SpessaSynthInfo(
                                    `%cRandom pan is set to %cON%c for %c${channel}`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value
                                );
                            }
                            else
                            {
                                channelObject.controllerChange(midiControllers.pan, pan);
                            }
                            break;
                        
                        // reverb
                        case 0x13:
                            channelObject.controllerChange(midiControllers.reverbDepth, value);
                            break;
                        
                        // chorus
                        case 0x12:
                            channelObject.controllerChange(midiControllers.chorusDepth, value);
                            break;
                        
                        default:
                            SpessaSynthWarn(
                                `%cUnrecognized Yamaha XG Part Setup: %c${messageData[5].toString(16)
                                    .toUpperCase()}`,
                                consoleColors.warn,
                                consoleColors.unrecognized
                            );
                    }
                }
                else if (
                    messageData[3] === 0x06 && // XG System parameter
                    messageData[4] === 0x00    // System Byte
                )
                {
                    // displayed letters (remove F7 at the end)
                    // include byte 5 as it seems to be line information (useful)
                    const textData = new Uint8Array(messageData.slice(5, messageData.length - 1));
                    this.callEvent(
                        "synthdisplay",
                        {
                            displayData: textData,
                            displayType: SynthDisplayType.XGText
                        }
                    );
                }
                else if (isSystemXG(this.system))
                {
                    SpessaSynthWarn(
                        `%cUnrecognized Yamaha XG SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized
                    );
                }
                
            }
            else
            {
                if (isSystemXG(this.system))
                {
                    SpessaSynthWarn(
                        `%cUnrecognized Yamaha SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized
                    );
                }
            }
            break;
        
        
    }
}