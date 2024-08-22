import { BasicPreset } from '../basic_soundfont/basic_preset.js'

export class DLSPreset extends BasicPreset
{
    /**
     * Creates a new DLS preset
     * @param ulBank {number} the ULONG value
     * @param ulInstrument {number} the ULONG value
     * @param regionsAmount {number}
     */
    constructor(ulBank, ulInstrument, regionsAmount)
    {
        super();
        this.regionsAmount = regionsAmount;
        this.program = ulInstrument & 127;
        this.bank = (ulBank >> 8) & 127;
        const isDrums = ulInstrument & (1 << 31);
        if(isDrums)
        {
            console.log("DEUMS")
        }
        console.log(this.bank, this.program)

    }
}