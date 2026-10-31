const TOOLTIP_DELAY_MS = 0;
const TOOLTIP_GAP = 8;
const TOOLTIP_EDGE_MARGIN = 8;

/**
 * Shows a styled tooltip for every element with a "data-tooltip" attribute.
 * A single tooltip element is shared by the whole page.
 */
export class Tooltip {
    /**
     * The floating element that displays the text.
     */
    private readonly element;
    /**
     * The element whose tooltip is pending or visible.
     */
    private target?: HTMLElement;
    private showTimeout?: number;

    public constructor() {
        this.element = document.createElement("div");
        this.element.id = "tooltip";
        this.element.classList.add("tooltip");
        this.element.setAttribute("role", "tooltip");
        document.body.append(this.element);

        document.addEventListener("pointerover", (event) =>
            this.handlePointerOver(event)
        );
        document.addEventListener("pointerout", (event) =>
            this.handlePointerOut(event)
        );
        // Keyboard users get the tooltip when an element is focused with the keyboard
        document.addEventListener("focusin", (event) =>
            this.handleFocusIn(event)
        );
        document.addEventListener("focusout", () => this.hide());
        // Hide on any interaction, scrolling or keyboard input so the tooltip never gets in the way
        document.addEventListener("pointerdown", () => this.hide());
        document.addEventListener("keydown", () => this.hide());
        document.addEventListener("scroll", () => this.hide(), {
            capture: true,
            passive: true
        });
    }

    /**
     * Starts the show timer when the pointer enters an element with a tooltip.
     * @param event The pointer event.
     */
    private handlePointerOver(event: PointerEvent) {
        // Touch has no hover state, so tooltips would only flash on tap
        // Prevent that here
        if (event.pointerType === "touch") {
            return;
        }
        const target =
            event.target instanceof Element
                ? event.target.closest<HTMLElement>("[data-tooltip]")
                : null;
        if (target === this.target) {
            return;
        }
        this.hide();
        if (!target?.dataset.tooltip) {
            return;
        }
        this.target = target;
        this.showTimeout = window.setTimeout(
            () => this.show(target),
            TOOLTIP_DELAY_MS
        );
    }

    /**
     * Shows the tooltip immediately when an element with a tooltip gets keyboard focus.
     * @param event The focus event.
     */
    private handleFocusIn(event: FocusEvent) {
        if (!(event.target instanceof HTMLElement)) {
            return;
        }
        if (!event.target.matches(":focus-visible")) {
            return;
        }
        this.hide();
        if (!event.target.dataset.tooltip) {
            return;
        }
        this.target = event.target;
        this.show(event.target);
    }

    /**
     * Hides the tooltip when the pointer leaves the element that owns it.
     * @param event The pointer event.
     */
    private handlePointerOut(event: PointerEvent) {
        if (!this.target) {
            return;
        }
        if (
            event.relatedTarget instanceof Node &&
            this.target.contains(event.relatedTarget)
        ) {
            return;
        }
        this.hide();
    }

    /**
     * Displays the tooltip of the target, placed below it or above when there is no room.
     * @param target The element to show the tooltip for.
     */
    private show(target: HTMLElement) {
        if (!target.isConnected || !target.dataset.tooltip) {
            return;
        }
        this.element.textContent = target.dataset.tooltip;
        this.element.classList.add("visible");
        // Accessibility, woo!
        target.setAttribute("aria-describedby", this.element.id);

        const targetRect = target.getBoundingClientRect();
        const { width, height } = this.element.getBoundingClientRect();

        let top = targetRect.bottom + TOOLTIP_GAP;
        if (top + height > window.innerHeight) {
            top = targetRect.top - TOOLTIP_GAP - height;
        }
        const centeredLeft = targetRect.left + targetRect.width / 2 - width / 2;
        const left = Math.max(
            TOOLTIP_EDGE_MARGIN,
            Math.min(
                centeredLeft,
                window.innerWidth - width - TOOLTIP_EDGE_MARGIN
            )
        );

        this.element.style.top = `${Math.max(TOOLTIP_EDGE_MARGIN, top)}px`;
        this.element.style.left = `${left}px`;
    }

    private hide() {
        window.clearTimeout(this.showTimeout);
        this.target?.removeAttribute("aria-describedby");
        this.target = undefined;
        this.element.classList.remove("visible");
    }
}
