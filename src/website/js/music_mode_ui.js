import { getDoubleNoteSvg } from './icons.js'
import { formatTime } from '../../spessasynth_lib/utils/other.js'

/**
 * music_mode_ui.js
 * purpose: manages the music mode gui, hiding keyboard and renderer from view
 */


const TRANSITION_TIME = 0.5;

export class MusicModeUI {
    /**
     * Creates a new class for displaying information about the current file.
     * @param element {HTMLElement}
     * @param localeManager {LocaleManager}
     */
    constructor(element, localeManager) {
        this.mainDiv = element;
        // load html
        this.mainDiv.innerHTML = `
        <div class='player_info_wrapper'>
            <div class="player_info_note_icon">
                ${getDoubleNoteSvg("100%")}
            </div>
            <div class='player_info_details'>
                <p style='font-size: small'><i translate-path='locale.musicPlayerMode.currentlyPlaying'></i></p>
                <h1 id='player_info_title' translate-path='locale.musicPlayerMode.nothingPlaying'></h1>
                <h3><i id='player_info_detail' translate-path='locale.musicPlayerMode.nothingPlayingCopyright'></i></h3>
                <h3 id='player_info_time'></h3>
            </div>
        </div>`;

        // apply locale bindings
        for (const el of this.mainDiv.querySelectorAll("*[translate-path]"))
        {
            localeManager.bindObjectProperty(el, "textContent", el.getAttribute("translate-path"));
        }

        this.savedKeyboardHeight = 0;
        this.timeoutId = -1;
        this.visible = false;
    }

    /**
     * @param seq {Sequencer}
     */
    connectSequencer(seq)
    {
        this.seq = seq;
        this.seq.addOnSongChangeEvent(mid => {
            // get the title
            let title;
            if(mid.midiName.length > 0)
            {
                title = mid.midiName;
            }
            else
            {
                title =  mid.fileName;
            }
            document.getElementById("player_info_title").textContent = title;
            // use file name if no copyright detected
            if(mid.copyright.replaceAll("\n", "").length > 0)
            {
                document.getElementById("player_info_detail").textContent = mid.copyright + mid.fileName;
            }
            else
            {
                document.getElementById("player_info_detail").textContent = mid.fileName;
            }
            document.getElementById("player_info_time").textContent = formatTime(this.seq.duration).time;
        }, "player-js-song-change");
    }

    /**
     * @param visible {boolean}
     * @param canvas {HTMLCanvasElement}
     * @param keyboard {HTMLDivElement}
     */
    setVisibility(visible, canvas, keyboard)
    {
        if(visible === this.visible)
        {
            return;
        }
        this.visible = visible;
        if(this.timeoutId)
        {
            clearTimeout(this.timeoutId);
        }
        const playerDiv = this.mainDiv;
        if(visible)
        {
            // PREPARATION
            // renderer and keyboard
            canvas.classList.add("out_animation");
            keyboard.classList.add("out_animation");
            this.savedKeyboardHeight = keyboard.clientHeight;

            // music mode
            // hacky: get position of the canvas and temporarily set to absolute (set to normal after finish)
            const playerHeight = canvas.clientHeight + keyboard.clientHeight;
            const playerTop = canvas.getBoundingClientRect().top;
            playerDiv.style.position = "absolute";
            playerDiv.style.top = `${playerTop}px`;
            playerDiv.style.height = `${playerHeight}px`;
            playerDiv.style.display = "flex";

            // START
            setTimeout(() => {
                playerDiv.classList.add("player_info_show");
                document.body.style.overflow = "hidden";
            }, 10);

            // FINISH
            this.timeoutId = setTimeout(() => {
                canvas.style.display = "none";
                keyboard.style.display = "none";

                playerDiv.style.position = "";
                playerDiv.style.top = "";
                playerDiv.style.height = "";

                document.body.style.overflow = "";
            }, TRANSITION_TIME * 1000)
        }
        else
        {
            // PREPARATION
            // renderer and keyboard
            // hacky: get position of the music mode and temporarily set to absolute (set to normal after finish)
            const canvasHeight = playerDiv.clientHeight - this.savedKeyboardHeight;
            const canvasTop = playerDiv.getBoundingClientRect().top;
            canvas.style.display = "";
            canvas.style.position = "absolute";
            canvas.style.top = `${canvasTop}px`;
            canvas.style.height = `${canvasHeight}px`;

            const keyboardTop = canvasTop + canvasHeight;
            const keyboardMinHeight = keyboard.style.minHeight;
            keyboard.style.display = "";
            keyboard.style.position = "absolute";
            keyboard.style.top = `${keyboardTop}px`;
            keyboard.style.height = `${this.savedKeyboardHeight}px`;
            keyboard.style.minHeight = `${this.savedKeyboardHeight}px`;

            // music mode
            playerDiv.classList.remove("player_info_show");

            // START
            setTimeout(() => {
                canvas.classList.remove("out_animation");
                keyboard.classList.remove("out_animation");
                document.body.style.overflow = "hidden";
            }, 10);

            // FINISH
            this.timeoutId = setTimeout(() => {
                playerDiv.style.display = "none";

                canvas.style.position = "";
                canvas.style.top = "";
                canvas.style.height = "";

                keyboard.style.top = "";
                keyboard.style.height = "";
                keyboard.style.minHeight = keyboardMinHeight;
                keyboard.style.position = "";

                document.body.style.overflow = "";
            }, TRANSITION_TIME * 1000);
        }
    }
}