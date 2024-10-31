// SpessaSynth Português do Brasil
// por Lucas Gabriel (lucmsilva)
// https://github.com/lucmsilva651

import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

/**
 *
 * @type {{systemReset: {description: string, title: string}, disableCustomVibrato: {description: string, title: string}, mainTransposeMeter: {description: string, title: string}, mainVoiceMeter: {description: string, title: string}, midiPanic: {description: string, title: string}, mainPanMeter: {description: string, title: string}, mainVolumeMeter: {description: string, title: string}, toggleButton: {description: string, title: string}, channelController: {transposeMeter: {description: string, title: string}, voiceMeter: {description: string, title: string}, modulationWheelMeter: {description: string, title: string}, expressionMeter: {description: string, title: string}, panMeter: {description: string, title: string}, presetSelector: {description: string}, presetReset: {description: string}, pitchBendMeter: {description: string, title: string}, reverbMeter: {description: string, title: string}, volumeMeter: {description: string, title: string}, drumToggleButton: {description: string}, muteButton: {description: string}, chorusMeter: {description: string, title: string}}, blackMidiMode: {description: string, title: string}}}
 */
export const synthesizerControllerLocale = {
    toggleButton: {
        title: "Controlador de Sintetizador",
        description: "Mostra o controlador do sintetizador"
    },
    
    // meters
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
    
    // buttons
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
        description: "Ativa o Modo de Alto Desempenho, simplificando a aparência e eliminando as notas mais rapidamente"
    },
    
    disableCustomVibrato: {
        title: "Desativar vibrato personalizado",
        description: "Desativa permanentemente o vibrato personalizado (NRPN). Recarregue o site para reativá-lo"
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
