/**
 * synth_event_handler.js
 * purpose: manages the synthesizer's event system, calling assinged functions when synthesizer requests dispatching the event
 */

/**
 * @typedef {Object} NoteOnCallback
 * @property {number} midiNote - The MIDI note number.
 * @property {number} channel - The MIDI channel number.
 * @property {number} velocity - The velocity of the note.
 */

/**
 * @typedef {Object} NoteOffCallback
 * @property {number} midiNote - The MIDI note number.
 * @property {number} channel - The MIDI channel number.
 */

/**
 * @typedef {Object} DrumChangeCallback
 * @property {number} channel - The MIDI channel number.
 * @property {boolean} isDrumChannel - Indicates if the channel is a drum channel.
 */

/**
 * @typedef {Object} ProgramChangeCallback
 * @property {number} channel - The MIDI channel number.
 * @property {number} program - The program number.
 * @property {number} bank - The bank number.
 * @property {boolean} userCalled - Indicates if the change was user-initiated.
 */

/**
 * @typedef {Object} ControllerChangeCallback
 * @property {number} channel - The MIDI channel number.
 * @property {number} controllerNumber - The controller number.
 * @property {number} controllerValue - The value of the controller.
 */

/**
 * @typedef {Object} MuteChannelCallback
 * @property {number} channel - The MIDI channel number.
 * @property {boolean} isMuted - Indicates if the channel is muted.
 */

/**
 * @typedef {Object} PresetListChangeCallback
 * @property {string} presetName - The name of the preset.
 * @property {number} bank - The bank number.
 * @property {number} program - The program number.
 */

/**
 * @typedef {Object} PitchWheelCallback
 * @property {number} channel - The MIDI channel number.
 * @property {number} MSB - The most significant byte of the pitch wheel value.
 * @property {number} LSB - The least significant byte of the pitch wheel value.
 */

/**
 * @typedef {Object} ChannelPressureCallback
 * @property {number} channel - The MIDI channel number.
 * @property {number} pressure - The pressure value.
 */

/**
 * @typedef {string} SoundfontErrorCallback - The error message for soundfont errors.
 */

/**
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
    constructor()
    {
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
        
        /**
         * Set to 0 to disabled, otherwise in seconds
         * @type {number}
         */
        this.timeDelay = 0;
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
        if (this.events[name])
        {
            if (this.timeDelay > 0)
            {
                setTimeout(() =>
                {
                    Object.values(this.events[name]).forEach(ev =>
                    {
                        try
                        {
                            ev(eventData);
                        }
                        catch (e)
                        {
                            console.error(`Error while executing an event callback for ${name}:`, e);
                        }
                    });
                }, this.timeDelay * 1000);
            }
            else
            {
                Object.values(this.events[name]).forEach(ev =>
                    {
                        try
                        {
                            ev(eventData);
                        }
                        catch (e)
                        {
                            console.error(`Error while executing an event callback for ${name}:`, e);
                        }
                    }
                );
            }
        }
    }
}