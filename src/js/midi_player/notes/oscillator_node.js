export class OscillatorNote {
    /**
     * Creates a midiNote
     * @param midiNote {number}
     * @param node {AudioNode}
     */
    constructor(midiNote, node) {
        this.midiNote = midiNote;
        this.oscillatorNode = node.context.createOscillator();
        this.gainNode = node.context.createGain();

        this.oscillatorNode.connect(this.gainNode);
        this.oscillatorNode.frequency.value = this.getFrequency(midiNote);
        this.oscillatorNode.type = "triangle";

        this.gainNode.gain.setValueAtTime(0.1, this.oscillatorNode.context.currentTime + 0.00001);
        this.gainNode.gain.value = 0.1;
        this.gainNode.connect(node);
        this.targetNode = node;
    }

    getFrequency(midiNote, pitchBend = 0) {
        let bendRatio = pitchBend / 8192 / 2;
        return (Math.pow(2, (midiNote - 69) / 12) * 440) * Math.pow(2, bendRatio);
    }

    startNote(velocity){
        this.gainNode.gain
            .setTargetAtTime(velocity / 127, this.oscillatorNode.context.currentTime + 0.0001, 0.062);

        // start the note
        this.oscillatorNode.start();
    }

    async stopNote(){
        // smoothly fade out
        this.gainNode.gain
            .setTargetAtTime(0, this.oscillatorNode.context.currentTime, 0.1);
        await new Promise(r => setTimeout(r, 100));
        return true;
    }

    disconnectNote(){
        this.oscillatorNode.stop();
        this.oscillatorNode.disconnect(this.gainNode);
        this.gainNode.disconnect(this.targetNode);
    }

    bendNote(bend){
        this.oscillatorNode.frequency
            .setTargetAtTime(
                this.getFrequency(this.midiNote, bend),
                this.oscillatorNode.context.currentTime,
                0);
    }
}