import { getContent } from "./get_content.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import type { LocaleManager } from "../locale/locale_manager.ts";

const NOTIFICATION_TIME = 13;

let notificationCounter = 0;
const notifications: Record<
    number,
    {
        div: HTMLDivElement;
        timeout: number;
        onclose?: () => unknown;
    }
> = {};

export interface NotificationType {
    div: HTMLDivElement;
    id: number;
}

/**
 * @param notification - the notification
 * @param target - the element that caused this callback
 */
type NotificationContentCallback = (
    notification: NotificationType,
    target: HTMLElement
) => unknown;

// If the "structure" of the two types is exactly the same, the function types match
type IfEquals<X, Y, A = X, B = never> =
    // If T extends X (matches), then 1, otherwise 2
    (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 // Compare the same but for Y instead of X
        ? // Matches
          A
        : // Does not match
          B;

type WritableStringKeys<T> = {
    // For every string key
    [K in keyof T]-?: T[K] extends string
        ? IfEquals<
              // Original readonly
              { [P in K]: T[P] },
              // Not readonly
              { -readonly [P in K]: T[P] },
              // Matches, keep as is
              K
              // Otherwise discard
          >
        : never;
}[keyof T];

type ListenerType<K extends keyof HTMLElementEventMap> = Record<
    K,
    (e: HTMLElementEventMap[K]) => unknown
>;

export interface NotificationContent {
    type:
        | "button"
        | "progress"
        | "text"
        | "input"
        | "toggle"
        | "range"
        | "file"
        | "select";
    // As value: content. This only applies to the "select" type
    selectOptions?: Record<string, string>;
    textContent?: string;
    translatePathTitle?: string;
    translatePathTitleProps?: string[];
    attributes?: Partial<
        Pick<HTMLInputElement, WritableStringKeys<HTMLInputElement>> & {
            checked: "checked";
            onchange: () => unknown;
            [key: string]: string | (() => unknown);
        }
    >;
    onClick?: NotificationContentCallback;
    listeners?: Partial<ListenerType<keyof HTMLElementEventMap>>;
}

type WritableCSSDeclarations = Pick<
    typeof CSSStyleDeclaration.prototype,
    WritableStringKeys<typeof CSSStyleDeclaration.prototype>
>;

/**
 * @param title
 * @param contents
 * @param time seconds
 * @param allowClosing
 * @param locale
 * @param contentStyling
 * @param onclose
 */
export function showNotification(
    title: string,
    contents: NotificationContent[],
    time: number = NOTIFICATION_TIME,
    allowClosing = true,
    locale?: LocaleManager,
    contentStyling?: Partial<WritableCSSDeclarations>,
    onclose?: () => unknown
): NotificationType {
    const notification = document.createElement("div");
    const notificationID = notificationCounter++;

    notification.classList.add("notification");
    notification.innerHTML = `
    <div class='top'>
        <h2 class='notification_title'>${title}</h2>
        <span class='close_btn'>×</span>
    </div>`;
    const contentWrapper: HTMLElement = document.createElement("div");
    contentWrapper.classList.add("notification_content");

    if (contentStyling) {
        for (const [key, value] of Object.entries(contentStyling)) {
            contentWrapper.style[key as keyof WritableCSSDeclarations] = value!;
        }
    }
    notification.append(contentWrapper);
    for (const content of contents) {
        const element = getContent(content, locale);
        if (content.onClick) {
            element.addEventListener("click", () =>
                content.onClick?.(
                    { div: notification, id: notificationID },
                    element
                )
            );
        }
        contentWrapper.append(element);
    }

    const closeButton = notification.querySelectorAll(
        ".close_btn"
    )[0] as HTMLElement;
    if (allowClosing) {
        closeButton.addEventListener("click", () => {
            closeNotification(notificationID);
        });
    } else {
        closeButton.style.display = "none";
    }

    setTimeout(() => {
        notification.classList.add("drop");
    }, ANIMATION_REFLOW_TIME);
    const timeoutID = window.setTimeout(
        () => {
            closeNotification(notificationID);
        },
        time * 1000 + ANIMATION_REFLOW_TIME
    );
    document.querySelectorAll(".notification_field")[0].append(notification);
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

export function closeNotification(id: number) {
    if (notifications[id] === undefined) {
        return;
    }
    const notificationEl = notifications[id];
    const notification = notificationEl.div;
    clearTimeout(notifications[id].timeout);
    notification.classList.remove("drop");
    setTimeout(() => notification.remove(), 500);
    if (notificationEl.onclose) {
        notificationEl.onclose();
    }
    delete notifications[id];
}
