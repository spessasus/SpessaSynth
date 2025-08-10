/**
 * Sequi_button.js
 * purpose: formats a basic button for the sequencer_ui.js
 */

/**
 * @param title
 * @param html use carefully!
 * @returns
 */
export function getSeqUIButton(title: string, html: string): HTMLDivElement {
    const button = document.createElement("div");
    button.classList.add("control_buttons");
    button.title = title;
    button.innerHTML = html;
    return button;
}
