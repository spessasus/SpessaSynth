import { settingsLocale } from "./settings/settings.js";
import { musicPlayerModeLocale } from "./music_player_mode.js";
import { synthesizerControllerLocale } from "./synthesizer_controller/synthesizer_controller.js";
import { sequencerControllerLocale } from "./sequencer_controller.js";
import { exportAudio } from "./export_audio.js";

export const localeGeorgian = {
    localeName: "ქართული",
    // Title message
    titleMessage: "SpessaSynth: SF2/DLS Javascript სინთეზატორი",
    demoTitleMessage:
        "SpessaSynth: SF2/DLS Javascript სინთეზატორის ონლაინ დემო",

    synthInit: {
        genericLoading: "იტვირთება...",
        loadingSoundfont: "SoundFont იტვირთება...",
        loadingBundledSoundfont: "იტვირთება შეფუთული SoundFont...",
        startingSynthesizer: "სინთეზატორის გაშვება...",
        savingSoundfont: "SoundFont-ის შენახვა ხელახალი გამოყენებისთვის...",
        noWebAudio: "თქვენი ბრაუზერი არ უჭერს მხარს ვებ აუდიოს.",
        done: "მზადაა!"
    },

    // Top bar buttons
    midiUploadButton: "ატვირთეთ თქვენი MIDI ფაილები",

    extraBank: {
        title: "დამატებითი ბანკის არჩევა",
        offset: {
            title: "ბანკის წანაცვლება",
            description: "ბანკის წანაცვლება დამატებითი ბანკისთვის"
        },
        file: {
            title: "ხმის ბანკი",
            description: "აირჩიეთ ხმის ბანკი (DLS/SF2/SF3)"
        },
        confirm: {
            title: "დადასტურება",
            description: "დაადასტურეთ და გამოიყენეთ დამატებითი ბანკი"
        },
        clear: {
            title: "გასუფთავება",
            description: "დამატებითი ბანკის გასუფთავება"
        },
        button: "დამატებითი ხმის ბანკის დამატება"
    },

    exportAudio: exportAudio,

    error: "შეცდომა",
    yes: "დიახ",
    no: "არა",
    none: "არცერთი",

    demoSoundfontUploadButton: "ატვირთეთ საუნდშრიფტი",
    demoGithubPage: "პროექტის გვერდი",
    discord: "შემოგვიერთდით Discord სერვერზე!",
    soundfontEditor: "SF2/DLS რედაქტორი",
    demoDownload: {
        main: "ჩამოტვირთვა",
        downloadLocal: {
            title: "ჩამოტვირთეთ ადგილობრივი ვერსია",
            description:
                "ჩამოტვირთეთ SpessaSynth: Local Edition თქვენს კომპიუტერზე ოფლაინ რეჟიმში გამოსაყენებლად"
        }
    },
    demoSongButton: "დემო სიმღერა",
    credits: "ავტორები",
    dropPrompt: "ფაილები აქ ჩააგდეთ...",

    warnings: {
        outOfMemory:
            "თქვენს ბრაუზერს მეხსიერება ამოეწურა. განიხილეთ Firefox-ის ან SF3 soundfont-ის გამოყენება. (შეცდომისთვის იხილეთ კონსოლი).",
        noMidiSupport:
            "MIDI პორტები არ არის აღმოჩენილი, ეს ფუნქცია გამორთული იქნება.",
        warning: "გაფრთხილება",
        invalidMidiFile: "არასწორი MIDI ფაილი:"
    },
    hideTopBar: {
        title: "ზედა ზოლის დამალვა",
        description:
            "უფრო შეუფერხებელი გამოცდილების უზრუნველსაყოფად, ზედა (სათაურის) ზოლის დამალვა"
    },

    convertDls: {
        title: "DLS კონვერტაცია",
        message:
            "გსურთ DLS-ის SF2-ად გადაკეთება მხოლოდ SF2-თან თავსებადი პროგრამებისთვის?"
    },

    // All translations split up
    musicPlayerMode: musicPlayerModeLocale,
    settings: settingsLocale,
    synthesizerController: synthesizerControllerLocale,
    sequencerController: sequencerControllerLocale
} as const;
