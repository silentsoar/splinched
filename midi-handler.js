/**
 * midi-handler.js
 * Handles Web MIDI API connection and message parsing.
 */

class MidiHandler {
    constructor(onNoteOn, onNoteOff, onStatusChange) {
        this.onNoteOn = onNoteOn;
        this.onNoteOff = onNoteOff;
        this.onStatusChange = onStatusChange; // (isConnected)
        
        this.midiAccess = null;
        this.init();
    }

    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn("Web MIDI API not supported in this browser.");
            return;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.updateStatus();
            
            this.midiAccess.onstatechange = (e) => {
                this.updateStatus();
                if (e.port.state === 'connected') {
                    this.bindInputs();
                }
            };
            
            this.bindInputs();
        } catch (err) {
            console.warn("MIDI Access failed", err);
        }
    }

    updateStatus() {
        if (!this.midiAccess) return;
        const inputs = Array.from(this.midiAccess.inputs.values());
        const isConnected = inputs.length > 0;
        if (this.onStatusChange) this.onStatusChange(isConnected);
    }

    bindInputs() {
        const inputs = Array.from(this.midiAccess.inputs.values());
        inputs.forEach(input => {
            input.onmidimessage = (msg) => this.handleMessage(msg);
        });
    }

    handleMessage(message) {
        const command = message.data[0] >> 4;
        const channel = message.data[0] & 0xf;
        const note = message.data[1];
        const velocity = (message.data.length > 2) ? message.data[2] : 0;

        if (command === 9) { // Note On
            if (velocity > 0) {
                if (this.onNoteOn) this.onNoteOn(note, velocity);
            } else {
                if (this.onNoteOff) this.onNoteOff(note);
            }
        } else if (command === 8) { // Note Off
            if (this.onNoteOff) this.onNoteOff(note);
        }
    }
}
