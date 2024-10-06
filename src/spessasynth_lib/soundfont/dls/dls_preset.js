import { BasicPreset } from "../basic_soundfont/basic_preset.js";
import { BasicPresetZone } from "../basic_soundfont/basic_zones.js";
import { BasicInstrument } from "../basic_soundfont/basic_instrument.js";
import { defaultModulators } from "../basic_soundfont/modulator.js";

export class DLSPreset extends BasicPreset
{
    /**
     * Creates a new DLS preset
     * @param ulBank {number}
     * @param ulInstrument {number}
     */
    constructor(ulBank, ulInstrument)
    {
        // use stock default modulators, dls won't ever have DMOD chunk
        super(defaultModulators);
        this.program = ulInstrument & 127;
        this.bank = (ulBank >> 8) & 127;
        const isDrums = ulBank >> 31;
        if (isDrums)
        {
            // soundfont bank is 128 so we change it here
            this.bank = 128;
        }
        
        this.DLSInstrument = new BasicInstrument();
        this.DLSInstrument.addUseCount();
        
        const zone = new BasicPresetZone();
        zone.instrument = this.DLSInstrument;
        
        this.presetZones = [zone];
    }
}