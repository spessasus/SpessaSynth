import { BasicZone } from "./basic_zone.js";

export class BasicInstrumentZone extends BasicZone
{
    /**
     * Zone's sample. Undefined if global
     * @type {BasicSample|undefined}
     */
    sample = undefined;
    /**
     * The zone's use count
     * @type {number}
     */
    useCount = 0;
    
    deleteZone()
    {
        this.useCount--;
        if (this.isGlobal)
        {
            return;
        }
        this.sample.useCount--;
    }
}

export class BasicPresetZone extends BasicZone
{
    /**
     * Zone's instrument. Undefined if global
     * @type {BasicInstrument|undefined}
     */
    instrument = undefined;
    
    deleteZone()
    {
        if (this.isGlobal)
        {
            return;
        }
        this.instrument.removeUseCount();
    }
}