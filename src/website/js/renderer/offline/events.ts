import type {
    MIDISystem,
    SequencerEventCallback,
    SynthesizerEventCallback
} from "spessasynth_core";

/**
 * Initial state of the synthesizer when starting render.
 */
export interface VideoInitialParams {
    global: {
        systemKeyShift: number;
        systemFineTune: number;
        midiKeyShift: number;
        midiFineTune: number;
        system: MIDISystem;
    };
    channel: {
        systemKeyShift: number;
        systemFineTune: number;
        midiKeyShift: number;
        midiFineTune: number;
        pitchWheel: number;
        pitchWheelRange: number;
        efxAssign: boolean;
    }[];
    programs: { name: string; isDrum: boolean }[];
}

/**
 * A timestamped synthesizer or sequencer event to replay when rendering a video.
 */
export type VideoEvent = (SynthesizerEventCallback | SequencerEventCallback) & {
    /**
     * The time of the event, in seconds.
     */
    t: number;
};

/**
 * The initial state of the synthesizer and the events to replay when rendering.
 */
export interface VideoSynthData {
    /**
     * Initial parameters for the video rendering.
     */
    initialState: VideoInitialParams;
    /**
     * All events to replay.
     */
    events: VideoEvent[];
}
