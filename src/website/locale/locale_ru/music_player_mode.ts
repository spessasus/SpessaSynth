/**
 * Локализация режима музыкального проигрывателя
 * @type {{nothingPlaying: string, currentlyPlaying: string, nothingPlayingCopyright: string, toggleButton: {description: string, title: string}}}
 */
export const musicPlayerModeLocale = {
    toggleButton: {
        title: "Переключить режим музыкального проигрывателя",
        description:
            "Переключить упрощённый интерфейс, скрыв клавиатуру и визуализацию нот"
    },
    currentlyPlaying: "Сейчас играет:",
    nothingPlaying: "Ничего не воспроизводится",
    nothingPlayingCopyright: "Загрузите MIDI-файл!"
};
