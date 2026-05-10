/**
 * midi-exporter.js
 * A simple utility to generate Standard MIDI Files (SMF) from sequencer patterns.
 */

class MidiExporter {
    static generateMidiBlob(pattern, bpm, slices) {
        if (!pattern || !pattern.steps) return null;

        const ticksPerBeat = 480; // Standard ticks per quarter note
        const ticksPerStep = ticksPerBeat / 4; // 16th notes
        
        // MIDI File Header (MThd)
        // Type 0 (Single track), 1 track, ticksPerBeat resolution
        const header = [
            0x4D, 0x54, 0x68, 0x64, // "MThd"
            0x00, 0x00, 0x00, 0x06, // Header length
            0x00, 0x00,             // Format 0
            0x00, 0x01,             // 1 track
            (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
        ];

        let trackEvents = [];
        
        // Set Tempo (Meta Event 0x51)
        // 60,000,000 / BPM = microseconds per quarter note
        const tempo = Math.round(60000000 / bpm);
        trackEvents.push(0x00, 0xFF, 0x51, 0x03, 
            (tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF);

        let lastTick = 0;

        // Process steps
        pattern.steps.forEach((step, i) => {
            if (step.active) {
                const sliceId = (step.sliceId !== undefined) ? step.sliceId : i;
                const slice = slices[sliceId % slices.length];
                
                // Determine MIDI note
                let midiNote = 60; // Default C3
                if (slice && slice.pitch && slice.pitch.midi > 0) {
                    midiNote = slice.pitch.midi;
                    if (step.melodicOffset !== undefined) {
                        midiNote += step.melodicOffset;
                    }
                }

                const startTick = i * ticksPerStep;
                const endTick = startTick + (ticksPerStep * 0.8); // 80% gate length

                // Note On
                this._addEvent(trackEvents, startTick - lastTick, 0x90, midiNote, 100);
                lastTick = startTick;

                // Note Off
                this._addEvent(trackEvents, endTick - lastTick, 0x80, midiNote, 0);
                lastTick = endTick;
            }
        });

        // End of Track (Meta Event 0x2F)
        trackEvents.push(0x00, 0xFF, 0x2F, 0x00);

        // MIDI Track (MTrk)
        const trackHeader = [
            0x4D, 0x54, 0x72, 0x6B, // "MTrk"
            (trackEvents.length >> 24) & 0xFF,
            (trackEvents.length >> 16) & 0xFF,
            (trackEvents.length >> 8) & 0xFF,
            trackEvents.length & 0xFF
        ];

        const fullMidi = new Uint8Array([...header, ...trackHeader, ...trackEvents]);
        return new Blob([fullMidi], { type: 'audio/midi' });
    }

    static generateChordsMidiBlob(pattern, bpm, rootNote, mode, validScaleNotes) {
        if (!pattern || !validScaleNotes || validScaleNotes.length < 7) return null;

        const ticksPerBeat = 480;
        const totalSteps = pattern.length || 32;
        const beatsPerChord = 4; // 1 chord per bar (16 steps)
        const ticksPerStep = ticksPerBeat / 4;
        const ticksPerChord = ticksPerBeat * beatsPerChord;

        // MIDI File Header (Type 0)
        const header = [
            0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01,
            (ticksPerBeat >> 8) & 0xFF, ticksPerBeat & 0xFF
        ];

        let trackEvents = [];
        const tempo = Math.round(60000000 / bpm);
        trackEvents.push(0x00, 0xFF, 0x51, 0x03, (tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF);

        // Identify Algorithm Type for Progression
        const algoName = (pattern.name || "").split(' ')[0];
        let progression = [0, 4, 5, 3]; // Default: I - V - vi - IV
        
        const atmospheric = ['Brownian', 'Phasing', 'Pendulum', 'Mirror'];
        const rhythmic = ['Euclidean', 'Harmonic', 'Motif', 'Anchor'];
        const complex = ['Markov', 'Intervallic', 'Fibonacci', 'Cellular'];
        
        if (atmospheric.includes(algoName)) progression = [0, 3, 5, 4]; // I - IV - vi - V
        if (complex.includes(algoName)) progression = [0, 1, 4, 5]; // I - ii - V - vi
        if (mode === 'aeolian' || mode === 'phrygian') progression = [0, 5, 6, 4]; // i - bVI - bVII - v
        
        const numChords = Math.ceil(totalSteps / 16);
        let lastTick = 0;

        for (let i = 0; i < numChords; i++) {
            const degree = progression[i % progression.length];
            // Triad notes from the scale (transposed up 2 octaves)
            const root = validScaleNotes[degree + 7] + 24; 
            const third = validScaleNotes[degree + 2 + 7] + 24;
            const fifth = validScaleNotes[degree + 4 + 7] + 24;
            const notes = [root, third, fifth];

            const startTick = i * ticksPerChord;
            const duration = ticksPerChord * 0.95; // Sustained with small gap
            const endTick = startTick + duration;

            // Note Ons (all at the same delta time)
            notes.forEach((note, idx) => {
                const dt = (idx === 0) ? (startTick - lastTick) : 0;
                this._addEvent(trackEvents, dt, 0x90, note, 80);
                if (idx === 0) lastTick = startTick;
            });

            // Note Offs
            notes.forEach((note, idx) => {
                const dt = (idx === 0) ? (endTick - lastTick) : 0;
                this._addEvent(trackEvents, dt, 0x80, note, 0);
                if (idx === 0) lastTick = endTick;
            });
        }

        trackEvents.push(0x00, 0xFF, 0x2F, 0x00);

        const trackHeader = [
            0x4D, 0x54, 0x72, 0x6B,
            (trackEvents.length >> 24) & 0xFF, (trackEvents.length >> 16) & 0xFF,
            (trackEvents.length >> 8) & 0xFF, trackEvents.length & 0xFF
        ];

        return new Blob([new Uint8Array([...header, ...trackHeader, ...trackEvents])], { type: 'audio/midi' });
    }

    static _addEvent(events, deltaTime, status, data1, data2) {
        // Variable-length quantity for delta time
        const buffer = [];
        let v = deltaTime;
        buffer.push(v & 0x7F);
        while (v >>= 7) buffer.push((v & 0x7F) | 0x80);
        events.push(...buffer.reverse());
        
        events.push(status, data1, data2);
    }
}
