import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";
import { keyModifiers } from "./key_modifiers.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "სინთეზატორის კონტროლერი (S)",
        description: "სინთეზატორის კონტროლერის ჩვენება"
    },

    // Meters
    mainVoiceMeter: {
        title: "ხმები: ",
        description: "ამჟამად დაკრული ხმების საერთო რაოდენობა"
    },

    mainVolumeMeter: {
        title: "მოცულობა: ",
        description: "სინთეზატორის მიმდინარე მთავარი ხმის მოცულობა"
    },

    mainPanMeter: {
        title: "პანორამირება: ",
        description: "სინთეზატორის მიმდინარე მთავარი სტერეო პანორამირება"
    },

    mainTransposeMeter: {
        title: "კლავიშის ცვლა:: ",
        description:
            "ტრანსპოზიცია: სინთეზატორის ტრანსპოზიცია (ნახევრადონებში ან ტონალობაში)"
    },

    // Buttons
    midiPanic: {
        title: "MIDI პანიკა",
        description: "MIDI პანიკა: ყველა ხმის დაუყოვნებლივ შეჩერება"
    },

    systemReset: {
        title: "კონტროლერების გადატვირთვა",
        description:
            "კონტროლერების გადატვირთვა: ყველა MIDI კონტროლერის ნაგულისხმევ მნიშვნელობებზე დაბრუნება"
    },

    showOnlyUsed: {
        title: "მხოლოდ გამოყენებულის ჩვენება",
        description:
            "მხოლოდ გამოყენებულის ჩვენება: სინთეზატორის კონტროლერში მხოლოდ გამოყენებული MIDI არხების ჩვენება"
    },

    helpButton: {
        title: "დახმარება",
        description: "დახმარება: ხსნის გარე ვებსაიტს გამოყენების სახელმძღვანელოთი"
    },

    tabs: {
        description: "ჩანართები: აირჩიეთ კონფიგურაციისთვის",
        channels: "MIDI არხები",
        reverb: "რევერბერაცია",
        chorus: "გუნდი",
        delay: "შეფერხება",
        insertion: "ჩასმა",
        configuration: "კონფიგურაცია"
    },

    holdPedalDown: "პედალის დაჭერა დაჭერილია (Shift)",
    keyboardMode: "კლავიატურით დაკვრა ჩართულია, გამოსართავად დააჭირეთ `-ს",
    port: "პორტი {0} (დააწკაპუნეთ ხილვადობის გადასართავად)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig,
    keyModifiers: keyModifiers
};
