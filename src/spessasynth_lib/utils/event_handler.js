/**
 * @typedef {
 * "noteon"|
 * "noteoff"|
 * "pitchwheel"|
 * "controllerchange"|
 * "programchange"|
 * "drumchange"|
 * "stopall"} EventTypes
 */
export class EventHandler
{
    /**
     * A new synthesizer event handler
     */
    constructor() {
        /**
         * The main list of events
         * @type {Object<EventTypes, function(Object)[]>}
         */
        this.events = {};
    }

    /**
     * Adds a new event listener
     * @param name {EventTypes}
     * @param callback {function(Object)}
     */
    addEvent(name, callback)
    {
        if(this.events[name])
        {
            this.events[name].push(callback);
        }
        else
        {
            this.events[name] = [callback];
        }
    }

    /**
     * Removes an event listener
     * @param name {EventTypes}
     * @param callback {function(Object)}
     */
    removeEvent(name, callback)
    {
        this.events[name].splice(this.events[name].findIndex(c => c === callback), 1);
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
            this.events[name].forEach(ev => ev(eventData));
        }
    }
}