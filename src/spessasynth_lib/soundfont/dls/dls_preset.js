import { BasicPreset } from "../basic_soundfont/basic_preset.js";
import { BasicPresetZone } from "../basic_soundfont/basic_zones.js";
import { BasicInstrument } from "../basic_soundfont/basic_instrument.js";

export class DLSPreset extends BasicPreset
{
    /**
     * Creates a new DLS preset
     * @param dls {BasicSoundBank}
     * @param ulBank {number}
     * @param ulInstrument {number}
     */
    constructor(dls, ulBank, ulInstrument)
    {
        // use stock default modulators, dls won't ever have DMOD chunk
        super(dls);
        this.program = ulInstrument & 127;
        const bankMSB = (ulBank >> 8) & 127;
        const bankLSB = ulBank & 127;
        // switch accordingly
        if (bankMSB > 0)
        {
            this.bank = bankMSB;
        }
        else
        {
            this.bank = bankLSB;
        }
        const isDrums = ulBank >> 31;
        if (isDrums)
        {
            // soundfont bank is 128, so we change it here
            this.bank = 128;
        }
        
        this.DLSInstrument = new BasicInstrument();
        this.DLSInstrument.addUseCount();
        
        const zone = new BasicPresetZone();
        zone.instrument = this.DLSInstrument;
        
        this.presetZones = [zone];
    }
}