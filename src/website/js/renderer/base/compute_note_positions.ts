import {
    BaseRenderer,
    MAX_NOTES,
    MIN_NOTE_HEIGHT_PX,
    NOTE_MARGIN,
    type NoteToRender,
    PRESSED_EFFECT_TIME,
    STROKE_THICKNESS
} from "./renderer.js";

export function computeNotePositions(
    this: BaseRenderer,
    currentTime: number
): NoteToRender[] {
    if (!this.noteTimes) {
        throw new Error("No note times!");
    }
    // Math
    this.notesOnScreen = 0;

    const canvasWidth = this.vertical ? this.height : this.width;
    const canvasHeight = this.vertical ? this.width : this.height;
    const keyRange = this._keyRange;
    const { widthOffset, xOffset } = this;
    const keysAmount = keyRange.max - keyRange.min;
    const keyStep = (canvasWidth + widthOffset) / (keysAmount + 1);
    const noteWidth = keyStep - NOTE_MARGIN * 2;

    const fallingTime = this.noteFallingTime / 1000;
    const afterTime = this.noteAfterTriggerTime / 1000;

    const currentSeqTime = currentTime - this.timeOffset;
    const currentStartTime = currentSeqTime - afterTime;
    const fallingTimeSeconds = fallingTime + afterTime;
    const currentEndTime = currentStartTime + fallingTimeSeconds;
    const minNoteHeight = MIN_NOTE_HEIGHT_PX / fallingTimeSeconds;

    // Compute note pitch bend visual shift (for each channel)
    // These only apply to the active notes

    const pitchBendXShift: number[] = [];
    for (const { visualPitchTranspose } of this.parts) {
        // Pitch range * ((bend - 8192) / 8192) * key width
        if (this.showVisualPitch) {
            pitchBendXShift.push(visualPitchTranspose * keyStep);
        } else {
            pitchBendXShift.push(0);
        }
    }

    const notesToDraw = new Array<NoteToRender>();
    for (const [channelNumber, channel] of this.noteTimes.entries()) {
        const part = this.parts[channelNumber];
        if (channel.renderStartIndex >= channel.notes.length || !part.render) {
            continue;
        }

        let noteIndex = channel.renderStartIndex;
        const notes = channel.notes;
        let note = notes[noteIndex];

        let firstNoteIndex = -1;
        // While the note start is in range
        while (note.start <= currentEndTime) {
            noteIndex++;
            // Cap notes
            if (this.notesOnScreen > MAX_NOTES) {
                break;
            }

            const noteSum = note.start + note.length;

            // If the note is out of range, append the render start index
            if (noteSum > currentStartTime && note.length > 0) {
                const noteHeight =
                    (note.length / fallingTimeSeconds) * canvasHeight -
                    NOTE_MARGIN * 2;

                // Height less than that can be omitted (come on)
                if (this.notesOnScreen < 1000 || noteHeight > minNoteHeight) {
                    if (firstNoteIndex === -1) {
                        firstNoteIndex = noteIndex - 1;
                    }
                    const position =
                        ((note.start - currentStartTime) / fallingTimeSeconds) *
                        canvasHeight;
                    const noteY = this.notesFall
                        ? canvasHeight - noteHeight - position + NOTE_MARGIN
                        : position + NOTE_MARGIN;

                    const transposedNote =
                        note.midiNote +
                        part.transpose +
                        (part.isDrum ? 0 : this.transpose);
                    // If the note out of range, skip
                    if (
                        transposedNote < keyRange.min ||
                        transposedNote > keyRange.max
                    ) {
                        if (noteIndex >= notes.length) {
                            break;
                        }
                        note = notes[noteIndex];
                        continue;
                    }
                    const correctedNote = transposedNote - keyRange.min;
                    const noteX =
                        keyStep * correctedNote + xOffset + NOTE_MARGIN;

                    let finalX, finalY, finalWidth, finalHeight;
                    if (this.vertical) {
                        // Add noinspection since we want to inverse positions
                        // noinspection JSSuspiciousNameCombination
                        finalX = noteY;
                        // noinspection JSSuspiciousNameCombination
                        finalY = noteX;
                        // noinspection JSSuspiciousNameCombination
                        finalHeight = noteWidth;
                        // noinspection JSSuspiciousNameCombination
                        finalWidth = noteHeight;
                    } else {
                        // Sideways: swap x and y coords
                        finalY = noteY;
                        finalX = noteX;
                        finalWidth = noteWidth;
                        finalHeight = noteHeight;
                    }

                    this.notesOnScreen++;
                    const channelColor = this.colors[channelNumber];
                    // Draw the notes
                    if (this.highPerformanceMode) {
                        // Draw the notes right away, we don't care about the order
                        this.ctx.fillStyle = channelColor.plain;
                        this.ctx.fillRect(
                            finalX + STROKE_THICKNESS + NOTE_MARGIN,
                            finalY + STROKE_THICKNESS,
                            finalWidth - STROKE_THICKNESS * 2,
                            finalHeight - STROKE_THICKNESS * 2
                        );
                    } else {
                        let color;
                        // Save the notes to draw
                        // Determine if notes are active or not (i.e., currently playing)
                        // Not active notes
                        if (
                            note.start > currentSeqTime ||
                            noteSum < currentSeqTime
                        ) {
                            // This note is not pressed
                            if (this.vertical) {
                                color = this.drawActiveNotes
                                    ? channelColor.sidewaysDarker
                                    : channelColor.sideways;
                            } else if (this.drawActiveNotes) {
                                color = channelColor.darker;
                            } else {
                                color = channelColor.primary;
                            }
                            notesToDraw.push({
                                xPos: finalX,
                                yPos: finalY,
                                height: finalHeight,
                                width: finalWidth,
                                stroke: STROKE_THICKNESS,
                                pressedProgress: 0, // Not pressed
                                velocity: note.velocity / 127,
                                // If we ignore drawing active notes, draw those with regular colors
                                color: color
                            });
                        } else {
                            // This note is pressed
                            if (this.vertical) {
                                if (this.showVisualPitch) {
                                    finalY += pitchBendXShift[channelNumber];
                                }
                                color = channelColor.sideways;
                            } else {
                                if (this.showVisualPitch) {
                                    finalX += pitchBendXShift[channelNumber];
                                }
                                color = channelColor.primary;
                            }
                            // Determine for how long the note has been pressed
                            const noteProgress = this.drawActiveNotes
                                ? 1 +
                                  (note.start - currentSeqTime) /
                                      (note.length * PRESSED_EFFECT_TIME)
                                : 0;
                            // Active notes
                            notesToDraw.push({
                                xPos: finalX,
                                yPos: finalY,
                                height: finalHeight,
                                width: finalWidth,
                                stroke: STROKE_THICKNESS,
                                pressedProgress: noteProgress,
                                velocity: note.velocity / 127,
                                color: color
                            });
                        }
                    }
                }
            }

            if (noteIndex >= notes.length) {
                break;
            }

            note = notes[noteIndex];
        }
        if (firstNoteIndex > -1) {
            channel.renderStartIndex = firstNoteIndex;
        }
    }
    // Sort the notes from longest to shortest (draw order)
    // The note length is the width in vertical mode
    notesToDraw.sort((n1, n2) =>
        this.vertical ? n2.width - n1.width : n2.height - n1.height
    );
    return notesToDraw;
}
