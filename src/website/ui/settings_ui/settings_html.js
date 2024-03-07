export const settingsHtml = `
<h1>Program settings</h1>
<div class='settings_groups_parent'>
    <div class='settings_group'>
    <h2>Renderer settings</h2>
    <label title='How fast the notes fall (visually)'> Note falling time (milisseconds) </label>
    <p style='display: flex; align-items: center; width: 100%; justify-content: center'>
        <input type='range' min='1' max='9999' value='1000' class='settings_slider' id='note_time_slider'>
        <span>1000ms</span>
        </span>
    </p>
    
    <label title='How thick the analyser lines are'> Waveform line thickness (px) </label>
    <p style='display: flex; align-items: center; width: 100%; justify-content: center'>
        <input type='range' min='0' max='10' value='2' class='settings_slider' id='analyser_thickness_slider'>
        <span>2px</span>
        </span>
    </p>
    
    <label title='How detalied the waveforms are'> Waveform sample size </label>
    <p style='display: flex; align-items: center; width: 100%; justify-content: center'>
        <input type='range' min='5' max='15' value='9' class='settings_slider' id='analyser_fft_slider'>
        <span>512</span>
        </span>
    </p>
    
    <label title='How vibrant are the waveforms'> Waveform amplifier </label>
    <p style='display: flex; align-items: center; width: 100%; justify-content: center'>
        <input type='range' min='1' max='20' value='2' class='settings_slider' id='wave_multiplier_slider'>
        <span>2</span>
        </span>
    </p>
    
    <button class='seamless_button' id='analyser_toggler' title='Toggle rendering of the waveforms of the channels'>Toggle waveforms rendering</button>
    <br/>
    <button class='seamless_button' id='note_toggler' title='Toggle rendering of the notes when playing a MIDI file'>Toggle notes rendering</button>
    <br/>
    <button class='seamless_button' id='active_note_toggler' title='Toggle notes "lighting up" when they get active'>Toggle drawing active notes</button>
</div>


<div class='settings_group'>
    <h2>Keyboard settings</h2>
    <p title='The channel keyboard sends messages to'>Selected channel:</p>
    <select id='channel_selector'>
    </select>
    <br/>
    <button class='seamless_button' id='mode_selector' title='Toggle the keyboard thee'>Mode: White</button>
</div>


<div class='settings_group'>
    <h2>MIDI Settings</h2>
    <p title='The port to listen on for MIDI messages'>MIDI Input</p>
    <select id='midi_input_selector'>
        <option value='-1'>Disabled</option>
    </select>
    
    <br/>
    <br/>
    <p title='The port to play the MIDI file to'>MIDI Output</p>
    <select id='midi_output_selector'>
        <option value='-1'>Use SpessaSynth</option>
    </select>
</div>


<div class='settings_group'>
    <h2>Interface Settings</h2>
    <button class='seamless_button' id='toggle_mode_button' title='Toggle the interface theme'>Mode: Dark</button>
</div>
</div>
`;