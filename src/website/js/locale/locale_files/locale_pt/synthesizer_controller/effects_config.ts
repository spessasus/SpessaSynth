// SpessaSynth Português do Brasil
// por Lucas Gabriel (lucmsilva)
// https://github.com/lucmsilva651

export const effectsConfig = {
    button: {
        title: "Configurações de Efeitos",
        description: "Configure os efeitos de chorus e reverb, além do vibrato personalizado"
    },
    reverbConfig: {
        title: "Configuração do Reverb",
        description: "Configure o processador de reverb",
        impulseResponse: {
            title: "Resposta ao impulso",
            description: "Selecione a resposta ao impulso para o reverb convolver"
        }
    },
    
    chorusConfig: {
        title: "Configuração do Chorus",
        description: "Configure o processador de chorus",
        nodesAmount: {
            title: "Quantidade de nós",
            description: "A quantidade de nós de atraso (para cada canal estéreo) a serem usados"
        },
        defaultDelay: {
            title: "Atraso (s)",
            description: "O tempo de atraso para o primeiro nó em segundos"
        },
        delayVariation: {
            title: "Incremento de atraso (s)",
            description: "A quantidade para incrementar cada nó de atraso após o primeiro em segundos"
        },
        stereoDifference: {
            title: "Diferença estéreo (s)",
            description: "A diferença de atrasos entre dois canais (adicionada ao canal esquerdo e subtraída do direito)"
        },
        oscillatorFrequency: {
            title: "Frequência do LFO (Hz)",
            description: "A frequência do LFO do primeiro nó de atraso, em Hz. O LFO controla o tempo de atraso."
        },
        frequencyVariation: {
            title: "Incremento do LFO (Hz)",
            description: "A quantidade para incrementar a frequência de cada LFO após o primeiro, em Hz"
        },
        oscillatorGain: {
            title: "Ganho do LFO (s)",
            description: "Quanto o LFO alterará o atraso nos nós de atraso, em segundos"
        },
        apply: {
            title: "Aplicar",
            description: "Aplicar as configurações selecionadas"
        }
    }
};
