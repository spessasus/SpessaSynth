import { getContent } from "./get_content.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";

const NOTIFICATION_TIME = 13;

let notificationCounter = 0;
/**
 * @type {Object<number, {div: HTMLDivElement, timeout: number, onclose: function}>}
 */
const notifications = {};

/**
 * @typedef {Object} NotificationType
 * @property {HTMLDivElement} div
 * @property {number} id
 */

/**
 * @typedef {Function} NotificationContentCallback
 * @param {NotificationType} notification - the notification
 * @param {HTMLElement} target - the element that caused this callback
 */


/**
 * @typedef {Object} NotificationContent
 * @property {"button"|"progress"|"text"|"input"|"toggle"|"range"|"file"} type
 * @property {string|undefined} textContent
 * @property {string|undefined} translatePathTitle
 * @property {string[]|undefined} translatePathTitleProps
 * @property {Object<string, string>|undefined} attributes
 * @property {NotificationContentCallback|undefined} onClick
 * @property {Object<string, function>|undefined} listeners
 */

/**
 * @param title {string}
 * @param contents {NotificationContent[]}
 * @param time {number} seconds
 * @param allowClosing {boolean}
 * @param locale {LocaleManager}
 * @param contentStyling {Object<string, string>}
 * @param onclose {function()}
 * @returns {NotificationType}
 */
export function showNotification(
    title,
    contents,
    time = NOTIFICATION_TIME,
    allowClosing = true,
    locale = undefined,
    contentStyling = undefined,
    onclose = undefined)
{
    const notification = document.createElement("div");
    const notificationID = notificationCounter++;
    
    notification.classList.add("notification");
    notification.innerHTML = `
    <div class='top'>
        <h2 class='notification_title'>${title}</h2>
        <span class='close_btn'>×</span>
    </div>`;
    const contentWrapper = document.createElement("div");
    contentWrapper.classList.add("notification_content");
    if (contentStyling)
    {
        for (const [key, value] of Object.entries(contentStyling))
        {
            contentWrapper.style[key] = value;
        }
    }
    notification.appendChild(contentWrapper);
    for (const content of contents)
    {
        const element = getContent(content, locale);
        if (content.onClick)
        {
            element.onclick = () => content.onClick({ div: notification, id: notificationID }, element);
        }
        contentWrapper.appendChild(element);
    }
    
    if (allowClosing)
    {
        notification.getElementsByClassName("close_btn")[0].onclick = () =>
        {
            closeNotification(notificationID);
        };
    }
    else
    {
        notification.getElementsByClassName("close_btn")[0].style.display = "none";
    }
    
    setTimeout(() =>
    {
        notification.classList.add("drop");
    }, ANIMATION_REFLOW_TIME);
    const timeoutID = setTimeout(() =>
    {
        closeNotification(notificationID);
    }, time * 1000 + ANIMATION_REFLOW_TIME);
    document.getElementsByClassName("notification_field")[0].appendChild(notification);
    notifications[notificationID] = {
        div: notification,
        timeout: timeoutID,
        onclose: onclose
    };
    return {
        div: notification,
        id: notificationID
    };
}

/**
 * @param id {number}
 */
export function closeNotification(id)
{
    if (notifications[id] === undefined)
    {
        return;
    }
    const notificationEl = notifications[id];
    const notification = notificationEl.div;
    clearTimeout(notifications[id].timeout);
    notification.classList.remove("drop");
    setTimeout(() => notification.parentElement.removeChild(notification), 500);
    if (notificationEl.onclose)
    {
        notificationEl.onclose();
    }
    notifications[id] = undefined;
}