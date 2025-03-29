export const rendererSettingsLocale = {
    title: "Ustawienia wizualizacji",
    
    mode: {
        title: "Tryb wizualizacji",
        description: "Zmień tryb wizualizacji kanałów",
        waveforms: "Kształt fali",
        frequencySplit: "Częstotliwości rodzielone",
        frequency: "Częstotliwości"
    },
    
    noteFallingTime: {
        title: "Czas spadania nut (ms)",
        description: "Jak szybko spadają z góry nuty (w milisekundach)"
    },
    
    noteAfterTriggerTime: {
        title: "Czas po aktywacji nuty (ms)",
        description: "Jak długo nuty spadają po aktywacji. Zero oznacza, że aktywują się na dole."
    },
    
    waveformThickness: {
        title: "Grubość lini fal (px)",
        description: "Jak grube są linie fal dźwiękowych"
    },
    
    waveformSampleSize: {
        title: "Rozmiar próbki fali",
        description: "Jak szczegółowe są linie fal dźwiękowcyh (Uwaga: wysokie wartości mogą pogorszyć wydajność) Pamiętaj, że wysokie wartości dodadzą opóźnienie do dźwięku, aby zsynchronizować fale z dźwiękiem."
    },
    
    waveformAmplifier: {
        title: "Wzmacniasz fal",
        description: "Jak 'żywe' są fale. Kontroluje ich amplitudę"
    },
    
    toggleExponentialGain: {
        title: "Wykładniczy przyrost",
        description: "Wyodrębnij różnice w głośności częstotliwości poprzez zastosowanie funkcji wykładniczej"
    },
    
    toggleDynamicGain: {
        title: "Dynamiczny przyrost",
        description: "Automatycznie dostosuj przysrost aby najgłośniejsza częstotliwośc zapełniała całą wysokość"
    },
    
    toggleLogarithmicFrequency: {
        title: "Logarytmiczna częstotliwość",
        description: "Rozłóż częstotliwości w sposób logarytmiczny zamiast liniowego. Zalecane"
    },
    
    toggleWaveformsRendering: {
        title: "Włącz rysowanie fal",
        description: "Włącz rysowanie fal dźwiękowych (16-tu kolorowych linii z tyłu)"
    },
    
    toggleNotesRendering: {
        title: "Włącz rysowanie nut",
        description: "Włącz rysowanie spadających nut podczas odtwarzania pliku MIDI"
    },
    
    toggleDrawingActiveNotes: {
        title: "Włącz rysowanie aktywnych nut",
        description: "Włącz efekt podświetlania się nut przy aktywacji"
    },
    
    toggleDrawingVisualPitch: {
        title: "Włącz wizualizację wysokości tonu",
        description: "Włącz przesuwanie nut w lewo lub w prawo gdy wysokość nut jest zmieniana"
    },
    
    toggleStabilizeWaveforms: {
        title: "Włącz stabilizację fal",
        description: "Włącz stabilizowanie fal dźwiękowych"
    }
};