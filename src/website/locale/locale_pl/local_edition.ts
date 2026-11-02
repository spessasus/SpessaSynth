// Strings for features of the standalone executable
export const localEditionLocale = {
    serverStopped: {
        title: "SpessaSynth zatrzymany",
        message:
            "SpessaSynth został zamknięty, więc ta strona nie może się z nim połączyć. Uruchom SpessaSyntha ponownie, a strona połączy się sama."
    },

    emptyFolder: {
        title: "Brak soundfontów",
        message:
            "SpessaSynth potrzebuje soundfonta, aby grać. Pobierz darmowy bank GeneralUser GS albo umieść własne pliki SF2, SF3, SF4 lub DLS w folderze soundfontów.",
        download: {
            title: "Pobierz GeneralUser GS",
            description: "Pobierz domyślny SoundFont (około 8 MB)"
        },
        haveOwn: {
            title: "Mam własny",
            description: "Otwórz folder soundfontów, aby dodać własne pliki"
        },
        refresh: {
            title: "Odśwież",
            description: "Sprawdź folder soundfontów ponownie"
        },
        downloading: "Pobieranie GeneralUser GS... {0}%",
        failed: "Pobieranie nie powiodło się: {0}",
        retry: {
            title: "Spróbuj ponownie",
            description: "Spróbuj pobrać ponownie"
        }
    },

    update: {
        title: "Dostępna aktualizacja",
        message: "Dostępny jest SpessaSynth {0}. Masz wersję {1}.",
        install: {
            title: "Aktualizuj teraz",
            description: "Pobierz nową wersję i uruchom SpessaSynth ponownie"
        },
        later: {
            title: "Później",
            description: "Zapytaj ponownie przy następnym uruchomieniu"
        },
        downloadPage: {
            title: "Otwórz stronę pobierania",
            description: "Pobierz nową wersję ze strony internetowej"
        },
        notWritable:
            "SpessaSynth nie może się zaktualizować w obecnym folderze. Pobierz nową wersję ze strony internetowej.",
        downloading: "Pobieranie SpessaSynth {0}... {1}%",
        restarting: "Ponowne uruchamianie SpessaSynth {0}...",
        failed: "Aktualizacja nie powiodła się: {0}"
    },

    soundBankFolder: {
        button: "Folder banków dźwięków",
        title: "Folder banków dźwięków",
        message:
            "Umieść pliki SF2, SF3, SF4 lub DLS w folderze banków dźwięków, a następnie odśwież listę.",
        open: {
            title: "Otwórz folder",
            description: "Pokaż folder banków dźwięków w menedżerze plików"
        },
        refresh: {
            title: "Odśwież listę",
            description: "Wczytaj listę banków dźwięków ponownie"
        },
        launcher: {
            title: "Dodaj do menu aplikacji",
            description: "Utwórz skrót do SpessaSynth w menu aplikacji"
        },
        launcherAdded: "SpessaSynth został dodany do menu aplikacji.",
        failed: "Nie udało się: {0}"
    }
};
