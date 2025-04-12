import { consoleColors } from "../../../../utils/other.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";
import { customControllers, dataEntryStates, NON_CC_INDEX_OFFSET } from "../../engine_components/controller_tables.js";
import { midiControllers } from "../../../../midi/midi_message.js";

/**
 * Executes a data entry for an RPN tuning
 * @param dataValue {number} dataEntry LSB
 * @this {MidiAudioChannel}
 * @private
 */
export function dataEntryFine(dataValue)
{
    switch (this.dataEntryState)
    {
        default:
            break;
        
        case dataEntryStates.RPCoarse:
        case dataEntryStates.RPFine:
            const rpnValue = this.midiControllers[midiControllers.RPNMsb] | (this.midiControllers[midiControllers.RPNLsb] >> 7);
            switch (rpnValue)
            {
                default:
                    break;
                
                // pitch bend range fine tune
                case 0x0000:
                    if (dataValue === 0)
                    {
                        break;
                    }
                    // 14-bit value, so upper 7 are coarse and lower 7 are fine!
                    this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] |= dataValue;
                    const actualTune = (this.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] >> 7) + dataValue / 128;
                    SpessaSynthInfo(
                        `%cChannel ${this.channelNumber} bend range. Semitones: %c${actualTune}`,
                        consoleColors.info,
                        consoleColors.value
                    );
                    break;
                
                // fine-tuning
                case 0x0001:
                    // grab the data and shift
                    const coarse = this.customControllers[customControllers.channelTuning];
                    const finalTuning = (coarse << 7) | dataValue;
                    this.setTuning(finalTuning * 0.01220703125); // multiply by 8192 / 100 (cent increments)
                    break;
                
                // modulation depth
                case 0x0005:
                    const currentModulationDepthCents = this.customControllers[customControllers.modulationMultiplier] * 50;
                    let cents = currentModulationDepthCents + (dataValue / 128) * 100;
                    this.setModulationDepth(cents);
                    break;
                
                case 0x3FFF:
                    this.resetParameters();
                    break;
                
            }
        
    }
}