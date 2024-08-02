import { Sequencer } from '../../../spessasynth_lib/sequencer/sequencer.js'
import { formatTime } from '../../../spessasynth_lib/utils/other.js'
import { supportedEncodings } from '../utils/encodings.js'
import { getBackwardSvg, getForwardSvg, getLoopSvg, getPauseSvg, getPlaySvg, getTextSvg } from '../utils/icons.js'
import { messageTypes } from '../../../spessasynth_lib/midi_parser/midi_message.js'
import { getSeqUIButton } from './sequi_button.js'
import { keybinds } from '../utils/keybinds.js'
import { createNavigatorHandler, updateTitleAndMediaStatus } from './title_and_media_status.js'
import { createLyrics, setLyricsText, updateOtherTextEvents } from './lyrics.js'

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

class SequencerUI
{
    /**
     * Creates a new User Interface for the given MidiSequencer
     * @param element {HTMLElement} the element to create sequi in
     * @param locale {LocaleManager}
     * @param musicMode {MusicModeUI}
     */
    constructor(element, locale, musicMode)
    {
        this.iconColor = ICON_COLOR;
        this.iconDisabledColor = ICON_DISABLED_COLOR;
        this.controls = element;
        this.encoding = DEFAULT_ENCODING;
        this.decoder = new TextDecoder(this.encoding);
        // the currently displayed (highlighted) lyrics text
        this.text = "";
        this.requiresTextUpdate = false;
        this.rawLyrics = [];
        /**
         * @type {{type: messageTypes, data: Uint8Array}[]}
         */
        this.rawOtherTextEvents = [];
        this.mode = "dark";
        this.locale = locale;
        this.currentSongTitle = "";
        /**
         * @type {Uint8Array}
         */
        this.currentLyrics = new Uint8Array(0);
        this.currentLyricsString = "";
        this.musicModeUI = musicMode;
    }

    toggleDarkMode()
    {
        if(this.mode === "dark")
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
        if(!this.seq)
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
        if(sendPlay)
        {
            this.seq.play();
        }
        this.playPause.innerHTML = getPauseSvg(ICON_SIZE);
        this.createNavigatorHandler();
        this.updateTitleAndMediaStatus();
        if(!navigator.mediaSession)
        {
            return;
        }
        navigator.mediaSession.playbackState = "playing";
    }

    seqPause(sendPause = true)
    {
        if(sendPause)
        {
            this.seq.pause();
        }
        this.playPause.innerHTML = getPlaySvg(ICON_SIZE);
        this.createNavigatorHandler();
        this.updateTitleAndMediaStatus();
        if(!navigator.mediaSession)
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
        while(true)
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

        this.seq.onTextEvent = (data, type) => {
            const text = this.decodeTextFix(data.buffer);
            switch (type)
            {
                default:
                    return;

                case messageTypes.text:
                case messageTypes.copyright:
                case messageTypes.cuePoint:
                case messageTypes.trackName:
                case messageTypes.instrumentName:
                case messageTypes.marker:
                    this.rawOtherTextEvents.push({type: type, data: data});
                    this.requiresTextUpdate = true;
                    return;

                case messageTypes.lyric:
                    this.text += text;
                    this.rawLyrics.push(...data);
                    this.setLyricsText(this.text);
                    break;
            }
        }

        this.seq.addOnTimeChangeEvent(() => {
            this.text = "";
            this.rawLyrics = [];
            this.seqPlay(false);
        }, "sequi-time-change");

        this.seq.addOnSongChangeEvent(() => {
            this.createNavigatorHandler();
            this.updateTitleAndMediaStatus();
            this.seqPlay(false);
            // disable loop if more than 1 song
            if(this.seq.songsAmount > 1)
            {
                this.seq.loop = false;
                this.loopButton.firstElementChild.setAttribute("fill", this.iconDisabledColor);
            }
        }, "sequi-song-change");

        if(this.requiresThemeUpdate)
        {
            if(this.mode === "light")
            {
                // change to dark and then switch
                this.mode = "dark";
                this.toggleDarkMode();
            }
            // otherwise we're already dark
        }
    }

    changeEncoding(encoding)
    {
        this.encoding = encoding;
        this.decoder = new TextDecoder(encoding);
        this.text = this.decodeTextFix(new Uint8Array(this.rawLyrics).buffer);
        this.setLyricsText(this.text);
        this.updateTitleAndMediaStatus();
    }

    createControls()
    {
        // time
        this.progressTime = document.createElement("p");
        this.progressTime.id = "note_time";
        // it'll always be on top
        this.progressTime.onclick = event => {
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


        // play pause
        const playPauseButton = getSeqUIButton("Play/Pause",
            getPauseSvg(ICON_SIZE));
        this.playPause = playPauseButton;
        this.locale.bindObjectProperty(playPauseButton, "title", "locale.sequencerController.playPause");
        const togglePlayback = () => {
            if(this.seq.paused)
            {
                this.seqPlay();
            }
            else
            {
                this.seqPause()
            }
        }
        playPauseButton.onclick = togglePlayback;


        // previous song button
        const previousSongButton = getSeqUIButton("Previous song",
        getBackwardSvg(ICON_SIZE));
        this.locale.bindObjectProperty(previousSongButton, "title", "locale.sequencerController.previousSong");
        previousSongButton.onclick = () => this.switchToPreviousSong();

        // next song button
        const nextSongButton = getSeqUIButton("Next song",
            getForwardSvg(ICON_SIZE));
        this.locale.bindObjectProperty(nextSongButton, "title", "locale.sequencerController.nextSong");
        nextSongButton.onclick = () => this.switchToNextSong();

        // loop button
        const loopButton = getSeqUIButton("Loop this",
            getLoopSvg(ICON_SIZE));
        this.locale.bindObjectProperty(loopButton, "title", "locale.sequencerController.loopThis");
        const toggleLoop = () => {
            if(this.seq.loop)
            {
                this.seq.loop = false;
            }
            else
            {
                this.seq.loop = true;
                if(this.seq.currentTime >= this.seq.duration)
                {
                    this.seq.currentTime = 0;
                }
            }
            loopButton.firstElementChild.setAttribute("fill", (this.seq.loop ? this.iconColor : this.iconDisabledColor));
        }
        loopButton.onclick = toggleLoop;
        this.loopButton = loopButton;


        // show text button
        const textButton = getSeqUIButton("Show lyrics",
            getTextSvg(ICON_SIZE));
        this.locale.bindObjectProperty(textButton, "title", "locale.sequencerController.lyrics.show");
        textButton.firstElementChild.setAttribute("fill", this.iconDisabledColor); // defaults to disabled
        const toggleLyrics = () => {
            this.lyricsElement.mainDiv.classList.toggle("lyrics_show");
            textButton.firstElementChild.setAttribute("fill", (this.lyricsElement.mainDiv.classList.contains("lyrics_show") ? this.iconColor : this.iconDisabledColor));
        }
        textButton.onclick = toggleLyrics;

        // keyboard control
        document.addEventListener("keydown", event => {
            switch(event.key.toLowerCase())
            {
                case keybinds.playPause:
                    event.preventDefault();
                    togglePlayback();
                    break;

                case keybinds.toggleLoop:
                    event.preventDefault();
                    toggleLoop();
                    break;

                case keybinds.toggleLyrics:
                    event.preventDefault();
                    toggleLyrics();
                    break;

                default:
                    break;
            }
        })

        // add everything
        controlsDiv.appendChild(previousSongButton); // |<
        controlsDiv.appendChild(loopButton);         // ()
        controlsDiv.appendChild(playPauseButton);    // ||
        controlsDiv.appendChild(textButton);         // ==
        controlsDiv.appendChild(nextSongButton);     // >|

        this.controls.appendChild(progressBarBg);
        progressBarBg.appendChild(this.progressBar);
        this.controls.appendChild(this.progressTime);
        this.controls.appendChild(controlsDiv);

        // add number and arrow controls
        document.addEventListener("keydown", e => {

            switch (e.key.toLowerCase())
            {
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
                    if(!isNaN(parseFloat(e.key)))
                    {
                        e.preventDefault();
                        const num = parseInt(e.key);
                        if(0 <= num && num <= 9)
                        {
                            this.seq.currentTime = this.seq.duration * (num / 10);
                            playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                        }
                    }
                    break;
            }
        })
    }

    _updateInterval()
    {
        this.progressBar.style.width = `${(this.seq.currentTime / this.seq.duration) * 100}%`;
        const time = formatTime(this.seq.currentTime);
        const total = formatTime(this.seq.duration);
        this.progressTime.innerText = `${time.time} / ${total.time}`;
        if(this.requiresTextUpdate)
        {
            this.updateOtherTextEvents();
            this.requiresTextUpdate = false;
        }
    }

    setSliderInterval()
    {
        setInterval(this._updateInterval.bind(this), 100);
    }
}
SequencerUI.prototype.createNavigatorHandler = createNavigatorHandler;
SequencerUI.prototype.updateTitleAndMediaStatus = updateTitleAndMediaStatus;

SequencerUI.prototype.createLyrics = createLyrics;
SequencerUI.prototype.setLyricsText = setLyricsText;
SequencerUI.prototype.updateOtherTextEvents = updateOtherTextEvents;

export { SequencerUI }