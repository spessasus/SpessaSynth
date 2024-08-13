import { BasicZone } from './basic_zone.js'

export class BasicInstrumentZone extends BasicZone
{
    constructor()
    {
        super()
        /**
         * Zone's sample. Undefined if global
         * @type {BasicSample|undefined}
         */
        this.sample = undefined
        this.useCount = 0
    }

    deleteZone()
    {
        this.useCount--
        if (this.isGlobal)
        {
            return
        }
        this.sample.useCount--
    }
}

export class BasicPresetZone extends BasicZone
{
    constructor()
    {
        super()
        /**
         * Zone's instrument. Undefined if global
         * @type {BasicInstrument|undefined}
         */
        this.instrument = undefined
    }

    deleteZone()
    {
        if(this.isGlobal)
        {
            return;
        }
        this.instrument.removeUseCount();
    }
}