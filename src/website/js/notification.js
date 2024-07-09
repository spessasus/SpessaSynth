const NOTIFICATION_TIME = 13000;

let notificationCounter = 0;
/**
 * @type {Object<number, {div: HTMLDivElement, timeout: number}>}
 */
const notifications = {};
/**
 * @param title {string}
 * @param message {string}
 * @param time {number}
 * @param allowClosing {boolean}
 * @param progressBar {boolean}
 * @returns {{div: HTMLDivElement, id: number}}
 */
export function showNotification(
    title,
    message,
    time = NOTIFICATION_TIME,
    allowClosing = true,
    progressBar = false)
{
    const notification = document.createElement("div");
    const notificationID = notificationCounter++;
    notification.classList.add("notification");
    notification.innerHTML = `
    <div class='top'>
        <h2 class='notification_title'>${title}</h2>
        <span class='close_btn'>×</span>
    </div>
    <p class='notification_message'>${message}</p>`;
    if(progressBar)
    {
        notification.innerHTML +=
            `<div class="notification_progress_background">
                <div class="notification_progress"></div>
            </div>`;
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

    document.getElementsByClassName("spessasynth_main")[0].appendChild(notification);
    const timeoutID = setTimeout(() => {
        closeNotification(notificationID);
    }, time + 10);
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