export class BasicInstrument
{
    /**
     * The instrument's name
     * @type {string}
     */
    instrumentName = "";
    
    /**
     * The instrument's zones
     * @type {BasicInstrumentZone[]}
     */
    instrumentZones = [];
    
    /**
     * Instrument's use count, used for trimming
     * @type {number}
     * @private
     */
    _useCount = 0;
    
    /**
     * @returns {number}
     */
    get useCount()
    {
        return this._useCount;
    }
    
    addUseCount()
    {
        this._useCount++;
        this.instrumentZones.forEach(z => z.useCount++);
    }
    
    removeUseCount()
    {
        this._useCount--;
        for (let i = 0; i < this.instrumentZones.length; i++)
        {
            if (this.safeDeleteZone(i))
            {
                i--;
            }
        }
    }
    
    deleteInstrument()
    {
        this.instrumentZones.forEach(z => z.deleteZone());
        this.instrumentZones.length = 0;
    }
    
    /**
     * @param index {number}
     * @returns {boolean} is the zone has been deleted
     */
    safeDeleteZone(index)
    {
        this.instrumentZones[index].useCount--;
        if (this.instrumentZones[index].useCount < 1)
        {
            this.deleteZone(index);
            return true;
        }
        return false;
    }
    
    /**
     * @param index {number}
     */
    deleteZone(index)
    {
        this.instrumentZones[index].deleteZone();
        this.instrumentZones.splice(index, 1);
    }
}