import { getContent } from "./get_content.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import type { LocaleManager } from "../manager/locale_manager.ts";

const NOTIFICATION_TIME = 13;
// Longer notifications are practically permanent,
// So they show no countdown
const MAX_COUNTDOWN_TIME = 120;
// Matches the transitions in notification.css
const CLOSE_ANIMATION_TIME = 500;

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
        <h2 class='notification_title'></h2>
        <span class='close_btn' role='button' tabindex='0'></span>
    </div>`;
    // The title can contain text from files, so it is never parsed as HTML
    notification.querySelector(".notification_title")!.textContent = title;
    const contentWrapper: HTMLElement = document.createElement("div");
    contentWrapper.classList.add("notification_content");

    if (contentStyling) {
        for (const [key, value] of Object.entries(contentStyling)) {
            contentWrapper.style[key as keyof WritableCSSDeclarations] = value!;
        }
    }
    notification.append(contentWrapper);
    for (const [index, content] of contents.entries()) {
        const element = getContent(content, locale);
        element.style.setProperty("--i", index.toString());
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

    const closeButton = notification.querySelector<HTMLElement>(".close_btn")!;
    if (allowClosing) {
        closeButton.addEventListener("click", () => {
            closeNotification(notificationID);
        });
        closeButton.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                closeNotification(notificationID);
            }
        });
    } else {
        closeButton.style.display = "none";
    }

    const record: (typeof notifications)[number] = {
        div: notification,
        timeout: 0,
        onclose: onclose
    };
    notifications[notificationID] = record;

    // Only notifications that actually expire get a countdown.
    // Hovering one pauses it so there is time to read (QoL)
    let remaining = time * 1000 + ANIMATION_REFLOW_TIME;
    let startedAt = 0;
    const startTimer = () => {
        startedAt = Date.now();
        record.timeout = window.setTimeout(() => {
            closeNotification(notificationID);
        }, remaining);
    };
    startTimer();
    if (time <= MAX_COUNTDOWN_TIME) {
        const rail = document.createElement("div");
        rail.classList.add("notification_timer");
        notification.style.setProperty("--life", `${time}s`);
        notification.append(rail);
        notification.addEventListener("mouseenter", () => {
            if (notifications[notificationID] === undefined) {
                return;
            }
            clearTimeout(record.timeout);
            remaining -= Date.now() - startedAt;
            notification.classList.add("paused");
        });
        notification.addEventListener("mouseleave", () => {
            if (notifications[notificationID] === undefined) {
                return;
            }
            notification.classList.remove("paused");
            startTimer();
        });
    }

    document.querySelector(".notification_field")!.append(notification);
    // The notification starts collapsed to zero height, so the ones below slide
    notification.style.setProperty("--h", `${notification.offsetHeight}px`);
    setTimeout(() => {
        notification.classList.add("drop");
    }, ANIMATION_REFLOW_TIME);
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
    clearTimeout(notificationEl.timeout);
    // Collapse to the current height, so the notifications below slide up
    notification.style.setProperty("--h", `${notification.offsetHeight}px`);
    notification.classList.remove("drop");
    notification.classList.add("closing");
    setTimeout(() => notification.remove(), CLOSE_ANIMATION_TIME);
    if (notificationEl.onclose) {
        notificationEl.onclose();
    }
    delete notifications[id];
}
