// SpessaSynth Português do Brasil
// Por Lucas Gabriel (lucmsilva)
// https://github.com/lucmsilva651

import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Controlador de Sintetizador (S)",
        description: "Mostra o controlador do sintetizador"
    },

    // Meters
    mainVoiceMeter: {
        title: "Voices: ",
        description: "A quantidade total de vozes atualmente tocando"
    },

    mainVolumeMeter: {
        title: "Volume: ",
        description: "O volume mestre atual do sintetizador"
    },

    mainPanMeter: {
        title: "Pan: ",
        description: "A panorâmica estéreo mestre atual do sintetizador"
    },

    mainTransposeMeter: {
        title: "Transposição: ",
        description: "Transpõe o sintetizador (em semitons ou teclas)"
    },

    // Buttons
    midiPanic: {
        title: "Pânico MIDI",
        description: "Para todas as vozes imediatamente"
    },

    systemReset: {
        title: "Reiniciar Sistema",
        description: "Redefine todos os controladores para seus valores padrão"
    },

    helpButton: {
        title: "Ajuda",
        description: "Abre um site externo com o guia de uso"
    },

    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
