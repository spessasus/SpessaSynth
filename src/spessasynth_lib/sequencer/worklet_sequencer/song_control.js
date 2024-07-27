import { WorkletSequencerReturnMessageType } from './sequencer_message.js'
import { consoleColors, formatTime } from '../../utils/other.js'
import { SpessaSynthGroupCollapsed, SpessaSynthGroupEnd, SpessaSynthInfo, SpessaSynthWarn } from '../../utils/loggin.js'
import { ticksToSeconds } from './play.js'
import { MidiData } from '../../midi_parser/midi_data.js'
import { MIDI } from '../../midi_parser/midi_loader.js'
import { getUsedProgramsAndKeys } from '../../midi_parser/used_keys_loaded.js'

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
    if (!parsedMidi.tracks)
    {
        throw "No tracks supplied!";
    }

    this.oneTickToSeconds = 60 / (120 * parsedMidi.timeDivision)

    /**
     * @type {MIDI}
     */
    this.midiData = parsedMidi;

    // check for embedded soundfont
    if(this.midiData.embeddedSoundFont !== undefined)
    {
        this.synth.reloadSoundFont(this.midiData.embeddedSoundFont);
        // preload all samples
        this.synth.soundfont.samples.forEach(s => s.getAudioData());
    }
    else
    {
        SpessaSynthGroupCollapsed("%cPreloading samples...", consoleColors.info);
        // smart preloading: load only samples used in the midi!
        const used = getUsedProgramsAndKeys(this.midiData, this.synth.soundfont);
        for (const [programBank, combos] of Object.entries(used))
        {
            const bank = parseInt(programBank.split(":")[0]);
            const program = parseInt(programBank.split(":")[1]);
            const preset = this.synth.soundfont.getPreset(bank, program);
            SpessaSynthInfo(`%cPreloading used samples on %c${preset.presetName}%c...`,
                consoleColors.info,
                consoleColors.recognized,
                consoleColors.info)
            for (const combo of combos) {
                const split = combo.split("-");
                preset.preloadSpecific(parseInt(split[0]), parseInt(split[1]));
            }
        }
        SpessaSynthGroupEnd();
    }

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
    });

    /**
     * Same as Audio.duration (seconds)
     * @type {number}
     */
    this.duration = this.midiData.duration;
    this.firstNoteTime = ticksToSeconds(this.midiData.tempoChanges, this.midiData.firstNoteOn, this.midiData.timeDivision);
    SpessaSynthInfo(`%cTotal song time: ${formatTime(Math.ceil(this.duration)).time}`, consoleColors.recognized);

    this.post(WorkletSequencerReturnMessageType.songChange, [new MidiData(this.midiData), this.songIndex]);

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
 * @param midiBuffers {MIDIFile[]}
 * @this {WorkletSequencer}
 */
export function loadNewSongList(midiBuffers)
{
    /**
     * parse the MIDIs (only the array buffers, MIDI is unchanged)
     * @type {MIDI[]}
     */
    this.songs = midiBuffers.reduce((mids, b) => {
        if(b.duration)
        {
            mids.push(b);
            return mids;
        }
        try
        {
            mids.push(new MIDI(b.binary, b.altName || ""));
        }
        catch (e)
        {
            this.post(WorkletSequencerReturnMessageType.midiError, e.message);
            return mids;
        }
        return mids;
    }, []);
    if(this.songs.length < 1)
    {
        console.log("no valid songs!")
        return;
    }
    this.songIndex = 0;
    if(this.songs.length > 1)
    {
        this.loop = false;
    }
    this.loadNewSequence(this.songs[this.songIndex]);
}

/**
 * @this {WorkletSequencer}
 */
export function nextSong()
{
    if(this.songs.length === 1)
    {
        this.currentTime = 0;
        return;
    }
    this.songIndex++;
    this.songIndex %= this.songs.length;
    this.loadNewSequence(this.songs[this.songIndex]);
}

/**
 * @this {WorkletSequencer}
 */
export function previousSong()
{
    if(this.songs.length === 1)
    {
        this.currentTime = 0;
        return;
    }
    this.songIndex--;
    if(this.songIndex < 0)
    {
        this.songIndex = this.songs.length - 1;
    }
    this.loadNewSequence(this.songs[this.songIndex]);
}