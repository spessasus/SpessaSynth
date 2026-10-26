import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportFile } from "./export_file.js";

export const localeGeorgian = {
    localeName: "ქართული",
    // სათაური
    titleMessage: "SpessaSynth: SF2/DLS JavaScript სინთეზატორი",
    demoTitleMessage: "SpessaSynth: SF2/DLS JavaScript სინთეზატორის ონლაინ დემო",

    synthInit: {
        genericLoading: "იტვირთება...",
        loadingSoundfont: "SoundFont იტვირთება...",
        loadingBundledSoundfont: "ჩაშენებული SoundFont იტვირთება...",
        startingSynthesizer: "სინთეზატორი ეშვება...",
        savingSoundfont: "SoundFont ხელახლა გამოყენებისთვის ინახება...",
        noWebAudio: "თქვენი ბრაუზერი Web Audio-ს არ უჭერს მხარს.",
        done: "მზადაა!"
    },

    // ზედა პანელის ღილაკები
    midiUploadButton: "ატვირთეთ MIDI ფაილები",

    extraBank: {
        title: "დამატებითი ბანკის არჩევა",
        offset: {
            title: "ბანკის წანაცვლება",
            description: "დამატებითი ბანკის წანაცვლება"
        },
        file: {
            title: "ხმოვანი ბანკი",
            description: "აირჩიეთ ხმოვანი ბანკი (DLS/SF2/SF3)"
        },
        confirm: {
            title: "დადასტურება",
            description: "დაადასტურეთ და გამოიყენეთ დამატებითი ბანკი"
        },
        clear: {
            title: "გასუფთავება",
            description: "წაშალეთ დამატებითი ბანკი"
        },
        button: "დამატებითი ხმოვანი ბანკის დამატება"
    },

    exportFile: exportFile,

    error: "შეცდომა",
    yes: "დიახ",
    no: "არა",
    none: "არცერთი",

    demoSoundfontUploadButton: "SoundFont-ის ატვირთვა",
    demoGithubPage: "პროექტის გვერდი",
    discord: "შემოუერთდით Discord სერვერს!",
    soundfontEditor: "SF2/DLS რედაქტორი",
    demoDownload: {
        main: "ჩამოტვირთვა",
        downloadLocal: {
            title: "ლოკალური ვერსიის ჩამოტვირთვა",
            description:
                "ჩამოტვირთეთ SpessaSynth: Local Edition, რათა პროგრამა კომპიუტერზე ინტერნეტის გარეშეც გამოიყენოთ"
        }
    },
    demoSongButton: "სადემონსტრაციო კომპოზიცია",
    credits: "ავტორები",
    dropPrompt: "გადმოიტანეთ ფაილები აქ...",

    warnings: {
        outOfMemory:
            "ბრაუზერს მეხსიერება აღარ ჰყოფნის. სცადეთ Firefox-ის ან SF3 ფორმატის SoundFont-ის გამოყენება. შეცდომის დეტალები იხილეთ კონსოლში.",
        noMidiSupport:
            "MIDI პორტები ვერ მოიძებნა. ეს ფუნქცია გაითიშება.",
        warning: "გაფრთხილება",
        invalidMidiFile: "არასწორი MIDI ფაილი:"
    },
    hideTopBar: {
        title: "ზედა პანელის დამალვა",
        description:
            "დამალეთ ზედა სათაურის პანელი, რათა ინტერფეისი უფრო ერთიანი იყოს"
    },

    convertDls: {
        title: "DLS-ის გარდაქმნა",
        message:
            "გსურთ DLS-ის SF2 ფორმატში გარდაქმნა, რათა ის მხოლოდ SF2-ის მხარდამჭერ პროგრამებში გამოიყენოთ?"
    },

    // დანარჩენი თარგმანები ცალკეულ ფაილებშია
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
} as const;