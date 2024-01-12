/**
 * @typedef {
 * "noteon"|
 * "noteoff"|
 * "pitchwheel"|
 * "controllerchange"|
 * "programchange"|
 * "drumchange"|
 * "stopall"|
 * "newchannel"} EventTypes
 */
export class EventHandler
{
    /**
     * A new synthesizer event handler
     */
    constructor() {
        /**
         * The main list of events
         * @type {Object<EventTypes, Object<string, function(Object)>>}
         */
        this.events = {
            "noteoff": {},
            "noteon": {},
            "pitchwheel": {},
            "controllerchange": {},
            "programchange": {},
            "drumchange": {},
            "stopall": {},
            "newchannel": {}
        };
    }

    /**
     * Adds a new event listener
     * @param name {EventTypes}
     * @param id {string} the unique identifier for the event (to delete it
     * @param callback {function(Object)}
     */
    addEvent(name, id, callback)
    {
        this.events[name][id] = callback;
    }

    /**
     * Removes an event listener
     * @param name {EventTypes}
     * @param id {string}
     */
    removeEvent(name, id)
    {
        delete this.events[name][id];
    }

    /**
     * Calls the given event
     * @param name {EventTypes}
     * @param eventData {Object}
     */
    callEvent(name, eventData)
    {
        if(this.events[name])
        {
            Object.values(this.events[name]).forEach(ev => ev(eventData));
        }
    }
}