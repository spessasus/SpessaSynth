import { arrayToHexString, consoleColors } from '../../../utils/other.js'
import { SpessaSynthInfo, SpessaSynthWarn } from '../../../utils/loggin.js'
import { midiControllers } from '../../../midi_parser/midi_message.js'
/**
 * Executes a system exclusive
 * @param messageData {number[]|IndexedByteArray} - the message data without f0
 * @param channelOffset {number}
 * @this {SpessaSynthProcessor}
 */

export function systemExclusive(messageData, channelOffset = 0)
{
    const type = messageData[0];
    switch (type)
    {
        default:
            SpessaSynthWarn(`%cUnrecognized SysEx: %c${arrayToHexString(messageData)}`,
                consoleColors.warn,
                consoleColors.unrecognized);
            break;

        // non realtime
        case 0x7E:
            // gm system
            if(messageData[2] === 0x09)
            {
                if(messageData[3] === 0x01)
                {
                    SpessaSynthInfo("%cGM system on", consoleColors.info);
                    this.system = "gm";
                }
                else if(messageData[3] === 0x03)
                {
                    SpessaSynthInfo("%cGM2 system on", consoleColors.info);
                    this.system = "gm2";
                }
                else
                {
                    SpessaSynthInfo("%cGM system off, defaulting to GS", consoleColors.info);
                    this.system = "gs";
                }
            }
            break;

        // realtime
        // https://midi.org/midi-1-0-universal-system-exclusive-messages
        case 0x7F:
            if(messageData[2] === 0x04)
            {
                let cents
                // device control
                switch(messageData[3])
                {
                    case 0x01:
                        // main volume
                        const vol = messageData[5] << 7 | messageData[4];
                        this.setMIDIVolume(vol / 16384);
                        SpessaSynthInfo(`%cMaster Volume. Volume: %c${vol}`,
                            consoleColors.info,
                            consoleColors.value);
                        break;

                    case 0x02:
                        // main balance
                        // midi spec page 62
                        const balance = messageData[5] << 7 | messageData[4];
                        const pan = (balance - 8192) / 8192;
                        this.setMasterPan(pan);
                        SpessaSynthInfo(`%cMaster Pan. Pan: %c${pan}`,
                            consoleColors.info,
                            consoleColors.value);
                        break;


                    case 0x03:
                        // fine tuning
                        const tuningValue = ((messageData[5] << 7) | messageData[6]) - 8192;
                        cents = Math.floor(tuningValue / 81.92); // [-100;+99] cents range
                        this.setMasterTuning(cents);
                        SpessaSynthInfo(`%cMaster Fine Tuning. Cents: %c${cents}`,
                            consoleColors.info,
                            consoleColors.value);
                        break;

                    case 0x04:
                        // coarse tuning
                        // lsb is ignored
                        const semitones = messageData[5] - 64;
                        cents = semitones * 100;
                        this.setMasterTuning(cents);
                        SpessaSynthInfo(`%cMaster Coarse Tuning. Cents: %c${cents}`,
                            consoleColors.info,
                            consoleColors.value)
                        break;

                    default:
                        SpessaSynthWarn(
                            `%cUnrecognized MIDI Device Control Real-time message: %c${arrayToHexString(messageData)}`,
                            consoleColors.warn,
                            consoleColors.unrecognized);
                }
            }
            else
            {
                SpessaSynthWarn(
                    `%cUnrecognized MIDI Real-time message: %c${arrayToHexString(messageData)}`,
                    consoleColors.warn,
                    consoleColors.unrecognized);
            }
            break;

        // this is a roland sysex
        // http://www.bandtrax.com.au/sysex.htm
        // https://cdn.roland.com/assets/media/pdf/AT-20R_30R_MI.pdf
        case 0x41:
            // messagedata[1] is device id (ignore as we're everything >:) )
            if(messageData[2] === 0x42 && messageData[3] === 0x12)
            {
                // this is a GS sysex
                // messageData[5] and [6] is the system parameter, messageData[7] is the value
                const messageValue = messageData[7];
                if(messageData[6] === 0x7F)
                {
                    // GS mode set
                    if(messageValue === 0x00)
                    {
                        // this is a GS reset
                        SpessaSynthInfo("%cGS system on", consoleColors.info);
                        this.system = "gs";
                    }
                    else if(messageValue === 0x7F)
                    {
                        // GS mode off
                        SpessaSynthInfo("%cGS system off, switching to GM2", consoleColors.info);
                        this.system = "gm2";
                    }
                    return;
                }
                else
                if(messageData[4] === 0x40)
                {
                    // this is a system parameter
                    if((messageData[5] & 0x10) > 0)
                    {
                        // this is an individual part (channel) parameter
                        // determine the channel 0 means channel 10 (default), 1 means 1 etc.
                        let channel = [9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15][messageData[5] & 0x0F] + channelOffset;
                        // for example 1A means A = 11, which corresponds to channel 12 (counting from 1)
                        switch (messageData[6])
                        {
                            default:
                                break;

                            case 0x15:
                                // this is the Use for Drum Part sysex (multiple drums)
                                const isDrums = messageValue > 0 && messageData[5] >> 4; // if set to other than 0, is a drum channel
                                this.setDrums(channel, isDrums);
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
                                    consoleColors.value);
                                return;

                            case 0x16:
                                // this is the pitch key shift sysex
                                const keyShift = messageValue - 64;
                                this.transposeChannel(channel, keyShift);
                                SpessaSynthInfo(`%cChannel %c${channel}%c pitch shift. Semitones %c${keyShift}%c, with %c${arrayToHexString(messageData)}`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info,
                                    consoleColors.value);
                                return;

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
                                // scale tuning
                                const cents = messageValue - 64;
                                SpessaSynthInfo(`%cChannel %c${channel}%c tuning. Cents %c${cents}%c, with %c${arrayToHexString(messageData)}`,
                                    consoleColors.info,
                                    consoleColors.recognized,
                                    consoleColors.info,
                                    consoleColors.value,
                                    consoleColors.info,
                                    consoleColors.value);
                                this.setChannelTuning(channel, cents);
                        }
                    }
                    else
                    // this is a global system parameter
                    if(messageData[5] === 0x00 && messageData[6] === 0x06)
                    {
                        // roland master pan
                        SpessaSynthInfo(`%cRoland GS Master Pan set to: %c${messageValue}%c with: %c${arrayToHexString(messageData)}`,
                            consoleColors.info,
                            consoleColors.value,
                            consoleColors.info,
                            consoleColors.value);
                        this.setMasterPan((messageValue - 64) / 64);
                        return;
                    }
                    else
                    if(messageData[5] === 0x00 && messageData[6] === 0x05)
                    {
                        // roland master key shift (transpose)
                        const transpose = messageValue - 64;
                        SpessaSynthInfo(`%cRoland GS Master Key-Shift set to: %c${transpose}%c with: %c${arrayToHexString(messageData)}`,
                            consoleColors.info,
                            consoleColors.value,
                            consoleColors.info,
                            consoleColors.value);
                        this.setMasterTuning(transpose * 100);
                        return;
                    }
                    else
                    if(messageData[5] === 0x00 && messageData[6] === 0x04)
                    {
                        // roland GS master volume
                        SpessaSynthInfo(`%cRoland GS Master Volume set to: %c${messageValue}%c with: %c${arrayToHexString(messageData)}`,
                            consoleColors.info,
                            consoleColors.value,
                            consoleColors.info,
                            consoleColors.value);
                        this.setMIDIVolume(messageValue / 127);
                        return;
                    }
                }
                // this is some other GS sysex...
                SpessaSynthWarn(`%cUnrecognized Roland %cGS %cSysEx: %c${arrayToHexString(messageData)}`,
                    consoleColors.warn,
                    consoleColors.recognized,
                    consoleColors.warn,
                    consoleColors.unrecognized);
                return;
            }
            else
            if(messageData[2] === 0x16 && messageData[3] === 0x12 && messageData[4] === 0x10)
            {
                // this is a roland master volume message
                this.setMIDIVolume(messageData[7] / 100);
                SpessaSynthInfo(`%cRoland Master Volume control set to: %c${messageData[7]}%c via: %c${arrayToHexString(messageData)}`,
                    consoleColors.info,
                    consoleColors.value,
                    consoleColors.info,
                    consoleColors.value);
                return;
            }
            else
            {
                // this is something else...
                SpessaSynthWarn(`%cUnrecognized Roland SysEx: %c${arrayToHexString(messageData)}`,
                    consoleColors.warn,
                    consoleColors.unrecognized);
                return;
            }

        // yamaha
        // http://www.studio4all.de/htmle/main91.html
        case 0x43:
            // XG sysex
            if(messageData[2] === 0x4C)
            {
                // XG system parameter
                if(messageData[3] === 0x00 && messageData[4] === 0x00)
                {
                    switch (messageData[5])
                    {
                        // master volume
                        case 0x04:
                            const vol = messageData[6];
                            this.setMIDIVolume(vol / 127);
                            SpessaSynthInfo(`%cXG master volume. Volume: %c${vol}`,
                                consoleColors.info,
                                consoleColors.recognized);
                            break;

                        // master transpose
                        case 0x06:
                            const transpose = messageData[6] - 64;
                            this.transposeAllChannels(transpose);
                            SpessaSynthInfo(`%cXG master transpose. Volume: %c${transpose}`,
                                consoleColors.info,
                                consoleColors.recognized);
                            break;

                        // XG on
                        case 0x7E:
                            SpessaSynthInfo("%cXG system on", consoleColors.info);
                            this.system = "xg";
                            break;
                    }
                }
                else
                // XG part parameter
                if(messageData[3] === 0x08)
                {
                    if(this.system !== "xg")
                    {
                        return;
                    }
                    const channel = messageData[4] + channelOffset;
                    const value = messageData[6];
                    switch (messageData[5])
                    {
                        // bank select
                        case 0x01:
                            this.controllerChange(channel, midiControllers.bankSelect, value);
                            break;

                        // bank select lsb
                        case 0x02:
                            this.controllerChange(channel, midiControllers.lsbForControl0BankSelect, value);
                            break;

                        // program change
                        case 0x03:
                            this.programChange(channel, value);
                            break;

                        // volume
                        case 0x0B:
                            this.controllerChange(channel, midiControllers.mainVolume, value);
                            break;

                        // panpot
                        case 0x0E:
                            let pan = value;
                            if(pan === 0)
                            {
                                // 0 means random
                                pan = Math.floor(Math.random() * 127);
                            }
                            this.controllerChange(channel, midiControllers.pan, pan);
                            break;

                        // reverb
                        case 0x13:
                            this.controllerChange(channel, midiControllers.effects1Depth, value);
                            break;

                        // chorus
                        case 0x12:
                            this.controllerChange(channel, midiControllers.effects3Depth, value);
                            break;

                        default:
                            SpessaSynthWarn(`%cUnrecognized Yamaha XG Part Setup: %c${messageData[5].toString(16).toUpperCase()}`,
                                consoleColors.warn,
                                consoleColors.unrecognized);
                    }
                }
                else
                if(this.system === "xg")
                {
                    SpessaSynthWarn(`%cUnrecognized Yamaha XG SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                }

            }
            else
            {
                if(this.system === "xg")
                {
                    SpessaSynthWarn(`%cUnrecognized Yamaha SysEx: %c${arrayToHexString(messageData)}`,
                        consoleColors.warn,
                        consoleColors.unrecognized);
                }
            }
            break;


    }
}