/**
 * settings_html.js
 * purpose: the inner html for the settings element
 */

// translate-path: only innerText: translate-path-title: inner text by adding .title and title by adding .description
export const settingsHtml = `
<h1 translate-path='locale.settings.mainTitle'></h1>
<div class='settings_groups_parent'>
    <div class='settings_group'>
        <h2 translate-path='locale.settings.rendererSettings.title'></h2>
        <label 
        translate-path-title='locale.settings.rendererSettings.noteFallingTime'></label>
        <p style='display: flex; align-items: center; width: 100%; justify-content: center'>
            <input type='range' min='1' max='9999' value='1000' class='settings_slider' id='note_time_slider'>
            <span>1000ms</span>
            </span>
        </p>
        
        <label translate-path-title='locale.settings.rendererSettings.waveformThickness'></label>
        <p style='display: flex; align-items: center; width: 100%; justify-content: center'>
            <input type='range' min='0' max='10' value='2' class='settings_slider' id='analyser_thickness_slider'>
            <span>2px</span>
            </span>
        </p>
        
        <label 
        translate-path-title='locale.settings.rendererSettings.waveformSampleSize'></label>
        <p style='display: flex; align-items: center; width: 100%; justify-content: center'>
            <input type='range' min='5' max='15' value='9' class='settings_slider' id='analyser_fft_slider'>
            <span>512</span>
            </span>
        </p>
        
        <label translate-path-title='locale.settings.rendererSettings.waveformAmplifier'></label>
        <p style='display: flex; align-items: center; width: 100%; justify-content: center'>
            <input type='range' min='1' max='20' value='2' class='settings_slider' id='wave_multiplier_slider'>
            <span>2</span>
            </span>
        </p>
        <button class='seamless_button' id='analyser_toggler' translate-path-title='locale.settings.rendererSettings.toggleWaveformsRendering'></button>
        <br/>
        <button class='seamless_button' id='note_toggler' translate-path-title='locale.settings.rendererSettings.toggleNotesRendering'></button>
        <br/>
        <button class='seamless_button' id='active_note_toggler' translate-path-title='locale.settings.rendererSettings.toggleDrawingActiveNotes'></button>
        <br/>
        <button class='seamless_button' id='visual_pitch_toggler' translate-path-title='locale.settings.rendererSettings.toggleDrawingVisualPitch'></button>
    </div>


    <div class='settings_group'>
        <h2 translate-path='locale.settings.keyboardSettings.title'></h2>
        <p translate-path-title='locale.settings.keyboardSettings.selectedChannel'></p>
        <select id='channel_selector'>
        </select>
        <br/>
        <br/>
        <p translate-path-title='locale.settings.keyboardSettings.keyboardSize'></p>
        <select id='keyboard_size_selector'>
            <option value='full' translate-path='locale.settings.keyboardSettings.keyboardSize.full'></option>
            <option value='piano' translate-path='locale.settings.keyboardSettings.keyboardSize.piano'></option>
            <option value='5 octaves' translate-path='locale.settings.keyboardSettings.keyboardSize.fiveOctaves'></option>
        </select>
        <br/>
        <br/>
        <button class='seamless_button' id='mode_selector' translate-path-title='locale.settings.keyboardSettings.toggleTheme'></button>
    </div>
    
    
    <div class='settings_group'>
        <h2 translate-path='locale.settings.midiSettings.title'></h2>
        <p translate-path-title='locale.settings.midiSettings.midiInput'></p>
        <select id='midi_input_selector'>
            <option value='-1' translate-path='locale.settings.midiSettings.midiInput.disabled'></option>
        </select>
        
        <br/>
        <br/>
        <p translate-path-title='locale.settings.midiSettings.midiOutput'></p>
        <select id='midi_output_selector'>
            <option value='-1' translate-path='locale.settings.midiSettings.midiOutput.disabled'></option>
        </select>
    </div>
    
    
    <div class='settings_group'>
        <h2 translate-path='locale.settings.interfaceSettings.title'></h2>
        <button class='seamless_button' id='toggle_mode_button' translate-path-title='locale.settings.interfaceSettings.toggleTheme'></button>
        <br/>
        <br/>
        <p translate-path-title='locale.settings.interfaceSettings.selectLanguage'></p>
        <select id='language_selector'>
        </select>
    </div>
</div>
`;