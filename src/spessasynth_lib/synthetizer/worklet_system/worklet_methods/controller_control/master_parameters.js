import { SYNTHESIZER_GAIN } from "../../main_processor.js";

/**
 * @param volume {number} 0 to 1
 * @this {SpessaSynthProcessor}
 */
export function setMIDIVolume(volume)
{
    // GM2 specification, section 4.1: master volume is squared
    this.midiVolume = Math.pow(volume, 2);
    this.setMasterPan(this.pan);
}

/**
 * @param volume {number} 0-1
 * @this {SpessaSynthProcessor}
 */
export function setMasterGain(volume)
{
    this.masterGain = volume * SYNTHESIZER_GAIN;
    this.setMasterPan(this.pan);
}

/**
 * @param pan {number} -1 to one
 * @this {SpessaSynthProcessor}
 */
export function setMasterPan(pan)
{
    this.pan = pan;
    // clamp to 0-1 (0 is left)
    pan = (pan / 2) + 0.5;
    this.panLeft = (1 - pan);
    this.panRight = (pan);
}