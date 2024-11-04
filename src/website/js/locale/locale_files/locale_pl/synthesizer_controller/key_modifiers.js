export const keyModifiers = {
    button: {
        title: "Modyfikacja klawiszy",
        description: "Zmodyfikuj indywidualne parametry klawiszy."
    },
    
    mainTitle: "Edytor modyfikacji klawiszy",
    
    detailedDescription: "To menu pozwala Ci na modyfikację danych klawiszy na danym kanale.\n"
        + "Aktualnie możesz nadpisać siłę nacisku oraz przypisać instrument do danego klawisza.\n" +
        "To jest szczególnie przydatne w przypadku perkusji.",
    
    prompt: "Co chcesz teraz zrobić?",
    
    selectKey: {
        prompt: "Naciśnij klawisz który chcesz zmodyfikować.",
        title: "Wybierz klawisz",
        change: "Zmień klawisz"
    },
    
    selectedChannel: {
        title: "Wybrany kanał",
        description: "Kanał do którego należy klawisz który chcesz zmodyfikować."
    },
    
    selectedKey: {
        title: "Wybrany klawisz: {0}",
        description: "Wybrałeś/aś klawisz MIDI o numerze {0}."
    },
    
    modifyKey: {
        title: "Zmodyfikuj klawisz",
        description: "Zmodyfikuj pojedynczy klawisz na danym kanale",
        velocity: {
            title: "Siła nacisku",
            description: "Siła nacisku dla tego klawisza. Pozostaw -1 dla braku zmian."
        },
        program: {
            title: "Nadpisanie programu",
            description: "Program, którego będzie używać ten klawisz. Pozostaw -1 dla braku zmian. Pamiętaj, że bank nie może być równy -1 aby zmiany zaszły w życie."
        },
        bank: {
            title: "Nadpisanie banku",
            description: "Bank, którego będzie używać ten klawisz. Pozostaw -1 dla braku zmian. Pamiętaj, że program nie może być równy -1 aby zmiany zaszły w życie."
        },
        apply: {
            title: "Zastosuj",
            description: "Zastosuj modyfikację"
        }
    },
    
    removeModification: {
        title: "Usuń modyfikację",
        description: "Usuń modyfikację z klawisza na danym kanale.",
        
        remove: {
            title: "Usuń",
            description: "Usuń ten modyfikator."
        }
    },
    
    resetModifications: {
        title: "Zresetuj zmiany",
        description: "Wyczyść i usuń wszystkie zastosowane zmiany",
        
        confirmation: {
            title: "Potwierdzenie",
            description: "Jesteś pewien, że chcesz usunąć WSZYSTKIE zmiany?"
        }
    }
};