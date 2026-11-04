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

        interpolation: {
            description: "Selecione o método de interpolação do sintetizador",
            linear: "Interpolação Linear",
            nearestNeighbor: "Vizinho mais próximo",
            cubic: "Interpolação Cúbica",
            sinc32: "Interpolação Sinc (32 pontos)",
            sinc128: "Interpolação Sinc (128 pontos, muito lenta)"
        }
    },
    reverb: {
        title: "Configuração do Reverb GS",
        description: "Configure o processador de reverb"
    },

    chorus: {
        title: "Configuração do Chorus GS",
        description: "Configure o processador de chorus"
    }
};
