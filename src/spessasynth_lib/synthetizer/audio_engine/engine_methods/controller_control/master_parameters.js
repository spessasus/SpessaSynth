import { SYNTHESIZER_GAIN } from "../../main_processor.js";

/**
 * @enum {number}
 */
export const masterParameterType = {
    mainVolume: 0,
    masterPan: 1,
    voicesCap: 2,
    interpolationType: 3,
    midiSystem: 4
};

/**
 * @this {SpessaSynthProcessor}
 * @param type {masterParameterType}
 * @param value {number|string|interpolationTypes}
 */
export function setMasterParameter(type, value)
{
    switch (type)
    {
        case masterParameterType.masterPan:
            let pan = value;
            this.pan = pan;
            // clamp to 0-1 (0 is left)
            pan = (pan / 2) + 0.5;
            this.panLeft = (1 - pan);
            this.panRight = (pan);
            break;
        
        case masterParameterType.mainVolume:
            this.masterGain = value * SYNTHESIZER_GAIN;
            this.setMasterParameter(masterParameterType.masterPan, this.pan);
            break;
        
        case masterParameterType.voicesCap:
            this.voiceCap = value;
            break;
        
        case masterParameterType.interpolationType:
            this.interpolationType = value;
            break;
        
        case masterParameterType.midiSystem:
            this.setSystem(value);
    }
}