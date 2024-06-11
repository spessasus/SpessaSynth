import { Sequencer } from '../../../spessasynth_lib/sequencer/sequencer.js'
import { formatTime, supportedEncodings } from '../../../spessasynth_lib/utils/other.js'
import { getBackwardSvg, getForwardSvg, getLoopSvg, getPauseSvg, getPlaySvg, getTextSvg } from '../icons.js'
import { messageTypes } from '../../../spessasynth_lib/midi_parser/midi_message.js'
import { getSeqUIButton } from './sequi_button.js'

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

export class SequencerUI{
    /**
     * Creates a new User Interface for the given MidiSequencer
     * @param element {HTMLElement} the element to create sequi in
     * @param locale {LocaleManager}
     */
    constructor(element, locale) {
        this.iconColor = ICON_COLOR;
        this.iconDisabledColor = ICON_DISABLED_COLOR;
        this.controls = element;
        this.encoding = DEFAULT_ENCODING;
        this.decoder = new TextDecoder(this.encoding);
        this.encoder = new TextEncoder(this.encoding);
        this.text = "";
        this.requiresTextUpdate = false;
        this.rawText = [];
        this.titles = [""];
        this.mode = "dark";
        this.locale = locale;
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
        this.lyricsElement.text.classList.toggle("lyrics_light");
        this.lyricsElement.selector.classList.toggle("lyrics_light");
    }

    createNavigatorHandler()
    {
        if(!navigator.mediaSession)
        {
            return;
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: this.titles[this.seq.songIndex],
            artist: "SpessaSynth"
        });

        navigator.mediaSession.setActionHandler("play", () => {
            this.seqPlay();
        });
        navigator.mediaSession.setActionHandler("pause", () => {
            this.seqPause();
        });
        navigator.mediaSession.setActionHandler("stop", () => {
            this.seq.currentTime = 0;
            this.seqPause();
        });
        navigator.mediaSession.setActionHandler("seekbackward", e => {
            this.seq.currentTime -= e.seekOffset || 10;
        });
        navigator.mediaSession.setActionHandler("seekforward", e => {
            this.seq.currentTime += e.seekOffset || 10;
        });
        navigator.mediaSession.setActionHandler("seekto", e => {
            this.seq.currentTime = e.seekTime
        });
        navigator.mediaSession.setActionHandler("previoustrack", () => {
            this.switchToPreviousSong();
        });
        navigator.mediaSession.setActionHandler("nexttrack", () => {
            this.switchToNextSong();
        });

        navigator.mediaSession.playbackState = "playing";
    }

    seqPlay()
    {
        this.seq.play();
        this.createNavigatorHandler();
        this.updateTitleAndMediaStatus();
        if(!navigator.mediaSession)
        {
            return;
        }
        navigator.mediaSession.playbackState = "playing";
    }

    seqPause()
    {
        this.seq.pause();
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
     * @param songTitles {string[]}
     */
    setSongTitles(songTitles)
    {
        this.titles = songTitles;
        this.createNavigatorHandler();
        this.updateTitleAndMediaStatus();

        // disable loop if more than 1 song
        if(songTitles.length > 1)
        {
            this.seq.loop = false;
            this.loopButton.firstElementChild.setAttribute("fill", this.iconDisabledColor);
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
            let end = "";
            switch (type)
            {
                default:
                    return;

                case messageTypes.text:
                case messageTypes.copyright:
                case messageTypes.cuePoint:
                case messageTypes.trackName:
                    end = "\n";
                    break;

                case messageTypes.lyric:

                    break;
            }
            const text = this.decoder.decode(data.buffer);
            this.text += text + end;
            this.requiresTextUpdate = true;
            this.rawText.push(...data, ...this.encoder.encode(end));
            if(end === "")
            {
                // instantly append if lyrics and 100ms batches otherwise, to avoid that initial setup text spam (looking at you, touhou midis)
                this.lyricsElement.text.innerText = this.text;
                this.requiresTextUpdate = false;
                this.lyricsElement.mainDiv.scrollTo(0, this.lyricsElement.text.scrollHeight);
            }
        }

        this.seq.onTimeChange = () => {
            this.text = "";
            this.rawText = [];
        }

        this.seq.addOnSongChangeEvent(() => {
            this.updateTitleAndMediaStatus();
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
        this.text = this.decoder.decode(new Uint8Array(this.rawText).buffer);
    }

    createControls() {
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

        /**
         * LYRICS
         * @type {{
         *     mainDiv: HTMLDivElement,
         *     title: HTMLHeadingElement,
         *     text: HTMLParagraphElement,
         *     selector: HTMLSelectElement
         * }}
         */
        this.lyricsElement = {};
        // main div
        const mainLyricsDiv  = document.createElement("div");
        mainLyricsDiv.classList.add("lyrics");
        // title
        const lyricsTitle = document.createElement("h2");
        this.locale.bindObjectProperty(lyricsTitle, "textContent", "locale.sequencerController.lyrics.title");
        lyricsTitle.classList.add("lyrics_title");
        mainLyricsDiv.appendChild(lyricsTitle);
        this.lyricsElement.title = lyricsTitle;
        // encoding selector
        const encodingSelector = document.createElement("select");
        supportedEncodings.forEach(encoding => {
            const option = document.createElement("option");
            option.innerText = encoding;
            option.value = encoding;
            encodingSelector.appendChild(option);
        });
        encodingSelector.value = this.encoding;
        encodingSelector.onchange = () => this.changeEncoding(encodingSelector.value);
        encodingSelector.classList.add("lyrics_selector");
        mainLyricsDiv.appendChild(encodingSelector);
        // the actual text
        const text = document.createElement("p");
        text.classList.add("lyrics_text");
        mainLyricsDiv.appendChild(text);
        this.lyricsElement.text = text;
        this.lyricsElement.mainDiv = mainLyricsDiv;
        this.lyricsElement.selector = encodingSelector;
        this.controls.appendChild(mainLyricsDiv);
        this.requiresTextUpdate = true;


        // background bar
        const progressBarBg = document.createElement("div");
        progressBarBg.id = "note_progress_background";
        this.progressBarBackground = progressBarBg;


        // foreground bar
        this.progressBar = document.createElement("div");
        this.progressBar.id = "note_progress";
        this.progressBar.min = (0).toString();
        this.progressBar.max =  this.seq.duration.toString();


        // control buttons
        const controlsDiv = document.createElement("div");


        // play pause
        const playPauseButton = getSeqUIButton("Play/Pause",
            getPauseSvg(ICON_SIZE));
        this.locale.bindObjectProperty(playPauseButton, "title", "locale.sequencerController.playPause");
        const togglePlayback = () => {
            if(this.seq.paused)
            {
                playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                this.seqPlay();
            }
            else
            {
                this.seqPause()
                playPauseButton.innerHTML = getPlaySvg(ICON_SIZE);
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
        document.addEventListener("keypress", event => {
            switch(event.key.toLowerCase())
            {
                case " ":
                    event.preventDefault();
                    togglePlayback();
                    break;

                case "l":
                    event.preventDefault();
                    toggleLoop();
                    break;

                case "t":
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
        this.controls.appendChild(this.progressBar);
        this.controls.appendChild(this.progressTime);
        this.controls.appendChild(controlsDiv);

        // add number and arrow controls
        document.addEventListener("keydown", e => {

            switch (e.key.toLowerCase())
            {
                case "arrowleft":
                    e.preventDefault();
                    this.seq.currentTime -= 5;
                    playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                    break;

                case "arrowright":
                    e.preventDefault();
                    this.seq.currentTime += 5;
                    playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
                    break;

                case "[":
                    this.switchToPreviousSong();
                    break;

                case "]":
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

    updateTitleAndMediaStatus()
    {
        document.getElementById("title").innerText = this.titles[this.seq.songIndex];
        document.title = this.titles[this.seq.songIndex] + " - SpessaSynth"

        if(!navigator.mediaSession)
        {
            return;
        }
        try {
            navigator.mediaSession.setPositionState({
                duration: this.seq.duration,
                playbackRate: this.seq.playbackRate,
                position: this.seq.currentTime
            });
        }
        catch(e)
        {

        }
    }

    setSliderInterval(){
        setInterval(() => {
            //this.updateTitleAndMediaStatus();
            this.progressBar.style.width = `${(this.seq.currentTime / this.seq.duration) * 100}%`;
            const time = formatTime(this.seq.currentTime);
            const total = formatTime(this.seq.duration);
            this.progressTime.innerText = `${time.time} / ${total.time}`;
            if(this.requiresTextUpdate) {
                this.lyricsElement.text.innerText = this.text;
                this.requiresTextUpdate = false;
                this.lyricsElement.mainDiv.scrollTo(0, this.lyricsElement.text.scrollHeight);
            }
        }, 100);
    }
}