import { Sequencer } from "../../../spessasynth_lib/sequencer/sequencer.js";
import { formatTime } from "../../../spessasynth_lib/utils/other.js";
import { supportedEncodings } from "../utils/encodings.js";
import {
    getBackwardSvg,
    getForwardSvg,
    getLoopSvg,
    getPauseSvg,
    getPlaySvg,
    getShuffleSvg,
    getSpeedSvg,
    getTextSvg
} from "../utils/icons.js";
import { messageTypes } from "../../../spessasynth_lib/midi_parser/midi_message.js";
import { getSeqUIButton } from "./sequi_button.js";
import { keybinds } from "../utils/keybinds.js";
import { createNavigatorHandler, updateTitleAndMediaStatus } from "./title_and_media_status.js";
import { createLyrics, setLyricsText, updateOtherTextEvents } from "./lyrics.js";
import { RMIDINFOChunks } from "../../../spessasynth_lib/midi_parser/rmidi_writer.js";
import { createSlider } from "../settings_ui/sliders.js";

/**
 * sequencer_ui.js
 * purpose: manages the GUI for the sequencer class, adding buttons for pause/play, lyrics, next, previous etc.
 */

const ICON_SIZE = 32;

const ICON_COLOR = "#ccc";
const ICON_DISABLED_COLOR = "#555";

const ICON_COLOR_L = "#333";
const ICON_DISABLED_COLOR_L = "#ddd";

const DEFAULT_ENCODING = "Shift_JIS";

// zero width space
const ZWSP = "\u200b";

class SequencerUI
{
    /**
     * Creates a new User Interface for the given MidiSequencer
     * @param element {HTMLElement} the element to create sequi in
     * @param locale {LocaleManager}
     * @param musicMode {MusicModeUI}
     * @param renderer {Renderer}
     */
    constructor(element, locale, musicMode, renderer)
    {
        this.iconColor = ICON_COLOR;
        this.iconDisabledColor = ICON_DISABLED_COLOR;
        this.controls = element;
        this.encoding = DEFAULT_ENCODING;
        this.decoder = new TextDecoder(this.encoding);
        this.infoDecoder = new TextDecoder(this.encoding);
        this.hasInfoDecoding = false;
        /**
         * the currently displayed (highlighted) lyrics event index.
         * -1 means no lyrics displayed (an event before the first lyric is "highlighted")
         * @type {number}
         */
        this.lyricsIndex = -1;
        this.requiresTextUpdate = false;
        this.lastTimeUpdate = 0;
        /**
         * @type {{type: messageTypes, data: Uint8Array}[]}
         */
        this.rawOtherTextEvents = [];
        this.mode = "dark";
        this.locale = locale;
        this.currentSongTitle = "";
        /**
         * @type {Uint8Array[]}
         */
        this.currentLyrics = [];
        /**
         * Current lyrics decoded as strings
         * @type {string[]}
         */
        this.currentLyricsString = [];
        this.musicModeUI = musicMode;
        this.renderer = renderer;
        
        this.mainTitleMessageDisplay = document.getElementById("title");
        this.synthDisplayMode = {
            enabled: false,
            currentEncodedText: new Uint8Array(0)
        };
        
        // set up synth display event
        let displayTimeoutId = null;
        renderer.synth.eventHandler.addEvent("synthdisplay", "sequi-synth-display", data =>
        {
            if (data.displayType === 0 || data.displayType === 1)
            {
                // clear styles and apply monospace
                this.mainTitleMessageDisplay.classList.add("sysex_display");
                this.mainTitleMessageDisplay.classList.remove("xg_sysex_display");
                let textData = data.displayData;
                // remove "Display Letters" byte before decoding for XG display
                if (data.displayType === 1)
                {
                    textData = textData.slice(1);
                }
                // decode the text
                let text = this.decodeTextFix(textData.buffer);
                
                // XG is type 1, apply some fixes to it.
                // XG Displays have a special behavior, we try to mimic it here
                // reference video:
                // https://www.youtube.com/watch?v=_mR7DV1E4KE
                // first, extract the "Display Letters" byte
                if (data.displayType === 1)
                {
                    const displayLetters = data.displayData[0];
                    // XG Display Letters:
                    // the screen is monospace,
                    // two rows, 16 characters each (max)
                    // since this is XG data, apply the XG display style
                    this.mainTitleMessageDisplay.classList.add("xg_sysex_display");
                    
                    // 0x0c where c are the number of spaces prepended
                    const spaces = displayLetters & 0x0F;
                    for (let i = 0; i < spaces; i++)
                    {
                        text = " " + text;
                    }
                    
                    // at 16 characters, add a newline
                    if (text.length >= 16)
                    {
                        text = text.slice(0, 16) + "\n" + text.slice(16);
                    }
                    
                    // if type is 0x1x, add a newline
                    if ((displayLetters & 0x10) > 1)
                    {
                        text = "\n" + text;
                    }
                    
                }
                
                
                if (text.trim().length === 0)
                {
                    // set the text to invisible character to keep the height
                    this.mainTitleMessageDisplay.innerText = "‎ ";
                }
                else
                {
                    // set the display to an invisible character to keep the height
                    this.mainTitleMessageDisplay.innerText = text;
                }
                
                this.synthDisplayMode.enabled = true;
                this.synthDisplayMode.currentEncodedText = textData;
                if (displayTimeoutId !== null)
                {
                    clearTimeout(displayTimeoutId);
                }
                displayTimeoutId = setTimeout(() =>
                {
                    this.synthDisplayMode.enabled = false;
                    this.restoreDisplay();
                }, 5000);
                
            }
        });
    }
    
    toggleDarkMode()
    {
        if (this.mode === "dark")
        {
            this.mode = "light";
            this.iconColor = ICON_COLOR_L;
            this.iconDisabledColor = ICON_DISABLED_COLOR_L;
        }
        else
        {
            this.mode = "dark";
            this.iconColor = ICON_COLOR;
            this.iconDisabledColor = ICON_DISABLED_COLOR;
        }
        if (!this.seq)
        {
            this.requiresThemeUpdate = true;
            return;
        }
        this.progressBar.classList.toggle("note_progress_light");
        this.progressBarBackground.classList.toggle("note_progress_background_light");
        this.lyricsElement.mainDiv.classList.toggle("lyrics_light");
        this.lyricsElement.titleWrapper.classList.toggle("lyrics_light");
        this.lyricsElement.selector.classList.toggle("lyrics_light");
    }
    
    seqPlay(sendPlay = true)
    {
        if (sendPlay)
        {
            this.seq.play();
        }
        this.playPause.innerHTML = getPauseSvg(ICON_SIZE);
        this.createNavigatorHandler();
        this.updateTitleAndMediaStatus();
        if (!navigator.mediaSession)
        {
            return;
        }
        navigator.mediaSession.playbackState = "playing";
    }
    
    seqPause(sendPause = true)
    {
        if (sendPause)
        {
            this.seq.pause();
        }
        this.playPause.innerHTML = getPlaySvg(ICON_SIZE);
        this.createNavigatorHandler();
        if (!navigator.mediaSession)
        {
            return;
        }
        navigator.mediaSession.playbackState = "paused";
    }
    
    switchToNextSong()
    {
        this.seq.nextSong();
        this.createNavigatorHandler();
        this.updateTitleAndMediaStatus();
    }
    
    switchToPreviousSong()
    {
        this.seq.previousSong();
        this.createNavigatorHandler();
        this.updateTitleAndMediaStatus();
    }
    
    /**
     * @param text {ArrayBuffer}
     * @returns {string}
     */
    decodeTextFix(text)
    {
        let encodingIndex = 0;
        while (true)
        {
            try
            {
                return this.decoder.decode(text);
            }
            catch (e)
            {
                encodingIndex++;
                this.changeEncoding(supportedEncodings[encodingIndex]);
                this.encodingSelector.value = supportedEncodings[encodingIndex];
            }
        }
    }
    
    /**
     *
     * @param sequencer {Sequencer} the sequencer to be used
     */
    connectSequencer(sequencer)
    {
        this.seq = sequencer;
        this.createControls();
        this.setSliderInterval();
        this.createNavigatorHandler();
        this.updateTitleAndMediaStatus();
        
        this.seq.onTextEvent = (data, type, lyricsIndex) =>
        {
            switch (type)
            {
                default:
                    return;
                
                case messageTypes.text:
                case messageTypes.copyright:
                case messageTypes.cuePoint:
                case messageTypes.trackName:
                case messageTypes.instrumentName:
                case messageTypes.programName:
                case messageTypes.marker:
                    this.rawOtherTextEvents.push({ type: type, data: data });
                    this.requiresTextUpdate = true;
                    return;
                
                case messageTypes.lyric:
                    this.setLyricsText(lyricsIndex);
                    break;
            }
        };
        
        this.seq.addOnTimeChangeEvent(() =>
        {
            this.lyricsIndex = -1;
            this.seqPlay(false);
        }, "sequi-time-change");
        
        this.seq.addOnSongChangeEvent(data =>
        {
            this.synthDisplayMode.enabled = false;
            this.lyricsIndex = -1;
            this.createNavigatorHandler();
            this.updateTitleAndMediaStatus();
            this.seqPlay(false);
            // disable loop if more than 1 song
            if (this.seq.songsAmount > 1)
            {
                this.seq.loop = false;
                this.loopButton.firstElementChild.setAttribute(
                    "fill",
                    this.iconDisabledColor
                );
            }
            this.restoreDisplay();
            
            // use encoding suggested by the rmidi if available
            this.hasInfoDecoding = this.seq.midiData.RMIDInfo?.[RMIDINFOChunks.encoding] !== undefined;
            if (data.isEmbedded)
            {
                /**
                 * @param type {string}
                 * @param def {string}
                 * @param decoder {TextDecoder}
                 * @param prepend {string}
                 * @return {string}
                 */
                const verifyDecode = (type, def, decoder, prepend = "") =>
                {
                    return this.seq.midiData.RMIDInfo?.[type] === undefined ? def : prepend + decoder.decode(
                        this.seq.midiData.RMIDInfo?.[type]).replace(/\0$/, "");
                };
                const dec = new TextDecoder();
                const midiEncoding = verifyDecode(
                    RMIDINFOChunks.midiEncoding,
                    this.encoding,
                    dec
                );
                const infoEncoding = verifyDecode(RMIDINFOChunks.encoding, "utf-8", dec);
                this.infoDecoder = new TextDecoder(infoEncoding);
                this.changeEncoding(midiEncoding);
            }
        }, "sequi-song-change");
        
        if (this.requiresThemeUpdate)
        {
            if (this.mode === "light")
            {
                // change to dark and then switch
                this.mode = "dark";
                this.toggleDarkMode();
            }
            // otherwise, we're already dark
        }
    }
    
    /**
     * Restores the display to the current song title and removes the SysEx display styles
     */
    restoreDisplay()
    {
        let textToShow = this.currentSongTitle;
        if (!this.seq)
        {
            // set to default title
            textToShow = this.locale.getLocaleString("locale.titleMessage");
        }
        this.mainTitleMessageDisplay.innerText = textToShow;
        this.mainTitleMessageDisplay.classList.remove("sysex_display");
        this.mainTitleMessageDisplay.classList.remove("xg_sysex_display");
    }
    
    changeEncoding(encoding)
    {
        this.encoding = encoding;
        this.decoder = new TextDecoder(encoding);
        if (!this.hasInfoDecoding)
        {
            this.infoDecoder = new TextDecoder(encoding);
        }
        this.updateOtherTextEvents();
        this.decodeLyricData();
        // update all spans with the new encoding
        this.lyricsElement.text.separateLyrics.forEach((span, index) =>
        {
            if (this.currentLyricsString[index] === undefined)
            {
                return;
            }
            span.innerText = this.currentLyricsString[index];
        });
        this.lyricsElement.selector.value = encoding;
        this.updateTitleAndMediaStatus(false);
        this.setLyricsText(this.lyricsIndex);
    }
    
    createControls()
    {
        // time
        this.progressTime = document.createElement("p");
        this.progressTime.id = "note_time";
        // it'll always be on top
        this.progressTime.onclick = event =>
        {
            event.preventDefault();
            const barPosition = progressBarBg.getBoundingClientRect();
            const x = event.clientX - barPosition.left;
            const width = barPosition.width;
            
            this.seq.currentTime = (x / width) * this.seq.duration;
            playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
        };
        
        this.createLyrics();
        
        
        // background bar
        const progressBarBg = document.createElement("div");
        progressBarBg.id = "note_progress_background";
        this.progressBarBackground = progressBarBg;
        
        
        // foreground bar
        this.progressBar = document.createElement("div");
        this.progressBar.id = "note_progress";
        this.progressBar.min = (0).toString();
        this.progressBar.max = this.seq.duration.toString();
        
        
        // control buttons
        const controlsDiv = document.createElement("div");
        controlsDiv.classList.add("control_buttons_wrapper");
        
        
        // play pause
        const playPauseButton = getSeqUIButton(
            "Play/Pause",
            getPauseSvg(ICON_SIZE)
        );
        this.playPause = playPauseButton;
        this.locale.bindObjectProperty(playPauseButton, "title", "locale.sequencerController.playPause");
        const togglePlayback = () =>
        {
            if (this.seq.paused)
            {
                this.seqPlay();
            }
            else
            {
                this.seqPause();
            }
        };
        playPauseButton.onclick = togglePlayback;
        
        
        // previous song button
        const previousSongButton = getSeqUIButton(
            "Previous song",
            getBackwardSvg(ICON_SIZE)
        );
        this.locale.bindObjectProperty(previousSongButton, "title", "locale.sequencerController.previousSong");
        previousSongButton.onclick = () => this.switchToPreviousSong();
        
        // next song button
        const nextSongButton = getSeqUIButton(
            "Next song",
            getForwardSvg(ICON_SIZE)
        );
        this.locale.bindObjectProperty(nextSongButton, "title", "locale.sequencerController.nextSong");
        nextSongButton.onclick = () => this.switchToNextSong();
        
        // loop button
        const loopButton = getSeqUIButton(
            "Loop this",
            getLoopSvg(ICON_SIZE)
        );
        this.locale.bindObjectProperty(loopButton, "title", "locale.sequencerController.loopThis");
        const toggleLoop = () =>
        {
            if (this.seq.loop)
            {
                this.seq.loop = false;
            }
            else
            {
                this.seq.loop = true;
                if (this.seq.currentTime >= this.seq.duration)
                {
                    this.seq.currentTime = 0;
                }
            }
            loopButton.firstElementChild.setAttribute(
                "fill",
                (this.seq.loop ? this.iconColor : this.iconDisabledColor)
            );
        };
        loopButton.onclick = toggleLoop;
        this.loopButton = loopButton;
        
        // shuffle button
        const shuffleButton = getSeqUIButton(
            "Shuffle songs",
            getShuffleSvg(ICON_SIZE)
        );
        this.locale.bindObjectProperty(shuffleButton, "title", "locale.sequencerController.shuffle");
        shuffleButton.onclick = () =>
        {
            this.seq.shuffleSongs = !this.seq.shuffleSongs;
            shuffleButton.firstElementChild.setAttribute(
                "fill",
                (this.seq.shuffleSongs ? this.iconColor : this.iconDisabledColor)
            );
            shuffleButton.firstElementChild.setAttribute(
                "stroke",
                (this.seq.shuffleSongs ? this.iconColor : this.iconDisabledColor)
            );
        };
        shuffleButton.firstElementChild.setAttribute("fill", this.iconDisabledColor);
        shuffleButton.firstElementChild.setAttribute("stroke", this.iconDisabledColor);
        
        // playback rate button
        const playbackRateButton = getSeqUIButton(
            "Playback speed",
            getSpeedSvg(ICON_SIZE)
        );
        this.locale.bindObjectProperty(playbackRateButton, "title", "locale.sequencerController.playbackRate");
        
        const input = document.createElement("input");
        input.type = "number";
        input.id = "playback_rate_slider";
        const minSlider = 1;
        const maxSlider = 60;
        input.min = minSlider.toString();
        input.max = maxSlider.toString();
        input.value = "20"; // note about these: 100% and below are incremented by five,
        // while above 100 is incremented by 10
        const playbackRateSlider = createSlider(input, true);
        const playbackRateSliderWrapper = document.createElement("div");
        playbackRateSliderWrapper.classList.add("playback_rate_slider_wrapper");
        playbackRateSliderWrapper.appendChild(playbackRateSlider);
        /**
         * @type {HTMLInputElement}
         */
        const actualInput = playbackRateSlider.firstElementChild.lastElementChild;
        /**
         * @type {HTMLSpanElement}
         */
        const displaySpan = playbackRateSlider.lastElementChild;
        displaySpan.contentEditable = "true";
        displaySpan.textContent = `${this.seq.playbackRate * 100}%`;
        actualInput.oninput = () =>
        {
            const value = parseInt(actualInput.value);
            const playbackPercent = value > 20 ? (value - 20) * 10 + 100 : value * 5;
            this.seq.playbackRate = playbackPercent / 100;
            displaySpan.textContent = `${Math.round(playbackPercent)}%`;
        };
        displaySpan.onkeydown = e =>
        {
            e.stopPropagation();
            e.stopImmediatePropagation();
        };
        displaySpan.oninput = e =>
        {
            e.stopImmediatePropagation();
            const num = parseInt(displaySpan.textContent);
            
            let percent = isNaN(num) ? 100 : num;
            if (percent < 1)
            {
                percent = 100;
            }
            this.seq.playbackRate = percent / 100;
            
            // get the value that the input would have
            const inputValue = Math.max(minSlider, Math.min(
                maxSlider,
                percent > 100 ? (percent - 100) / 10 + 20 : percent / 5
            ));
            actualInput.value = inputValue.toString();
            
            playbackRateSlider.querySelector(".settings_visual_wrapper").style.setProperty(
                "--visual-width",
                `${(inputValue - minSlider) / (maxSlider - minSlider) * 100}%`
            );
        };
        displaySpan.onblur = () =>
        {
            displaySpan.textContent = `${Math.round(this.seq.playbackRate * 100)}%`;
        };
        playbackRateSliderWrapper.classList.add("hidden");
        let sliderShown = false;
        playbackRateButton.onclick = () =>
        {
            sliderShown = !sliderShown;
            playbackRateSliderWrapper.classList.toggle("hidden");
            playbackRateButton.firstElementChild.setAttribute(
                "fill",
                (sliderShown ? this.iconColor : this.iconDisabledColor)
            );
        };
        playbackRateButton.firstElementChild.setAttribute(
            "fill",
            this.iconDisabledColor
        );
        
        
        // show text button
        const textButton = getSeqUIButton(
            "Show lyrics",
            getTextSvg(ICON_SIZE)
        );
        this.locale.bindObjectProperty(textButton, "title", "locale.sequencerController.lyrics.show");
        textButton.firstElementChild.setAttribute("fill", this.iconDisabledColor); // defaults to disabled
        const toggleLyrics = () =>
        {
            this.lyricsElement.mainDiv.classList.toggle("lyrics_show");
            textButton.firstElementChild.setAttribute(
                "fill",
                (this.lyricsElement.mainDiv.classList.contains("lyrics_show") ? this.iconColor : this.iconDisabledColor)
            );
        };
        this.toggleLyrics = toggleLyrics;
        textButton.onclick = toggleLyrics;
        
        // add everything
        controlsDiv.appendChild(previousSongButton); // |<
        controlsDiv.appendChild(loopButton);         // ()
        controlsDiv.appendChild(shuffleButton);      // ><
        controlsDiv.appendChild(playPauseButton);    // ||
        controlsDiv.appendChild(textButton);         // ==
        controlsDiv.appendChild(playbackRateButton); // >>
        controlsDiv.appendChild(nextSongButton);     // >|
        
        this.controls.appendChild(progressBarBg);
        progressBarBg.appendChild(this.progressBar);
        this.controls.appendChild(this.progressTime);
        this.controls.appendChild(playbackRateSliderWrapper);
        this.controls.appendChild(controlsDiv);
        
        
        // keyboard control
        document.addEventListener("keydown", e =>
        {
            switch (e.key.toLowerCase())
            {
                case keybinds.playPause:
                    e.preventDefault();
                    togglePlayback();
                    break;
                
                case keybinds.toggleLoop:
                    e.preventDefault();
                    toggleLoop();
                    break;
                
                case keybinds.toggleLyrics:
                    e.preventDefault();
                    toggleLyrics();
                    break;
                
                case keybinds.seekBackwards:
                    e.preventDefault();
                    this.seq.currentTime -= 5;
                    playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                    break;
                
                case keybinds.seekForwards:
                    e.preventDefault();
                    this.seq.currentTime += 5;
                    playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                    break;
                
                case keybinds.previousSong:
                    this.switchToPreviousSong();
                    break;
                
                case keybinds.nextSong:
                    this.switchToNextSong();
                    break;
                
                default:
                    if (!isNaN(parseFloat(e.key)))
                    {
                        e.preventDefault();
                        const num = parseInt(e.key);
                        if (0 <= num && num <= 9)
                        {
                            this.seq.currentTime = this.seq.duration * (num / 10);
                            playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                        }
                    }
                    break;
            }
        });
    }
    
    _updateInterval()
    {
        const seqTime = this.seq.currentTime;
        if (this.lastTimeUpdate === seqTime)
        {
            return;
        }
        this.lastTimeUpdate = seqTime;
        this.progressBar.style.width = `${(seqTime / this.seq.duration) * 100}%`;
        const time = formatTime(seqTime);
        const total = formatTime(this.seq.duration);
        this.progressTime.innerText = `${time.time} / ${total.time}`;
        if (this.requiresTextUpdate)
        {
            this.updateOtherTextEvents();
            this.requiresTextUpdate = false;
        }
    }
    
    setSliderInterval()
    {
        setInterval(this._updateInterval.bind(this), 100);
    }
    
    decodeLyricData()
    {
        this.currentLyricsString = this.currentLyrics.map(l => this.decodeTextFix(l.buffer));
        if (this.currentLyrics.length === 0)
        {
            this.currentLyricsString = [this.locale.getLocaleString("locale.sequencerController.lyrics.noLyrics")];
        }
        else
        {
            // a check for lilypond later
            let containsZWSP = false;
            // perform a check for double lyrics:
            // for example in some midi's, every lyric event is duplicated:
            // "He's " turns into two "He's " and another "He's " event
            // if that's the case for all events in the current lyrics, set duplicates to "" to avoid index errors
            let isDoubleLyrics = true;
            // note: the first lyrics is usually a control character
            for (let i = 1; i < this.currentLyricsString.length - 1; i += 2)
            {
                const first = this.currentLyricsString[i];
                if (!containsZWSP)
                {
                    if (first.includes(ZWSP))
                    {
                        containsZWSP = true;
                    }
                }
                const second = this.currentLyricsString[i + 1];
                // note: newline should be skipped
                if (first.trim() === "" || second.trim() === "")
                {
                    i -= 1;
                    continue;
                }
                if (first.trim() !== second.trim())
                {
                    isDoubleLyrics = false;
                    break;
                }
            }
            if (isDoubleLyrics)
            {
                for (let i = 0; i < this.currentLyricsString.length; i += 2)
                {
                    // note: newline should be skipped
                    if (this.currentLyricsString[i] === "\n")
                    {
                        i -= 1;
                        continue;
                    }
                    this.currentLyricsString[i] = "";
                }
                
            }
            
            // perform a lilypond fix
            // see https://github.com/spessasus/SpessaSynth/issues/141
            if (containsZWSP)
            {
                for (let i = 0; i < this.currentLyricsString.length; i++)
                {
                    const string = this.currentLyricsString[i];
                    if (string[0] === ZWSP)
                    {
                        // When adding ZWSP in front of a word: consider it as the start of a newline
                        this.currentLyricsString[i] = " \n" + string.substring(1);
                    }
                    else if (string[string.length - 1] === ZWSP)
                    {
                        // When appending a ZWSP at the end of a word, consider it as a syllable
                        this.currentLyricsString[i] = string.substring(0, string.length - 1);
                    }
                    else
                    {
                        this.currentLyricsString[i] = string + " ";
                    }
                }
            }
            
        }
        // lyrics fix:
        // sometimes, all lyrics events lack spaces at the start or end of the lyric
        // then, and only then, add space at the end of each lyric
        // space ASCII is 32
        let lacksSpaces = true;
        for (const lyric of this.currentLyricsString)
        {
            if (lyric[0] === " " || lyric[lyric.length - 1] === " ")
            {
                lacksSpaces = false;
                break;
            }
        }
        
        if (lacksSpaces)
        {
            this.currentLyricsString = this.currentLyricsString.map(lyric =>
            {
                // One exception: hyphens at the end. Don't add a space to them
                if (lyric[lyric.length - 1] === "-")
                {
                    return lyric;
                }
                return lyric + " ";
            });
        }
        // sanitize lyrics, as in replacement "/" with newline
        this.currentLyricsString = this.currentLyricsString.map(l => l.replace("/", "\n"));
    }
    
    loadLyricData()
    {
        // load lyrics
        this.currentLyrics = this.seq.midiData.lyrics;
        this.decodeLyricData();
        // create lyrics as separate spans
        // clear previous lyrics
        this.lyricsElement.text.main.innerHTML = "";
        this.lyricsElement.text.separateLyrics = [];
        for (const lyric of this.currentLyricsString)
        {
            const span = document.createElement("span");
            span.innerText = lyric;
            // gray (not highlighted) text
            span.classList.add("lyrics_text_gray");
            this.lyricsElement.text.main.appendChild(span);
            this.lyricsElement.text.separateLyrics.push(span);
        }
        
    }
}

SequencerUI.prototype.createNavigatorHandler = createNavigatorHandler;
SequencerUI.prototype.updateTitleAndMediaStatus = updateTitleAndMediaStatus;

SequencerUI.prototype.createLyrics = createLyrics;
SequencerUI.prototype.setLyricsText = setLyricsText;
SequencerUI.prototype.updateOtherTextEvents = updateOtherTextEvents;

export { SequencerUI };