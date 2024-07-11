const NOTIFICATION_TIME = 13;

let notificationCounter = 0;
/**
 * @type {Object<number, {div: HTMLDivElement, timeout: number}>}
 */
const notifications = {};

/**
 * @typedef {Object} NotificationType
 * @property {HTMLDivElement} div
 * @property {number} id
 */

/**
 * @typedef {Object} NotificationContent
 * @property {"button"|"progress"|"text"|"input"} type
 * @property {string|undefined} textContent
 * @property {Object<string, string>|undefined} attributes
 * @property {function(NotificationType)|undefined} onClick
 */

/**
 * @param title {string}
 * @param contents {NotificationContent[]}
 * @param time {number} seconds
 * @param allowClosing {boolean}
 * @returns {NotificationType}
 */
export function showNotification(
    title,
    contents,
    time = NOTIFICATION_TIME,
    allowClosing = true)
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
    notification.appendChild(contentWrapper);
    for(const content of contents)
    {
        switch(content.type)
        {
            case "button":
                const btn = document.createElement("button");
                btn.textContent = content.textContent;
                btn.onclick = () => content.onClick({div: notification, id: notificationID});
                if(content.attributes)
                {
                    for(const [key, value] of Object.entries(content.attributes))
                    {
                        btn.setAttribute(key, value);
                    }
                }
                contentWrapper.appendChild(btn);
                break;

            case "text":
                const p = document.createElement("p");
                p.textContent = content.textContent;
                if(content.attributes)
                {
                    for(const [key, value] of Object.entries(content.attributes))
                    {
                        p.setAttribute(key, value);
                    }
                }
                contentWrapper.appendChild(p);
                break;

            case "input":
                const input = document.createElement("input");
                input.textContent = content.textContent;
                if(content.attributes)
                {
                    for(const [key, value] of Object.entries(content.attributes))
                    {
                        input.setAttribute(key, value);
                    }
                }
                input.addEventListener("keydown", e => e.stopPropagation());
                contentWrapper.appendChild(input);
                break;

            case "progress":
                const background = document.createElement("div");
                background.classList.add("notification_progress_background");
                const progress = document.createElement("div");
                progress.classList.add("notification_progress");
                if(content.attributes)
                {
                    for(const [key, value] of Object.entries(content.attributes))
                    {
                        progress.setAttribute(key, value);
                        background.setAttribute(key, value);
                    }
                }
                background.appendChild(progress);
                contentWrapper.appendChild(background);
        }

    }

    if(allowClosing)
    {
        notification.getElementsByClassName("close_btn")[0].onclick = () => {
            closeNotification(notificationID);
        };
    }
    else
    {
        notification.getElementsByClassName("close_btn")[0].style.display = "none";
    }

    setTimeout(() => {
        notification.classList.add("drop");
    }, 10)
    const timeoutID = setTimeout(() => {
        closeNotification(notificationID);
    }, time * 1000 + 10);
    document.getElementsByClassName("spessasynth_main")[0].appendChild(notification);
    notifications[notificationID] = {
        div: notification,
        timeout: timeoutID
    }
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
    const notification = notifications[id].div;
    clearTimeout(notifications[id].timeout);
    notification.classList.remove("drop")
    setTimeout(() => notification.parentElement.removeChild(notification), 500);
    notifications[id] = undefined;

}