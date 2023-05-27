import {Sample} from "../../../soundfont/chunk/samples.js";

export class BufferNote {
    /**
     * Creates a midiNote
     * @param midiNote {number}
     * @param context {AudioContext}
     * @param sample {Sample}
     */
    constructor(midiNote, context, sample) {
        this.midiNote = midiNote;
        this.bufferNode = sample.getBufferSource(context, midiNote);
        this.gainNode = context.createGain();
        this.sample = sample;

        this.bufferNode.connect(this.gainNode);

        this.gainNode.gain.value = 0;
        this.gainNode.connect(context.destination);
    }

    startNote(gain, time){
        this.gainNode.gain
            .setTargetAtTime(gain, this.bufferNode.context.currentTime, time);

        // start the note
        this.bufferNode.start();
    }

    stopNote(){
        // smoothly fade out
        this.gainNode.gain
            .setTargetAtTime(0, this.bufferNode.context.currentTime, 0.1);
    }

    disconnectNote(){
        this.bufferNode.stop();
        this.bufferNode.disconnect(this.gainNode);
        this.gainNode.disconnect(this.gainNode.context.destination);
    }

    bendNote(pitchBend){
        // calculate normal playback rate
        const bendRatio = pitchBend / 8192 / 2;
        const newPlayback = this.sample.getPlaybackRate(this.midiNote) * Math.pow(2, bendRatio);
        this.bufferNode.playbackRate.setTargetAtTime(newPlayback, this.bufferNode.context.currentTime, 0.1);
    }
}