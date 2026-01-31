export const effectsConfig = {
    button: {
        title: "Konfiguracja efektów",
        description:
            "Skonfiguruj efekt pogłosu i chóru oraz wyłącz niestandardowe wibrato"
    },
    reverbConfig: {
        title: "Konfiguracja pogłosu",
        description: "Skonfiguruj procesor pogłosu",
        impulseResponse: {
            title: "Impuls pogłosu",
            description: "Wybierz impuls kształtujący dźwięk pogłosu"
        }
    },

    chorusConfig: {
        title: "Konfiguracja chóru",
        description: "Skonfiguruj procesor efektu chóru",
        nodesAmount: {
            title: "Ilość węzłów",
            description: "Ilość liń opóźniających dla każdego kanału stereo"
        },
        defaultDelay: {
            title: "Opóźnienie (s)",
            description: "Opóźnienie pierwszej linii, w sekundach"
        },
        delayVariation: {
            title: "Przyrost opóźnienia (s)",
            description: "Przyrost opóźnienia każdej kolejnej linii w sekundach"
        },
        stereoDifference: {
            title: "Różnica stereo (s)",
            description:
                "Różnica opóźnień w kanałach stereo (dodane do lewego kanału i odjęte od prawego sekundy)"
        },
        oscillatorFrequency: {
            title: "Częstotliwość LFO (Hz)",
            description:
                "Częstotliwość pierwszego LFO kontrolującego opóźnienie pierwszej linii w Hz."
        },
        frequencyVariation: {
            title: "Przyrost LFO (Hz)",
            description:
                "Przyrost częstotliwości LFO każdej kolejnej linii w Hz"
        },
        oscillatorGain: {
            title: "Siła LFO (s)",
            description:
                "Jak bardzo LFO będzie wpływać na opóźnienie linii, w sekundach"
        },
        apply: {
            title: "Zastosuj",
            description: "Zastosuj wybrane ustawienia"
        }
    }
};
