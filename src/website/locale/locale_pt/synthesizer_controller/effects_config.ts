// SpessaSynth Português do Brasil
// Por Lucas Gabriel (lucmsilva)
// https://github.com/lucmsilva651

export const effectsConfig = {
    misc: {
        title: "Configurações",

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

        interpolation: {
            description: "Selecione o método de interpolação do sintetizador",
            linear: "Interpolação Linear",
            nearestNeighbor: "Vizinho mais próximo",
            cubic: "Interpolação Cúbica"
        }
    },
    reverb: {
        title: "Configuração do Reverb",
        description: "Configure o processador de reverb"
    },

    chorus: {
        title: "Configuração do Chorus",
        description: "Configure o processador de chorus"
    }
};
