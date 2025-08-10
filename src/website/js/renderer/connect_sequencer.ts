import type { Renderer } from "./renderer.ts";

export function resetIndexes(this: Renderer) {
    if (!this.noteTimes) {
        return;
    }

    this.noteTimes.forEach((n) => (n.renderStartIndex = 0));
}
