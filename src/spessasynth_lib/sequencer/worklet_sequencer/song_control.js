import { WorkletSequencerReturnMessageType } from './sequencer_message.js'
import { consoleColors, formatTime } from '../../utils/other.js'
import { SpessaSynthInfo, SpessaSynthWarn } from '../../utils/loggin.js'
import { ticksToSeconds } from './play.js'

/**
 * @param trackNum {number}
 * @param port {number}
 * @this {WorkletSequencer}
 */
export function assignMIDIPort(trackNum, port)
{
    // assign new 16 channels if the port is not occupied yet
    if(this.midiPortChannelOffset === 0)
    {
        this.midiPortChannelOffset += 16;
        this.midiPortChannelOffsets[port] = 0;
    }

    if(this.midiPortChannelOffsets[port] === undefined)
    {
        if(this.synth.workletProcessorChannels.length < this.midiPortChannelOffset + 15)
        {
            this._addNewMidiPort();
        }
        this.midiPortChannelOffsets[port] = this.midiPortChannelOffset;
        this.midiPortChannelOffset += 16;
    }

    this.midiPorts[trackNum] = port;
}

/**
 * Loads a new sequence
 * @param parsedMidi {MIDI}
 * @this {WorkletSequencer}
 */
export function loadNewSequence(parsedMidi)
{
    this.stop();
    if (!parsedMidi.tracks) {
        throw "No tracks supplied!";
    }

    this.oneTickToSeconds = 60 / (120 * parsedMidi.timeDivision)

    /**
     * @type {MIDI}
     */
    this.midiData = parsedMidi;

    /**
     * merge the tracks
     * @type {MidiMessage[]}
     */
    //this.events = this.midiData.tracks.flat();
    //this.events.sort((e1, e2) => e1.ticks - e2.ticks);

    /**
     * the midi track data
     * @type {MidiMessage[][]}
     */
    this.tracks = this.midiData.tracks;

    // clear last port data
    this.midiPortChannelOffset = 0;
    this.midiPortChannelOffsets = {};
    // copy over the port data
    this.midiPorts = this.midiData.midiPorts;

    // assign port offsets
    this.midiData.midiPorts.forEach((port, trackIndex) => {
        this.assignMIDIPort(trackIndex, port);
    })

    /**
     * Same as Audio.duration (seconds)
     * @type {number}
     */
    this.duration = this.midiData.duration;
    this.firstNoteTime = ticksToSeconds(this.midiData.tempoChanges, this.midiData.firstNoteOn, this.midiData.timeDivision);
    SpessaSynthInfo(`%cTotal song time: ${formatTime(Math.ceil(this.duration)).time}`, consoleColors.recognized);

    this.post(WorkletSequencerReturnMessageType.songChange, [this.midiData, this.songIndex]);

    this.synth.resetAllControllers();
    if(this.duration <= 1)
    {
        SpessaSynthWarn(`%cVery short song: (${formatTime(Math.round(this.duration)).time}). Disabling loop!`,
            consoleColors.warn);
        this.loop = false;
    }
    this.play(true);
}

/**
 * @param parsedMidis {MIDI[]}
 * @this {WorkletSequencer}
 */
export function loadNewSongList(parsedMidis)
{
    this.songs = parsedMidis;
    this.songIndex = 0;
    this.loadNewSequence(this.songs[this.songIndex]);
}

/**
 * @this {WorkletSequencer}
 */
export function nextSong()
{
    this.songIndex++;
    this.songIndex %= this.songs.length;
    this.loadNewSequence(this.songs[this.songIndex]);
}

/**
 * @this {WorkletSequencer}
 */
export function previousSong()
{
    this.songIndex--;
    if(this.songIndex < 0)
    {
        this.songIndex = this.songs.length - 1;
    }
    this.loadNewSequence(this.songs[this.songIndex]);
}