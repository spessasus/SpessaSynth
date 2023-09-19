/**
 * @param title {string}
 * @param html {string} use carefully!
 * @returns {HTMLDivElement}
 */
export function getSeqUIButton(title, html)
{
    const button = document.createElement("div");
    button.classList.add("control_buttons");
    button.title = title;
    button.innerHTML = html;
    return button;
}