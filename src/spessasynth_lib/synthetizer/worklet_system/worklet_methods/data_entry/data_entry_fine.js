import { consoleColors } from "../../../../utils/other.js";
import { SpessaSynthInfo } from "../../../../utils/loggin.js";
import { modulatorSources } from "../../../../soundfont/basic_soundfont/modulator.js";
import { customControllers, dataEntryStates, NON_CC_INDEX_OFFSET } from "../../worklet_utilities/controller_tables.js";

/**
 * Executes a data entry for an RPN tuning
 * @param channel {number}
 * @param dataValue {number} dataEntry LSB
 * @this {SpessaSynthProcessor}
 * @private
 */
export function dataEntryFine(channel, dataValue)
{
    const channelObject = this.workletProcessorChannels[channel];
    switch (channelObject.dataEntryState)
    {
        default:
            break;
        
        case dataEntryStates.RPCoarse:
        case dataEntryStates.RPFine:
            switch (channelObject.RPValue)
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
                    channelObject.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] |= dataValue;
                    const actualTune = (channelObject.midiControllers[NON_CC_INDEX_OFFSET + modulatorSources.pitchWheelRange] >> 7) + dataValue / 127;
                    SpessaSynthInfo(
                        `%cChannel ${channel} bend range. Semitones: %c${actualTune}`,
                        consoleColors.info,
                        consoleColors.value
                    );
                    break;
                
                // fine-tuning
                case 0x0001:
                    // grab the data and shift
                    const coarse = channelObject.customControllers[customControllers.channelTuning];
                    const finalTuning = (coarse << 7) | dataValue;
                    this.setChannelTuning(channel, finalTuning * 0.01220703125); // multiply by 8192 / 100 (cent increments)
                    break;
                
                // modulation depth
                case 0x0005:
                    const currentModulationDepthCents = channelObject.customControllers[customControllers.modulationMultiplier] * 50;
                    let cents = currentModulationDepthCents + (dataValue / 128) * 100;
                    this.setModulationDepth(channel, cents);
                    break;
                
                case 0x3FFF:
                    this.resetParameters(channel);
                    break;
                
            }
        
    }
}