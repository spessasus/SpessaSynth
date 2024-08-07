import { SpessaSynthProcessor } from './main_processor.js'
import { releaseVoice, renderVoice, voiceKilling } from './worklet_methods/voice_control.js'
import { handleMessage } from './message_protocol/handle_message.js'
import { callEvent, post, sendChannelProperties } from './message_protocol/message_sending.js'
import { systemExclusive } from './worklet_methods/system_exclusive.js'
import { noteOn } from './worklet_methods/note_on.js'
import { killNote, noteOff, stopAll, stopAllChannels } from './worklet_methods/note_off.js'
import {
    channelPressure, pitchWheel,
    polyPressure, setChannelTuning, setChannelTuningSemitones, setMasterTuning, setModulationDepth, setOctaveTuning,
    transposeAllChannels,
    transposeChannel,
} from './worklet_methods/tuning_control.js'
import {
    controllerChange,
    muteChannel,
    setMasterGain,
    setMasterPan,
    setMIDIVolume,
} from './worklet_methods/controller_control.js'
import { disableAndLockVibrato, setVibrato } from './worklet_methods/vibrato_control.js'
import { dataEntryCoarse, dataEntryFine } from './worklet_methods/data_entry.js'
import { createWorkletChannel } from './worklet_utilities/worklet_processor_channel.js'
import { resetAllControllers, resetControllers, resetParameters } from './worklet_methods/reset_controllers.js'
import {
    clearSoundFont,
    getPreset,
    programChange,
    reloadSoundFont, sampleDump, sendPresetList,
    setDrums,
    setPreset,
} from './worklet_methods/program_control.js'
import { applySynthesizerSnapshot, sendSynthesizerSnapshot } from './worklet_methods/snapshot.js'

// include other methods
// voice related
SpessaSynthProcessor.prototype.renderVoice = renderVoice;
SpessaSynthProcessor.prototype.releaseVoice = releaseVoice;
SpessaSynthProcessor.prototype.voiceKilling = voiceKilling;

// message port related
SpessaSynthProcessor.prototype.handleMessage = handleMessage;
SpessaSynthProcessor.prototype.post = post;
SpessaSynthProcessor.prototype.sendChannelProperties = sendChannelProperties;
SpessaSynthProcessor.prototype.callEvent = callEvent;

// system exlcusive related
SpessaSynthProcessor.prototype.systemExclusive = systemExclusive;

// note messages related
SpessaSynthProcessor.prototype.noteOn = noteOn;
SpessaSynthProcessor.prototype.noteOff = noteOff;
SpessaSynthProcessor.prototype.polyPressure = polyPressure;
SpessaSynthProcessor.prototype.killNote = killNote;
SpessaSynthProcessor.prototype.stopAll = stopAll;
SpessaSynthProcessor.prototype.stopAllChannels = stopAllChannels;
SpessaSynthProcessor.prototype.muteChannel = muteChannel;

// custom vibrato related
SpessaSynthProcessor.prototype.setVibrato = setVibrato;
SpessaSynthProcessor.prototype.disableAndLockVibrato = disableAndLockVibrato;

// data entry related
SpessaSynthProcessor.prototype.dataEntryCoarse = dataEntryCoarse;
SpessaSynthProcessor.prototype.dataEntryFine = dataEntryFine;

// channel related
SpessaSynthProcessor.prototype.createWorkletChannel = createWorkletChannel;
SpessaSynthProcessor.prototype.controllerChange = controllerChange;
SpessaSynthProcessor.prototype.channelPressure = channelPressure;
SpessaSynthProcessor.prototype.resetAllControllers = resetAllControllers;
SpessaSynthProcessor.prototype.resetControllers = resetControllers;
SpessaSynthProcessor.prototype.resetParameters = resetParameters;

// master parameter related
SpessaSynthProcessor.prototype.setMasterGain = setMasterGain;
SpessaSynthProcessor.prototype.setMasterPan = setMasterPan;
SpessaSynthProcessor.prototype.setMIDIVolume = setMIDIVolume;

// tuning related
SpessaSynthProcessor.prototype.transposeAllChannels = transposeAllChannels;
SpessaSynthProcessor.prototype.transposeChannel = transposeChannel;
SpessaSynthProcessor.prototype.setChannelTuning = setChannelTuning;
SpessaSynthProcessor.prototype.setChannelTuningSemitones = setChannelTuningSemitones;
SpessaSynthProcessor.prototype.setMasterTuning = setMasterTuning;
SpessaSynthProcessor.prototype.setModulationDepth = setModulationDepth;
SpessaSynthProcessor.prototype.pitchWheel = pitchWheel;
SpessaSynthProcessor.prototype.setOctaveTuning = setOctaveTuning;

// program related
SpessaSynthProcessor.prototype.programChange = programChange;
SpessaSynthProcessor.prototype.getPreset = getPreset;
SpessaSynthProcessor.prototype.setPreset = setPreset;
SpessaSynthProcessor.prototype.setDrums = setDrums;
SpessaSynthProcessor.prototype.reloadSoundFont = reloadSoundFont;
SpessaSynthProcessor.prototype.clearSoundFont = clearSoundFont;
SpessaSynthProcessor.prototype.sampleDump = sampleDump;
SpessaSynthProcessor.prototype.sendPresetList = sendPresetList;

// snapshot related
SpessaSynthProcessor.prototype.sendSynthesizerSnapshot = sendSynthesizerSnapshot;
SpessaSynthProcessor.prototype.applySynthesizerSnapshot = applySynthesizerSnapshot;

export {SpessaSynthProcessor}