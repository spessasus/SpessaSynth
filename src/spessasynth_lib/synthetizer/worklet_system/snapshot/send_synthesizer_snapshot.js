import { returnMessageType } from "../message_protocol/worklet_message.js";
import { SynthesizerSnapshot } from "./synthesizer_snapshot.js";

/**
 * sends a snapshot of the current controller values of the synth (used to copy that data to OfflineAudioContext when rendering)
 * @this {SpessaSynthProcessor}
 */
export function sendSynthesizerSnapshot()
{
    this.post({
        messageType: returnMessageType.synthesizerSnapshot,
        messageData: SynthesizerSnapshot.createSynthesizerSnapshot(this)
    });
}