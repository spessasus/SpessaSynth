import { MAX_NOTES, MIN_NOTE_HEIGHT_PX, NOTE_MARGIN, PRESSED_EFFECT_TIME, STROKE_THICKNESS } from "./renderer.js";

/**
 * @param renderImmediately {boolean}
 * @returns {NoteToRender[]}
 * @this {Renderer}
 */
export function computeNotePositions(renderImmediately = false)
{
    // math
    this.notesOnScreen = 0;
    
    const canvasWidth = this.sideways ? this.canvas.height : this.canvas.width;
    const canvasHeight = this.sideways ? this.canvas.width : this.canvas.height;
    const keysAmount = this.keyRange.max - this.keyRange.min;
    const keyStep = canvasWidth / (keysAmount + 1); // add one because it works
    const noteWidth = keyStep - (NOTE_MARGIN * 2);
    
    const fallingTime = this.noteFallingTimeMs / 1000;
    const afterTime = this.noteAfterTriggerTimeMs / 1000;
    
    const currentSeqTime = this.seq.currentHighResolutionTime - this.timeOffset;
    const currentStartTime = currentSeqTime - afterTime;
    const fallingTimeSeconds = fallingTime + afterTime;
    const currentEndTime = currentStartTime + fallingTimeSeconds;
    const minNoteHeight = MIN_NOTE_HEIGHT_PX / fallingTimeSeconds;
    /**
     * compute note pitch bend visual shift (for each channel)
     * @type {number[]}
     */
    const pitchBendXShift = [];
    this.synth.channelProperties.forEach(channel =>
    {
        // pitch range * (bend - 8192) / 8192)) * key width
        if (this.showVisualPitch)
        {
            const bend = channel.pitchBend - 8192 + this.visualPitchBendOffset; // -8192 to 8192
            const pixelShift = (channel.pitchBendRangeSemitones * ((bend / 8192))) * keyStep;
            pitchBendXShift.push(pixelShift);
        }
        else
        {
            pitchBendXShift.push(0);
        }
    });
    /**
     * @type {number[]}
     */
    const transposeNoteShifts = this.synth.channelProperties.map(c => this.showVisualPitch ? c.transposition : 0);
    /**
     * @type {NoteToRender[]}
     */
    const notesToDraw = [];
    this.noteTimes.forEach((channel, channelNumder) =>
    {
        
        if (channel.renderStartIndex >= channel.notes.length || !this.renderChannels[channelNumder])
        {
            return;
        }
        
        let noteIndex = channel.renderStartIndex;
        const notes = channel.notes;
        let note = notes[noteIndex];
        
        let firstNoteIndex = -1;
        // while the note start is in range
        while (note.start <= currentEndTime)
        {
            noteIndex++;
            // cap notes
            if (this.notesOnScreen > MAX_NOTES)
            {
                break;
            }
            
            const noteSum = note.start + note.length;
            
            // if the note is out of range, append the render start index
            if (noteSum > currentStartTime && note.length > 0)
            {
                let noteHeight = ((note.length / fallingTimeSeconds) * canvasHeight) - (NOTE_MARGIN * 2);
                
                // height less than that can be omitted (come on)
                if (this.notesOnScreen < 1000 || noteHeight > minNoteHeight)
                {
                    if (firstNoteIndex === -1)
                    {
                        firstNoteIndex = noteIndex - 1;
                    }
                    const position = (((note.start - currentStartTime) / fallingTimeSeconds) * canvasHeight);
                    let noteY;
                    if (this._notesFall)
                    {
                        noteY = canvasHeight - noteHeight - position + NOTE_MARGIN;
                    }
                    else
                    {
                        noteY = position + NOTE_MARGIN;
                    }
                    
                    // if the note out of range, skip
                    if (note.midiNote < this.keyRange.min || note.midiNote > this.keyRange.max)
                    {
                        if (noteIndex >= notes.length)
                        {
                            break;
                        }
                        note = notes[noteIndex];
                        continue;
                    }
                    const correctedNote = note.midiNote - this.keyRange.min + transposeNoteShifts[channelNumder];
                    let noteX = keyStep * correctedNote + NOTE_MARGIN;
                    
                    
                    let finalX, finalY, finalWidth, finalHeight;
                    if (this.sideways)
                    {
                        // add noinspection since we want to inverse positions
                        // noinspection JSSuspiciousNameCombination
                        finalX = noteY;
                        // noinspection JSSuspiciousNameCombination
                        finalY = noteX;
                        // noinspection JSSuspiciousNameCombination
                        finalHeight = noteWidth;
                        // noinspection JSSuspiciousNameCombination
                        finalWidth = noteHeight;
                    }
                    else
                    {
                        // sideways: swap x and y coords
                        finalY = noteY;
                        finalX = noteX;
                        finalWidth = noteWidth;
                        finalHeight = noteHeight;
                    }
                    
                    this.notesOnScreen++;
                    // draw the notes
                    if (renderImmediately)
                    {
                        // draw the notes right away, we don't care about the order
                        this.drawingContext.fillStyle = this.plainColors[channelNumder];
                        this.drawingContext.fillRect(
                            finalX + STROKE_THICKNESS + NOTE_MARGIN,
                            finalY + STROKE_THICKNESS,
                            finalWidth - (STROKE_THICKNESS * 2),
                            finalHeight - (STROKE_THICKNESS * 2)
                        );
                    }
                    else
                    {
                        let color;
                        // save the notes to draw
                        // determine if notes are active or not (i.e., currently playing)
                        // not active notes
                        if ((note.start > currentSeqTime || noteSum < currentSeqTime))
                        {
                            // this note is not pressed
                            if (this.sideways)
                            {
                                if (this.drawActiveNotes)
                                {
                                    color = this.sidewaysDarkerColors[channelNumder];
                                }
                                else
                                {
                                    color = this.sidewaysChannelColors[channelNumder];
                                }
                            }
                            else if (this.drawActiveNotes)
                            {
                                color = this.darkerColors[channelNumder];
                            }
                            else
                            {
                                color = this.channelColors[channelNumder];
                            }
                            notesToDraw.push({
                                xPos: finalX,
                                yPos: finalY,
                                height: finalHeight,
                                width: finalWidth,
                                stroke: STROKE_THICKNESS,
                                pressedProgress: 0, // not pressed
                                velocity: note.velocity, // VELOCITY IS MAPPED FROM 0 TO 1!
                                // if we ignore drawing active notes, draw those with regular colors
                                color: color
                            });
                        }
                        else
                        {
                            // this note is pressed
                            if (this.sideways)
                            {
                                if (this.showVisualPitch)
                                {
                                    finalY += pitchBendXShift[channelNumder];
                                }
                                color = this.sidewaysChannelColors[channelNumder];
                            }
                            else
                            {
                                if (this.showVisualPitch)
                                {
                                    finalX += pitchBendXShift[channelNumder];
                                }
                                color = this.channelColors[channelNumder];
                            }
                            // determine for how long the note has been pressed
                            let noteProgress;
                            if (this.drawActiveNotes)
                            {
                                noteProgress = 1 + (note.start - currentSeqTime) / (note.length * PRESSED_EFFECT_TIME);
                            }
                            else
                            {
                                noteProgress = 0;
                            }
                            // active notes
                            notesToDraw.push({
                                xPos: finalX,
                                yPos: finalY,
                                height: finalHeight,
                                width: finalWidth,
                                stroke: STROKE_THICKNESS,
                                pressedProgress: noteProgress,
                                velocity: note.velocity,
                                color: color
                            });
                        }
                    }
                }
            }
            
            if (noteIndex >= notes.length)
            {
                break;
            }
            
            note = notes[noteIndex];
        }
        if (firstNoteIndex > -1)
        {
            channel.renderStartIndex = firstNoteIndex;
        }
    });
    // sort the notes from shortest to longest (draw order)
    notesToDraw.sort((n1, n2) => n2.height - n1.height);
    return notesToDraw;
}