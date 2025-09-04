// SpessaSynth Português do Brasil
// Por Lucas Gabriel (lucmsilva)
// https://github.com/lucmsilva651

import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Controlador de Sintetizador",
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

    blackMidiMode: {
        title: "Modo Black MIDI",
        description:
            "Ativa o Modo de Alto Desempenho, simplificando a aparência e eliminando as notas mais rapidamente"
    },

    disableCustomVibrato: {
        title: "Desativar vibrato personalizado",
        description:
            "Desativa permanentemente o vibrato personalizado (NRPN). Recarregue o site para reativá-lo"
    },

    helpButton: {
        title: "Ajuda",
        description: "Abre um site externo com o guia de uso"
    },

    interpolation: {
        description: "Selecione o método de interpolação do sintetizador",
        linear: "Interpolação Linear",
        nearestNeighbor: "Vizinho mais próximo",
        cubic: "Interpolação Cúbica"
    },

    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
