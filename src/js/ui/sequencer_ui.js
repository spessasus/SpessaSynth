import {Sequencer} from "../midi_player/sequencer/sequencer.js";
import {formatTime} from "../utils/other.js";
import {getPauseSvg, getPlaySvg} from "./icons.js";

const ICON_SIZE = 32;

export class SequencerUI{
    /**
     * Creates a new User Interface for the given MidiSequencer
     */
    constructor() {
        this.controls = document.getElementById("sequencer_controls");
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
    }

    createControls() {
        // time
        this.progressTime = document.createElement("p");
        this.progressTime.id = "note_time";
        // it'll always be on top
        this.progressTime.onclick = event => {
            const barPosition = progressBarBg.getBoundingClientRect();
            const x = event.clientX - barPosition.left;
            const width = barPosition.width;

            this.seq.currentTime = (x / width) * this.seq.duration;
        };

        // background bar
        const progressBarBg = document.createElement("div");
        progressBarBg.id = "note_progress_background";

        // foreground bar
        this.progressBar = document.createElement("div");
        this.progressBar.id = "note_progress";
        this.progressBar.min = (0).toString();
        this.progressBar.max =  this.seq.duration.toString();

        // control buttons
        const controlsDiv = document.createElement("div");

        const playPauseButton = document.createElement("div");
        playPauseButton.classList.add("control_buttons");
        playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
        const togglePlayback = () =>
        {
            if(this.seq.paused)
            {
                console.log("playing");
                this.seq.play();
                playPauseButton.innerHTML = getPauseSvg(ICON_SIZE);
            }
            else
            {
                console.log("pausing");
                this.seq.pause();
                playPauseButton.innerHTML = getPlaySvg(ICON_SIZE);
            }
        }
        playPauseButton.onclick = togglePlayback;

        document.addEventListener("keypress", event => {
            if(event.key === " ")
            {
                togglePlayback();
            }
        })

        controlsDiv.appendChild(playPauseButton);

        // add everything
        this.controls.appendChild(progressBarBg);
        this.controls.appendChild(this.progressBar);
        this.controls.appendChild(this.progressTime);
        this.controls.appendChild(controlsDiv);

        // add number controls
        document.addEventListener("keypress", e => {
            if(!isNaN(parseFloat(e.key)))
            {
                const num = parseInt(e.key);
                if(0 <= num && num <= 9)
                {
                    this.seq.currentTime = this.seq.duration * (num / 9);
                }
            }
        })
    }

    setSliderInterval(){
        setInterval(() => {
            this.progressBar.style.width = `${(this.seq.currentTime / this.seq.duration) * 100}%`;
            const time = formatTime(this.seq.currentTime);
            const total = formatTime(this.seq.duration);
            this.progressTime.innerText = `${time.time} / ${total.time}`;
        }, 100);
    }
}