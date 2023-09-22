export class SequenceEvent
{
    /**
     * @param time {number}
     * @param eventType {number}
     * @param eventData {ShiftableByteArray}
     */
    constructor(time, eventType, eventData)
    {
        this.absoluteTime = time;
        this.eventStatusByte = eventType;
        this.eventData = eventData;
    }
}