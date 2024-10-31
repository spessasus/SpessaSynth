// SpessaSynth Português do Brasil
// por Lucas Gabriel (lucmsilva)
// https://github.com/lucmsilva651

import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

/**
 *
 * @type {CompleteLocaleTypedef}
 */
export const localePortuguese = {
    localeName: "Português (Brasil)",
    // title messsage
    titleMessage: "SpessaSynth: Sintetizador JavaScript SoundFont2",
    demoTitleMessage: "SpessaSynth: Demo Online do Sintetizador JavaScript SoundFont2",
    
    synthInit: {
        genericLoading: "Carregando...",
        loadingSoundfont: "Carregando SoundFont...",
        loadingBundledSoundfont: "Carregando SoundFont embutida...",
        startingSynthesizer: "Iniciando sintetizador...",
        savingSoundfont: "Salvando SoundFont para reutilização...",
        noWebAudio: "Seu navegador não suporta Web Audio.",
        done: "Pronto!"
    },
    
    // top bar buttons
    midiUploadButton: "Envie seus arquivos MIDI",
    
    exportAudio: exportAudio,
    
    yes: "Sim",
    no: "Não",
    
    demoSoundfontUploadButton: "Envie a SoundFont",
    demoGithubPage: "Página do projeto",
    demoSongButton: "Música de demonstração",
    credits: "Créditos",
    dropPrompt: "Solte os arquivos aqui...",
    
    warnings: {
        outOfMemory: "Seu navegador ficou sem memória. Tente usar o Firefox ou uma SoundFont SF3 (veja o console para detalhes).",
        noMidiSupport: "Nenhuma porta MIDI detectada, essa função será desativada.",
        chromeMobile: "SpessaSynth pode ter um desempenho reduzido no Chrome Mobile. Considere usar o Firefox para Android.",
        warning: "Atenção"
    },
    hideTopBar: {
        title: "Ocultar barra superior",
        description: "Oculte a barra de título para uma experiência mais imersiva"
    },
    
    convertDls: {
        title: "Conversão DLS",
        message: "Parece que você enviou um arquivo DLS. Quer converter para SF2?"
    },
    
    // all translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
};