/**
 * synth_event_handler.js
 * purpose: manages the synthesizer's event system, calling assinged functions when synthesizer requests dispatching the event
 */

/**
 *
 * @typedef {{
 *     midiNote: number,
 *     channel: number,
 *     velocity: number
 * }} NoteOnCallback
 *
 * @typedef {{
 *     midiNote: number,
 *     channel: number
 * }} NoteOffCallback
 *
 * @typedef {{
 *     channel: number,
 *     isDrumChannel: boolean
 * }} DrumChangeCallback
 *
 * @typedef {{
 *     channel: number,
 *     program: number,
 *     bank: number,
 *     userCalled: boolean
 * }} ProgramChangeCallback
 *
 * @typedef {{
 *     channel: number,
 *     controllerNumber: number,
 *     controllerValue: number
 * }} ControllerChangeCallback
 *
 * @typedef {{
 *     channel:number,
 *     isMuted: boolean
 * }} MuteChannelCallback
 *
 * @typedef {{
 *     presetName: string,
 *     bank: number,
 *     program: number
 * }[]} PresetListChangeCallback
 *
 *
 * @typedef {{
 *     channel: number,
 *     MSB: number,
 *     LSB: number
 * }} PitchWheelCallback
 *
 * @typedef {{
 *     channel: number,
 *     pressure: number
 * }} ChannelPressureCallback
 *
 * @typedef {string} SoundfontErrorCallback
 *
 *
 * @typedef {
 *     NoteOnCallback |
 *     NoteOffCallback |
 *     DrumChangeCallback |
 *     ProgramChangeCallback |
 *     ControllerChangeCallback |
 *     MuteChannelCallback |
 *     PresetListChangeCallback |
 *     PitchWheelCallback |
 *     SoundfontErrorCallback |
 *     ChannelPressureCallback |
 *     undefined
 * } EventCallbackData
 */

/**
 * @typedef {
 * "noteon"|
 * "noteoff"|
 * "pitchwheel"|
 * "controllerchange"|
 * "programchange"|
 * "channelpressure"|
 * "polypressure" |
 * "drumchange"|
 * "stopall"|
 * "newchannel"|
 * "mutechannel"|
 * "presetlistchange"|
 * "allcontrollerreset"|
 * "soundfonterror"} EventTypes
 */
export class EventHandler
{
    /**
     * A new synthesizer event handler
     */
    constructor() {
        /**
         * The main list of events
         * @type {Object<EventTypes, Object<string, function(EventCallbackData)>>}
         */
        this.events = {
            "noteoff": {},
            "noteon": {},
            "pitchwheel": {},
            "controllerchange": {},
            "programchange": {},
            "channelpressure": {},
            "polypressure": {},
            "drumchange": {},
            "stopall": {},
            "newchannel": {},
            "mutechannel": {},
            "presetlistchange": {},
            "allcontrollerreset": {},
            "soundfonterror": {}
        };
    }

    /**
     * Adds a new event listener
     * @param name {EventTypes}
     * @param id {string} the unique identifier for the event (to delete it
     * @param callback {function(EventCallbackData)}
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
     * @param eventData {EventCallbackData}
     */
    callEvent(name, eventData)
    {
        if(this.events[name])
        {
            Object.values(this.events[name]).forEach(ev => ev(eventData));
        }
    }
}