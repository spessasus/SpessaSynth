import { channelControllerLocale } from "./channel_controller.js";
import { effectsConfig } from "./effects_config.js";

export const synthesizerControllerLocale = {
    toggleButton: {
        title: "სინთეზატორის კონტროლერი (S)",
        description: "სინთეზატორის კონტროლერის ჩვენება"
    },

    // Ინდიკატორები
    mainVoiceMeter: {
        title: "ხმები: ",
        description: "ამჟამად დაკრული ხმების საერთო რაოდენობა"
    },

    mainVolumeMeter: {
        title: "ხმის დონე: ",
        description: "სინთეზატორის მთავარი ხმის მიმდინარე დონე"
    },

    mainPanMeter: {
        title: "პანორამა: ",
        description: "სინთეზატორის მთავარი სტერეოპოზიცია"
    },

    mainTransposeMeter: {
        title: "ტრანსპოზიცია: ",
        description:
            "ტრანსპოზიცია: სინთეზატორის ტონალობის შეცვლა ნახევარტონებით"
    },

    // Ღილაკები
    midiPanic: {
        title: "MIDI-ის დაუყოვნებელი შეჩერება",
        description:
            "MIDI-ის დაუყოვნებელი შეჩერება: ყველა ხმის მყისიერად შეწყვეტა"
    },

    gsReset: {
        title: "GS-ის გადატვირთვა",
        description:
            "GS-ის გადატვირთვა: მთელი სინთეზატორის Roland GS რეჟიმზე დაბრუნება და ყველა კონტროლერის განბლოკვა"
    },

    xgReset: {
        title: "XG-ის გადატვირთვა",
        description:
            "XG-ის გადატვირთვა: მთელი სინთეზატორის Yamaha XG რეჟიმზე დაბრუნება და ყველა კონტროლერის განბლოკვა"
    },

    showOnlyUsed: {
        title: "მხოლოდ გამოყენებულის ჩვენება",
        description:
            "მხოლოდ გამოყენებულის ჩვენება: სინთეზატორის კონტროლერში მხოლოდ გამოყენებული MIDI არხების ჩვენება"
    },

    helpButton: {
        title: "დახმარება",
        description:
            "დახმარება: გამოყენების სახელმძღვანელოს შემცველი გარე ვებსაიტის გახსნა"
    },

    tabs: {
        description: "ჩანართები: აირჩიეთ, რისი კონფიგურაცია გსურთ",
        channels: "MIDI არხები",
        gsReverb: "GS რევერბერაცია",
        gsChorus: "GS ქორუსი",
        gsDelay: "GS დაყოვნება",
        gsInsertion: "GS ჩასმის ეფექტი",
        xgReverb: "XG რევერბერაცია",
        xgChorus: "XG ქორუსი",
        xgVariation: "XG ვარიაცია",
        xgInsertion: "XG ჩასმის ეფექტი",
        configuration: "კონფიგურაცია",
        gsUserDrumSet: "GS მომხმარებლის დასარტყამი ნაკრები"
    },

    holdPedalDown: "დამჭერი პედალი დაჭერილია (Shift)",
    keyboardMode: "კლავიატურით დაკვრა ჩართულია. გამოსართავად დააჭირეთ ` ღილაკს",
    port: "პორტი {0} (ხილვადობის შესაცვლელად დააწკაპუნეთ)",
    channelController: channelControllerLocale,
    effectsConfig: effectsConfig
};
