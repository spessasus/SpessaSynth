export const effectsConfig = {
    // It has this structure due to legacy effects config
    button: {
        title: "Konfiguracja efektów"
    },

    goBack: {
        title: "Powrót",
        description: "Powrót: Wróć do kontrolerów kanału MIDI."
    },

    toggleLock: {
        title: "Przełącz blokadę",
        description:
            "Przełącz blokadę: Zapobiega zmianie parametrów efektu przez dane MIDI."
    },

    reverb: {
        title: "Konfiguracja pogłosu",
        description: "Skonfiguruj procesor pogłosu",

        level: {
            title: "Poziom: ",
            description: "Poziom: Ten parametr ustawia ilość efektu."
        },

        preLowpass: {
            title: "Pre-LPF: ",
            description:
                "Pre-LPF: Do sygnału wchodzącego do efektu można zastosować filtr dolnoprzepustowy, aby ograniczyć zakres wysokich częstotliwości. " +
                "Wyższe wartości powodują większe tłumienie wysokich częstotliwości, " +
                "co daje bardziej stonowane brzmienie efektu."
        },

        character: {
            title: "Charakter: ",
            description:
                "Charakter: Ten parametr wybiera typ pogłosu. Wartości 0–5 to efekty pogłosu, " +
                "a 6 i 7 to efekty opóźnienia (delay)."
        },

        time: {
            title: "Czas: ",
            description:
                "Czas: Ten parametr ustawia czas trwania pogłosu. " +
                "Wyższe wartości powodują dłuższe wybrzmiewanie."
        },

        delayFeedback: {
            title: "Sprzężenie zwrotne: ",
            description:
                "Sprzężenie zwrotne: Ten parametr jest używany, gdy Charakter pogłosu jest ustawiony na 6 lub 7. " +
                "Określa sposób powtarzania opóźnień. " +
                "Wyższe wartości powodują większą liczbę powtórzeń."
        },

        preDelayTime: {
            title: "Pre-delay: ",
            description:
                "Pre-delay: Ten parametr ustawia czas opóźnienia przed pojawieniem się dźwięku pogłosu. " +
                "Wyższe wartości powodują dłuższy czas pre-delay, symulując większą przestrzeń akustyczną."
        }
    },

    chorus: {
        title: "Konfiguracja chóru",
        description: "Skonfiguruj procesor chóru",

        level: {
            title: "Poziom: ",
            description: "Poziom: Ten parametr ustawia ilość efektu."
        },

        preLowpass: {
            title: "Pre-LPF: ",
            description:
                "Pre-LPF: Do sygnału wchodzącego do efektu można zastosować filtr dolnoprzepustowy, aby ograniczyć zakres wysokich częstotliwości. " +
                "Wyższe wartości powodują większe tłumienie wysokich częstotliwości, " +
                "co daje bardziej stonowane brzmienie efektu."
        },

        feedback: {
            title: "Sprzężenie zwrotne: ",
            description:
                "Sprzężenie zwrotne: Ten parametr ustawia szybkość (częstotliwość), z jaką modulowany jest dźwięk chóru. " +
                "Wyższe wartości powodują szybszą modulację."
        },

        delay: {
            title: "Opóźnienie: ",
            description:
                "Opóźnienie: Ten parametr ustawia czas opóźnienia efektu chóru."
        },

        rate: {
            title: "Rate: ",
            description:
                "Rate: Ten parametr ustawia szybkość (częstotliwość), z jaką modulowany jest dźwięk chorusa. " +
                "Wyższe wartości powodują szybszą modulację."
        },

        depth: {
            title: "Głębokość: ",
            description:
                "Głębokość: Ten parametr ustawia głębokość modulacji dźwięku chorusa. " +
                "Wyższe wartości powodują głębszą modulację."
        },

        sendLevelToReverb: {
            title: "Poziom wysyłki do pogłosu: ",
            description:
                "Poziom wysyłki do pogłosu: Ten parametr ustawia ilość sygnału chorusa wysyłanego do pogłosu. " +
                "Wyższe wartości powodują wysłanie większej ilości sygnału."
        },

        sendLevelToDelay: {
            title: "Poziom wysyłki do delay: ",
            description:
                "Poziom wysyłki do delay: Ten parametr ustawia ilość sygnału chorusa wysyłanego do efektu delay. " +
                "Wyższe wartości powodują wysłanie większej ilości sygnału."
        }
    },

    delay: {
        title: "Konfiguracja delay",
        description: "Skonfiguruj procesor delay",

        level: {
            title: "Poziom: ",
            description: "Poziom: Ten parametr ustawia ilość efektu."
        },

        preLowpass: {
            title: "Pre-LPF: ",
            description:
                "Pre-LPF: Do sygnału wchodzącego do efektu można zastosować filtr dolnoprzepustowy, aby ograniczyć zakres wysokich częstotliwości. " +
                "Wyższe wartości powodują większe tłumienie wysokich częstotliwości, " +
                "co daje bardziej stonowane brzmienie efektu."
        },

        timeCenter: {
            title: "Czas centralny: ",
            description:
                "Czas centralny: Efekt delay ma trzy czasy opóźnienia: centralny, lewy i prawy (w odsłuchu stereo). " +
                "Czas centralny ustawia czas opóźnienia dla sygnału znajdującego się w centrum."
        },

        timeRatioLeft: {
            title: "Proporcja czasu lewego: ",
            description:
                "Proporcja czasu lewego: Ten parametr ustawia czas opóźnienia dla lewego kanału jako procent czasu centralnego (maks. 1,0 s)."
        },

        timeRatioRight: {
            title: "Proporcja czasu prawego: ",
            description:
                "Proporcja czasu prawego: Ten parametr ustawia czas opóźnienia dla prawego kanału jako procent czasu centralnego (maks. 1,0 s)."
        },

        levelCenter: {
            title: "Poziom centralny: ",
            description:
                "Poziom centralny: Ten parametr ustawia głośność centralnego opóźnienia. " +
                "Wyższe wartości powodują głośniejszy sygnał centralny."
        },

        levelLeft: {
            title: "Poziom lewy: ",
            description:
                "Poziom lewy: Ten parametr ustawia głośność lewego opóźnienia. " +
                "Wyższe wartości powodują głośniejszy sygnał lewy."
        },

        levelRight: {
            title: "Poziom prawy: ",
            description:
                "Poziom prawy: Ten parametr ustawia głośność prawego opóźnienia. " +
                "Wyższe wartości powodują głośniejszy sygnał prawy."
        },

        feedback: {
            title: "Sprzężenie zwrotne: ",
            description:
                "Sprzężenie zwrotne: Ten parametr wpływa na liczbę powtórzeń opóźnienia. " +
                "Przy wartości 0 opóźnienie nie będzie się powtarzać. " +
                "Wyższe wartości powodują większą liczbę powtórzeń. " +
                "Przy wartościach ujemnych (-) centralne opóźnienie będzie zawracane z odwróconą fazą. " +
                "Wartości ujemne są skuteczne przy krótkich czasach opóźnienia."
        },

        sendLevelToReverb: {
            title: "Poziom wysyłki do pogłosu: ",
            description:
                "Poziom wysyłki do pogłosu: Ten parametr ustawia ilość sygnału delay wysyłanego do pogłosu. " +
                "Wyższe wartości powodują wysłanie większej ilości sygnału."
        }
    }
};
