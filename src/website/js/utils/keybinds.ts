const keyboardKeybinds: Record<string, number> = {
    // Top octave (number row, qwerty)
    q: 60,
    "2": 61,
    w: 62,
    "3": 63,
    e: 64,
    r: 65,
    "5": 66,
    t: 67,
    "6": 68,
    y: 69,
    "7": 70,
    u: 71,
    i: 72,
    "9": 73,
    o: 74,
    "0": 75,
    p: 76,
    "[": 77,
    "=": 78,

    // Bottom octave (asdf, zxcv)
    z: 48,
    s: 49,
    x: 50,
    d: 51,
    c: 52,
    v: 53,
    g: 54,
    b: 55,
    h: 56,
    n: 57,
    j: 58,
    m: 59,
    ",": 60,
    l: 61,
    ".": 62,
    ";": 63,
    "/": 64
};

export const keybinds = {
    synthesizerUIShow: "s",
    settingsShow: "r",

    blackMidiMode: "b",
    midiPanic: "backspace",

    playPause: " ",
    toggleLoop: "l",
    toggleLyrics: "t",
    seekBackwards: "arrowleft",
    seekForwards: "arrowright",
    previousSong: "[",
    nextSong: "]",
    toggleSubtitles: "escape",
    sustainPedal: "shift",

    videoMode: "v",
    keyboardMode: "`",
    keyboardKeys: keyboardKeybinds
};
