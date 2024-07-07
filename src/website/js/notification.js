const NOTIFICATION_TIME = 13000;
/**
 * @param title {string}
 * @param message {string}
 * @param time {number}
 */
export function showNotification(title, message, time = NOTIFICATION_TIME)
{
    const notification = document.createElement("div");
    notification.classList.add("notification");
    notification.innerHTML = `<div class='top'><h2>${title}</h2><span class='close_btn'>×</span></div>
   
    <p>${message}</p>`;

    notification.getElementsByClassName("close_btn")[0].onclick = () => {
        closeNotification(notification);
    };

    setTimeout(() => {
        notification.classList.add("drop");
    }, 10)

    document.body.appendChild(notification);
    setTimeout(() => {
        closeNotification(notification);
    }, time + 10);
}

/**
 * @param notification {HTMLDivElement}
 */
function closeNotification(notification)
{
    notification.classList.remove("drop")
    setTimeout(() => document.body.removeChild(notification), 500);

}