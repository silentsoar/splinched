/**
 * app.js
 * Main UI logic and event bindings for Sample Chopper V4.
 */

const engine = new AudioEngine();

const GENRE_BPMS = {
    'Harmonic': 75, 'Brownian': 95, 'Markov': 80, 'Stochastic': 125,
    'Mirror': 113, 'Pedal': 45, 'Bitwise': 145, 'Intervallic': 130,
    'Euclidean': 100, 'Cellular': 55, 'Fibonacci': 120, 'Anchor': 65,
    'Acid': 117, 'Phasing': 105, 'Motif': 103, 'Pendulum': 70,
    'Drill': 125, 'Dubstep': 125, 'Trance': 123, 'House': 109,
    'Vapor': 75, 'Synthwave': 95, 'Garage': 115, 'Samba': 90,
    'Industrial': 135, 'Trap': 125, 'Folk': 95, 'Disco': 105,
    'Grime': 125, 'Neo-Soul': 75, 'Classical': 85, 'Neuro': 157,
    'Bossa Nova': 105, 'Cumbia': 81, 'Dancehall': 85, 'Flamenco': 115,
    'Polyrhythmic': 105, 'Rumba': 97, 'Bhangra': 90, 'Footwork': 145,
    'Drum & Bass': 159, 'Jungle': 150, 'Breakbeat': 115, 'Future Bass': 135,
    'Hardstyle': 135, 'IDM': 110, 'Psytrance': 127, 'Slap House': 109,
    'Cinematic': 75, 'Dungeon Synth': 65, 'Electroacoustic': 85, 'Generative Drone': 45,
    'Krautrock': 111, 'Post-Rock': 115, 'Shoegaze': 95, 'Spectral': 70,
    'Hyperpop': 135, 'Jersey Club': 120, 'Phonk': 105, 'R&B': 60,
    'Synth-Pop': 103, 'UK Drill': 127, 'UK Funky': 115, 'Witch House': 100
};

// DOM Elements
const workspace = document.getElementById('workspace');
const waveformArea = document.getElementById('waveform-area');
const uploadOverlay = document.getElementById('upload-overlay');
const audioUploadInput = document.getElementById('audio-upload');
const canvas = document.getElementById('waveform-canvas');
const canvasContainer = document.getElementById('canvas-container');
const ctx = canvas.getContext('2d');

const btnRecord = document.getElementById('btn-record');
const btnStopRecord = document.getElementById('btn-stop-record');
const recordingOverlay = document.getElementById('recording-overlay');
const recordingTime = document.getElementById('recording-time');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingTitle = document.getElementById('loading-title');
const loadingSubtitle = document.getElementById('loading-subtitle');
const loadingBar = document.getElementById('loading-bar');
const loadingTime = document.getElementById('loading-time');
const loadingPercentage = document.getElementById('loading-percentage');

const padsContainer = document.getElementById('pads-container');
const btnTogglePlayAll = document.getElementById('btn-toggle-play-all');

const algoSelect = document.getElementById('algorithm-select');
const targetSlicesSelect = document.getElementById('target-slices');
const keySelect = document.getElementById('key-select');
const modeSelect = document.getElementById('mode-select');
const octaveSelect = document.getElementById('octave-select');
const globalChokeCheckbox = document.getElementById('global-choke');

const adsrA = document.getElementById('adsr-a');
const adsrD = document.getElementById('adsr-d');
const adsrS = document.getElementById('adsr-s');
const adsrR = document.getElementById('adsr-r');
const valA = document.getElementById('val-a');
const valD = document.getElementById('val-d');
const valS = document.getElementById('val-s');
const valR = document.getElementById('val-r');

const patternSelect = document.getElementById('pattern-select');
const bpmInput = document.getElementById('seq-bpm');
const seqDensity = document.getElementById('seq-density');
const seqSyncopation = document.getElementById('seq-syncopation');
const seqSwing = document.getElementById('seq-swing');
const seqNoteRepeat = document.getElementById('seq-note-repeat');
const seqMicroTiming = document.getElementById('seq-micro-timing');
const seqProbability = document.getElementById('seq-probability');
const kickDrum = document.getElementById('kick-drum');
const valDensity = document.getElementById('val-density');
const valSyncopation = document.getElementById('val-syncopation');
const valSwing = document.getElementById('val-swing');
const valNoteRepeat = document.getElementById('val-note-repeat');
const valMicroTiming = document.getElementById('val-micro-timing');
const valProbability = document.getElementById('val-probability');
const adsrDeviationSlider = document.getElementById('adsr-deviation');
const valAdsrDeviation = document.getElementById('val-adsr-deviation');

const ALGO_TIMBRES = {
    'Brownian': 'electric-piano', 'Intervallic': 'glockenspiel', 'Euclidean': 'pure-sine',
    'Harmonic': 'hollow-bell', 'Markov': 'sub-bass', 'Stochastic': 'chiptune-pulse',
    'Mirror': 'square-lead', 'Pedal': 'organ-drawbar', 'Bitwise': 'chiptune-pulse',
    'Cellular': 'ghostly-pad', 'Fibonacci': 'glockenspiel', 'Anchor': 'organ-drawbar',
    'Acid': 'acid-synth', 'Phasing': 'pure-sine', 'Motif': 'pure-sine', 'Pendulum': 'muted-brass',
    'Drill': 'sub-bass', 'Dubstep': 'detuned-supersaw', 'Trance': 'detuned-supersaw', 'House': 'square-lead',
    'Vapor': 'ghostly-pad', 'Synthwave': 'analog-saw', 'Garage': 'square-lead', 'Samba': 'triangle-flute',
    'Industrial': 'acid-synth', 'Trap': 'fm-pluck', 'Folk': 'plucked-string', 'Disco': 'electric-piano',
    'Grime': 'square-lead', 'Neo-Soul': 'electric-piano', 'Classical': 'plucked-string', 'Neuro': 'detuned-supersaw',
    'Bossa Nova': 'electric-piano', 'Cumbia': 'triangle-flute', 'Dancehall': 'sub-bass', 'Flamenco': 'plucked-string',
    'Polyrhythmic': 'triangle-flute', 'Rumba': 'pure-sine', 'Bhangra': 'triangle-flute', 'Footwork': 'chiptune-pulse',
    'Drum & Bass': 'sub-bass', 'Jungle': 'sub-bass', 'Breakbeat': 'analog-saw', 'Future Bass': 'detuned-supersaw',
    'Hardstyle': 'detuned-supersaw', 'IDM': 'chiptune-pulse', 'Psytrance': 'analog-saw', 'Slap House': 'fm-pluck',
    'Cinematic': 'ghostly-pad', 'Dungeon Synth': 'ghostly-pad', 'Electroacoustic': 'glockenspiel', 'Generative Drone': 'ghostly-pad',
    'Krautrock': 'analog-saw', 'Post-Rock': 'plucked-string', 'Shoegaze': 'detuned-supersaw', 'Spectral': 'hollow-bell',
    'Hyperpop': 'chiptune-pulse', 'Jersey Club': 'fm-pluck', 'Phonk': 'muted-brass', 'R&B': 'electric-piano',
    'Synth-Pop': 'analog-saw', 'UK Drill': 'sub-bass', 'UK Funky': 'square-lead', 'Witch House': 'ghostly-pad'
};

const timbreSelect = document.getElementById('seq-timbre');
const btnAutoTimbre = document.getElementById('btn-auto-timbre');
let autoTimbreEnabled = true;

const algoButtons = {
    'Brownian': document.getElementById('btn-algo-brownian'),
    'Intervallic': document.getElementById('btn-algo-intervallic'),
    'Euclidean': document.getElementById('btn-algo-euclidean'),
    'Harmonic': document.getElementById('btn-algo-harmonic'),
    'Markov': document.getElementById('btn-algo-markov'),
    'Stochastic': document.getElementById('btn-algo-stochastic'),
    'Mirror': document.getElementById('btn-algo-mirror'),
    'Pedal': document.getElementById('btn-algo-pedal'),
    'Bitwise': document.getElementById('btn-algo-bitwise'),
    'Cellular': document.getElementById('btn-algo-cellular'),
    'Fibonacci': document.getElementById('btn-algo-fibonacci'),
    'Anchor': document.getElementById('btn-algo-anchor'),
    'Acid': document.getElementById('btn-algo-acid'),
    'Phasing': document.getElementById('btn-algo-phasing'),
    'Motif': document.getElementById('btn-algo-motif'),
    'Pendulum': document.getElementById('btn-algo-pedalum'),
    'Drill': document.getElementById('btn-algo-drill'),
    'Dubstep': document.getElementById('btn-algo-dubstep'),
    'Trance': document.getElementById('btn-algo-trance'),
    'House': document.getElementById('btn-algo-house'),
    'Vapor': document.getElementById('btn-algo-vapor'),
    'Synthwave': document.getElementById('btn-algo-synthwave'),
    'Garage': document.getElementById('btn-algo-garage'),
    'Samba': document.getElementById('btn-algo-samba'),
    'Industrial': document.getElementById('btn-algo-industrial'),
    'Trap': document.getElementById('btn-algo-trap'),
    'Folk': document.getElementById('btn-algo-folk'),
    'Disco': document.getElementById('btn-algo-disco'),
    'Grime': document.getElementById('btn-algo-grime'),
    'Neo-Soul': document.getElementById('btn-algo-neosoul'),
    'Classical': document.getElementById('btn-algo-classical'),
    'Neuro': document.getElementById('btn-algo-neuro'),
    'Bossa Nova': document.getElementById('btn-algo-bossanova'),
    'Cumbia': document.getElementById('btn-algo-cumbia'),
    'Dancehall': document.getElementById('btn-algo-dancehall'),
    'Flamenco': document.getElementById('btn-algo-flamenco'),
    'Polyrhythmic': document.getElementById('btn-algo-polyrhythmic'),
    'Rumba': document.getElementById('btn-algo-rumba'),
    'Bhangra': document.getElementById('btn-algo-bhangra'),
    'Footwork': document.getElementById('btn-algo-footwork'),
    'Drum & Bass': document.getElementById('btn-algo-dnb'),
    'Jungle': document.getElementById('btn-algo-jungle'),
    'Breakbeat': document.getElementById('btn-algo-breakbeat'),
    'Future Bass': document.getElementById('btn-algo-futurebass'),
    'Hardstyle': document.getElementById('btn-algo-hardstyle'),
    'IDM': document.getElementById('btn-algo-idm'),
    'Psytrance': document.getElementById('btn-algo-psytrance'),
    'Slap House': document.getElementById('btn-algo-slaphouse'),
    'Cinematic': document.getElementById('btn-algo-cinematic'),
    'Dungeon Synth': document.getElementById('btn-algo-dungeonsynth'),
    'Electroacoustic': document.getElementById('btn-algo-electroacoustic'),
    'Generative Drone': document.getElementById('btn-algo-generativedrone'),
    'Krautrock': document.getElementById('btn-algo-krautrock'),
    'Post-Rock': document.getElementById('btn-algo-postrock'),
    'Shoegaze': document.getElementById('btn-algo-shoegaze'),
    'Spectral': document.getElementById('btn-algo-spectral'),
    'Hyperpop': document.getElementById('btn-algo-hyperpop'),
    'Jersey Club': document.getElementById('btn-algo-jerseyclub'),
    'Phonk': document.getElementById('btn-algo-phonk'),
    'R&B': document.getElementById('btn-algo-rnb'),
    'Synth-Pop': document.getElementById('btn-algo-synthpop'),
    'UK Drill': document.getElementById('btn-algo-ukdrill'),
    'UK Funky': document.getElementById('btn-algo-ukfunky'),
    'Witch House': document.getElementById('btn-algo-witchhouse')
};


const kickLevel = document.getElementById('kick-level');
const valKick = document.getElementById('val-kick');

const btnToggleSeq = document.getElementById('btn-toggle-seq');
const seqGrid = document.getElementById('seq-grid');

const btnExportWet = document.getElementById('btn-export-wet');
const btnExportDry = document.getElementById('btn-export-dry');
const btnExportMidi = document.getElementById('btn-export-midi');
const btnExportMidiChords = document.getElementById('btn-export-midi-chords');
const btnExportMidiDrumGlobal = document.getElementById('btn-export-midi-drum');
const filenameDisplay = document.getElementById('filename-display');
const midiStatus = document.getElementById('midi-status');
const autoKeyDisplay = document.getElementById('auto-key-display');
const detectedKeyValue = document.getElementById('detected-key-value');

const fxStrip = document.getElementById('effects-strip');
const btnFxToggle = document.getElementById('btn-fx-toggle');
const fxReverb = document.getElementById('fx-reverb');
const fxDelay = document.getElementById('fx-delay');
const fxDistort = document.getElementById('fx-distort');
const fxSmartComp = document.getElementById('fx-smart-comp');
const fxEqLow = document.getElementById('fx-eq-low');
const fxEqMid = document.getElementById('fx-eq-mid');
const fxEqHigh = document.getElementById('fx-eq-high');

const valReverb = document.getElementById('val-reverb');
const valDelay = document.getElementById('val-delay');
const valDistort = document.getElementById('val-distort');
const valEqLow = document.getElementById('val-eq-low');
const valEqMid = document.getElementById('val-eq-mid');
const valEqHigh = document.getElementById('val-eq-high');
const adsrCanvas = document.getElementById('adsr-visualizer');
const adsrCtx = adsrCanvas ? adsrCanvas.getContext('2d') : null;
const sampleLevelSlider = document.getElementById('seq-sample-level');
const valSampleLevel = document.getElementById('val-sample-level');
const toneLevelSlider = document.getElementById('seq-tone-level');
const valToneLevel = document.getElementById('val-tone-level');
const chordsCheck = document.getElementById('seq-tone-chords');
const moreLongNotesCheck = document.getElementById('seq-more-long-notes');
const contrastCheck = document.getElementById('seq-contrast');
const tuneCheck = document.getElementById('seq-tune');
const partToggle = document.getElementById('seq-part-toggle');
const labelChorus = document.getElementById('label-chorus');
const labelVerse = document.getElementById('label-verse');
const seqSliceAssignToggle = document.getElementById('seq-slice-assign-toggle');
const labelFit = document.getElementById('label-fit');
const labelSeq = document.getElementById('label-seq');
const seqModeToggle = document.getElementById('seq-mode-toggle');
const labelModeMel = document.getElementById('label-mode-mel');
const labelModeDrum = document.getElementById('label-mode-drum');
const autoBpmBtn = document.getElementById('btn-auto-bpm');
const algoLenSelect = document.getElementById('algo-len');
const seqMeterSelect = document.getElementById('seq-meter');
const drumPaginationWrapper = document.getElementById('drum-pagination-wrapper');
const btnDrumPrev = document.getElementById('btn-drum-prev');
const btnDrumNext = document.getElementById('btn-drum-next');
const labelDrumPage = document.getElementById('label-drum-page');
let currentDrumPage = 0;

// Keyboard shortcut map
const KEYS = [
    'Q','W','E','R','T','Y','U','I','O','P',
    'A','S','D','F','G','H','J','K','L',';',
    'Z','X','C','V','B','N','M',',','.','/'
];

// State
let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];
let autoBpmEnabled = true;
let recordTimer = null;
let recordStartTime = 0;

let keyMap = {}; // key -> padId
let selectedPadId = 0; // for chromatic playback

let isDraggingGrid = false;
let gridDragToggleState = false;

document.addEventListener('mouseup', () => {
    if (isDraggingGrid) {
        isDraggingGrid = false;
        const patId = patternSelect.value;
        const pattern = SequencerPatterns.find(p => p.id == patId);
        if (pattern && pattern.isCustom) {
            saveCustomPatterns();
        }
    }
});

// Mapping helpers for Logarithmic Taper (Quadratic for audio-like feel)
function toLog(linearVal, maxVal = 1000) {
    if (linearVal <= 0) return 0;
    const normalized = linearVal / 100;
    return Math.round(Math.pow(normalized, 2) * maxVal);
}

function fromLog(logVal, maxVal = 1000) {
    if (logVal <= 0) return 0;
    const normalized = Math.sqrt(logVal / maxVal);
    return Math.round(normalized * 100);
}

// Percent specific log mapping (0.0 to 1.0)
function toLogPercent(linearVal) {
    const normalized = linearVal / 100;
    return Math.pow(normalized, 2);
}

function fromLogPercent(logVal) {
    const normalized = Math.sqrt(logVal);
    return Math.round(normalized * 100);
}

const SLIDER_DEFAULTS = {
    'adsr-a': fromLog(20),
    'adsr-d': fromLog(150),
    'adsr-s': fromLog(0),
    'adsr-r': fromLog(80),
    'seq-density': fromLogPercent(0.5),
    'seq-syncopation': fromLogPercent(0.15),
    'seq-note-repeat': fromLogPercent(0.15),
    'seq-micro-timing': 0,
    'seq-probability': 100,
    'seq-swing': 0,
    'kick-level': fromLogPercent(0.15),
    'seq-sample-level': fromLogPercent(1.0),
    'seq-tone-level': fromLogPercent(0.04),
    'adsr-deviation': 50
};

function updateSliderUI(slider) {
    if (!slider) return;
    const id = slider.id;
    const def = SLIDER_DEFAULTS[id];
    if (def === undefined) return;

    let val = parseInt(slider.value);
    
    // Snapping
    const snapThreshold = 3;
    if (Math.abs(val - def) <= snapThreshold) {
        val = def;
        slider.value = val;
    }

    // Class for grey-out
    if (val === def) {
        slider.classList.add('is-default');
    } else {
        slider.classList.remove('is-default');
    }

    // Background gradient for deviation line
    const min = Math.min(val, def);
    const max = Math.max(val, def);
    
    // Determine accent color based on section
    let accent = 'var(--accent-primary)';
    if (id.startsWith('seq-')) accent = 'var(--accent-secondary)';
    if (id === 'kick-level') accent = 'var(--accent-danger)';

    const trackBase = 'rgba(255, 255, 255, 0.05)';
    slider.style.setProperty('--track-bg', `linear-gradient(to right, ${trackBase} ${min}%, ${accent} ${min}%, ${accent} ${max}%, ${trackBase} ${max}%)`);
}

function drawAdsrCurve() {
    if (!adsrCtx) return;
    const w = adsrCanvas.width = adsrCanvas.clientWidth;
    const h = adsrCanvas.height = adsrCanvas.clientHeight;
    if (w === 0 || h === 0) return; // Still hidden
    
    adsrCtx.clearRect(0, 0, w, h);

    const msA = toLog(parseInt(adsrA.value));
    const msD = toLog(parseInt(adsrD.value));
    const msS = toLog(parseInt(adsrS.value)); // interpreted as level 0-1000
    const msR = toLog(parseInt(adsrR.value));

    // Normalize timings for visualization (total width = A + D + Hold + R)
    // We'll give S (Sustain) a fixed visual width of 100ms for the horizontal line
    const visualHold = 100; 
    const totalMs = msA + msD + visualHold + msR || 1;

    const xA = (msA / totalMs) * w;
    const xD = (msD / totalMs) * w;
    const xS = (visualHold / totalMs) * w;
    const xR = (msR / totalMs) * w;

    const sustainLevel = msS / 1000; // 0 to 1

    adsrCtx.beginPath();
    adsrCtx.moveTo(0, h);
    
    // Attack
    adsrCtx.lineTo(xA, 5);
    
    // Decay
    adsrCtx.lineTo(xA + xD, h - (sustainLevel * (h - 10)) - 5);
    
    // Sustain
    adsrCtx.lineTo(xA + xD + xS, h - (sustainLevel * (h - 10)) - 5);
    
    // Release
    adsrCtx.lineTo(xA + xD + xS + xR, h);

    // Styling
    const grad = adsrCtx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0, 243, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 243, 255, 0.05)');
    
    adsrCtx.fillStyle = grad;
    adsrCtx.fill();

    adsrCtx.strokeStyle = '#00f3ff';
    adsrCtx.lineWidth = 2;
    adsrCtx.lineJoin = 'round';
    adsrCtx.stroke();

    // Display Total Duration
    const totalDurationMs = msA + msD + msR;
    adsrCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    adsrCtx.font = 'bold 10px Inter, system-ui, sans-serif';
    adsrCtx.textAlign = 'right';
    adsrCtx.fillText(`${totalDurationMs}ms Total`, w - 10, 15);
}

// --- Playhead Animation ---
const playheadEl = document.getElementById('playhead');
let playheadAnimId = null;

function animatePlayhead(startTime, duration, offset = 0, rate = 1.0) {
    if (!engine.buffer || !playheadEl) return;
    playheadEl.style.display = 'block';
    const totalDur = engine.buffer.duration;
    
    function anim() {
        const now = engine.ctx.currentTime;
        const elapsed = (now - startTime) * rate;
        const currentBufferTime = offset + elapsed;
        
        if (currentBufferTime >= offset + duration || currentBufferTime >= totalDur) {
            playheadEl.style.display = 'none';
            playheadAnimId = null;
            updatePlayIcons();
            return;
        }
        
        const percent = currentBufferTime / totalDur;
        playheadEl.style.left = `${percent * 100}%`;
        playheadAnimId = requestAnimationFrame(anim);
    }
    
    if (playheadAnimId) cancelAnimationFrame(playheadAnimId);
    anim();
}

function updatePlayIcons() {
    if (btnTogglePlayAll) {
        const icon = btnTogglePlayAll.querySelector('i');
        if (mainPlaybackSource) {
            icon.className = 'fas fa-stop';
        } else {
            icon.className = 'fas fa-play';
        }
    }
    if (btnToggleSeq) {
        const icon = btnToggleSeq.querySelector('i');
        if (engine.seqIsPlaying) {
            icon.className = 'fas fa-stop';
        } else {
            icon.className = 'fas fa-play';
        }
    }
}

let mainPlaybackSource = null;

engine.onPlayheadStart = (offset, duration, rate, sliceId, playId) => {
    animatePlayhead(engine.ctx.currentTime, duration, offset, rate);
    if (sliceId !== undefined && typeof flashWaveformSlice === 'function') {
        flashWaveformSlice(sliceId, duration, playId);
    }
};

engine.onSliceStop = (playId) => {
    if (typeof removeWaveformFlash === 'function') {
        removeWaveformFlash(playId);
    }
};

// --- Loading Helpers ---

function showLoading(title = 'Processing...', subtitle = 'Optimizing your audio experience') {
    if (!loadingOverlay) return;
    loadingTitle.textContent = title;
    loadingSubtitle.textContent = subtitle;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    if (!loadingOverlay) return;
    loadingOverlay.classList.add('hidden');
}

// --- Initialization ---

async function init() {
    loadCustomPatterns();
    populatePatterns();
    setupEventListeners();
    handleResize();
    window.addEventListener('resize', () => {
        handleResize();
        drawAdsrCurve();
    });
    
    loadSettings();
    renderSequencerGrid(); // Ensure grid visually matches the loaded settings
    
    const savedAudio = await loadAudioFromDB();
    if (savedAudio) {
        showLoading('Restoring Session', 'Loading your last edited sample...');
        try {
            await engine.loadAudio(savedAudio.slice(0));
            uploadOverlay.classList.add('hidden');
            workspace.classList.remove('hidden');
            waveformArea.classList.remove('hidden');
            handleResize();
            processAudio();
        } catch(e) {
            console.error("Error loading saved audio", e);
        } finally {
            hideLoading();
        }
    }



    engine.onStepPlay = (stepNumber) => {
        document.querySelectorAll('.seq-step').forEach(el => el.classList.remove('playing'));
        if (engine.seqPattern && engine.seqPattern.type === 'drum') {
            const targetPage = Math.floor(stepNumber / 16);
            if (currentDrumPage !== targetPage) {
                currentDrumPage = targetPage;
                renderSequencerGrid();
            }
            const instruments = ['kick', 'snare', 'clap', 'chat', 'ohat', 'tom', 'perc', 'cymbal'];
            instruments.forEach(inst => {
                const el = document.getElementById(`drum-step-${inst}-${stepNumber}`);
                if (el) el.classList.add('playing');
            });
        } else {
            const stepEl = document.getElementById(`seq-step-${stepNumber}`);
            if (stepEl) stepEl.classList.add('playing');
        }
        updatePlayIcons();
    };
    updatePlayIcons();
}

function populatePatterns(preserveSelection = false) {
    const prevValue = patternSelect.value;
    patternSelect.textContent = '';
    
    const drumGroup = document.createElement('optgroup');
    drumGroup.label = "Drum Patterns";

    const rhythmicGroup = document.createElement('optgroup');
    rhythmicGroup.label = "Rhythmic Patterns";
    
    const melodicGroup = document.createElement('optgroup');
    melodicGroup.label = "Melodic Patterns";

    const savedGroup = document.createElement('optgroup');
    savedGroup.label = "Saved Sequences";

    SequencerPatterns.forEach(pat => {
        const opt = document.createElement('option');
        opt.value = pat.id;
        opt.textContent = `${pat.name} (${pat.length} steps)`;
        
        if (pat.isSavedSequence) {
            savedGroup.appendChild(opt);
        } else if (pat.type === 'drum') {
            drumGroup.appendChild(opt);
        } else if (pat.type === 'rhythmic') {
            rhythmicGroup.appendChild(opt);
        } else {
            melodicGroup.appendChild(opt);
        }
    });

    if (drumGroup.children.length > 0) patternSelect.appendChild(drumGroup);
    patternSelect.appendChild(rhythmicGroup);
    patternSelect.appendChild(melodicGroup);
    if (savedGroup.children.length > 0) {
        patternSelect.appendChild(savedGroup);
    }
    
    if (preserveSelection && prevValue) {
        patternSelect.value = prevValue;
    } else {
        renderSequencerGrid(); // render default
    }
}

function handleResize() {
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;
    drawWaveform();
}

function setupEventListeners() {
    // MIDI Initialization
    midiStatus.addEventListener('click', () => {
        new MidiHandler(
            (note, vel) => handleMidiNoteOn(note, vel),
            (note) => handleMidiNoteOff(note),
            (isConnected) => {
                if (isConnected) {
                    midiStatus.classList.add('connected');
                    midiStatus.title = "MIDI Device Connected";
                    midiStatus.textContent = '';
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-plug';
                    midiStatus.appendChild(icon);
                    midiStatus.appendChild(document.createTextNode(' MIDI Connected'));
                } else {
                    midiStatus.classList.remove('connected');
                    midiStatus.title = "MIDI Device Disconnected";
                    midiStatus.textContent = '';
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-plug';
                    midiStatus.appendChild(icon);
                    midiStatus.appendChild(document.createTextNode(' Connect MIDI'));
                }
            }
        );
    });
    // Upload & Drag Drop
    audioUploadInput.addEventListener('change', async (e) => {
        if (engine.ctx.state === 'suspended') await engine.ctx.resume();
        if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });
    document.addEventListener('dragover', (e) => { e.preventDefault(); uploadOverlay.classList.add('drag-over'); });
    document.addEventListener('dragleave', (e) => { e.preventDefault(); uploadOverlay.classList.remove('drag-over'); });
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadOverlay.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
    });

    if (tuneCheck) {
        tuneCheck.addEventListener('change', (e) => {
            engine.tuneEnabled = e.target.checked;
            renderSequencerGrid();
            saveSettings();
        });
    }

    // Recording
    btnRecord.addEventListener('click', startRecording);
    btnStopRecord.addEventListener('click', stopRecording);

    // Playback
    btnTogglePlayAll.addEventListener('click', () => {
        if (engine.ctx.state === 'suspended') engine.ctx.resume();
        
        if (mainPlaybackSource) {
            // Stop
            try { mainPlaybackSource.stop(); } catch(e) {}
            mainPlaybackSource = null;
            if (playheadAnimId) { cancelAnimationFrame(playheadAnimId); playheadAnimId = null; }
            if (playheadEl) playheadEl.style.display = 'none';
        } else {
            // Play
            mainPlaybackSource = engine.ctx.createBufferSource();
            mainPlaybackSource.buffer = engine.buffer;
            mainPlaybackSource.connect(engine.globalGain);
            mainPlaybackSource.onended = () => {
                mainPlaybackSource = null;
                updatePlayIcons();
            };
            mainPlaybackSource.start(0);
            animatePlayhead(engine.ctx.currentTime, engine.buffer.duration, 0, 1.0);
        }
        updatePlayIcons();
    });

    // Configuration Changes
    algoSelect.addEventListener('change', async () => {
        if (!engine.buffer) return;
        showLoading('Applying Algorithm', `Switching to ${algoSelect.value} mode...`);
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
            engine.setActiveAlgorithm(algoSelect.value);
            renderPads();
            drawWaveform();
            renderSequencerGrid();
            saveSettings();
        } finally {
            hideLoading();
        }
    });
    targetSlicesSelect.addEventListener('change', processAudio);
    keySelect.addEventListener('change', () => { engine.setMusicalConfig(keySelect.value, modeSelect.value, octaveSelect.value); saveSettings(); });
    modeSelect.addEventListener('change', () => { engine.setMusicalConfig(keySelect.value, modeSelect.value, octaveSelect.value); saveSettings(); });
    octaveSelect.addEventListener('change', () => { engine.setMusicalConfig(keySelect.value, modeSelect.value, octaveSelect.value); saveSettings(); });
    globalChokeCheckbox.addEventListener('change', (e) => { engine.globalChoke = e.target.checked; saveSettings(); });
    
    autoBpmBtn.addEventListener('click', () => {
        autoBpmEnabled = !autoBpmEnabled;
        autoBpmBtn.classList.toggle('btn-auto-bpm-active', autoBpmEnabled);
        saveSettings();
    });

    timbreSelect.addEventListener('change', () => {
        engine.activeTimbre = timbreSelect.value;
        autoTimbreEnabled = false;
        btnAutoTimbre.classList.remove('btn-auto-bpm-active');
        saveSettings();
    });

    btnAutoTimbre.addEventListener('click', () => {
        autoTimbreEnabled = !autoTimbreEnabled;
        btnAutoTimbre.classList.toggle('btn-auto-bpm-active', autoTimbreEnabled);
        if (autoTimbreEnabled) {
            const currentStrategy = Object.keys(algoButtons).find(k => algoButtons[k].classList.contains('btn-primary')) || 'Harmonic';
            const matchedTimbre = ALGO_TIMBRES[currentStrategy] || 'pure-sine';
            engine.activeTimbre = matchedTimbre;
            timbreSelect.value = matchedTimbre;
        }
        saveSettings();
    });

    // ADSR
    function updateAdsr(e) {
        if (e && e.target) updateSliderUI(e.target);
        const msA = toLog(parseInt(adsrA.value));
        const msD = toLog(parseInt(adsrD.value));
        const msS = toLog(parseInt(adsrS.value));
        const msR = toLog(parseInt(adsrR.value));

        engine.adsr.attack = msA / 1000;
        engine.adsr.decay = msD / 1000;
        engine.adsr.sustain = msS / 1000;
        engine.adsr.release = msR / 1000;
        
        valA.textContent = `${msA}ms`;
        valD.textContent = `${msD}ms`;
        valS.textContent = `${msS}ms`;
        valR.textContent = `${msR}ms`;
        
        drawAdsrCurve();
        saveSettings();
    }
    adsrA.addEventListener('input', updateAdsr);
    adsrD.addEventListener('input', updateAdsr);
    adsrS.addEventListener('input', updateAdsr);
    adsrR.addEventListener('input', updateAdsr);
    adsrDeviationSlider.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const sliderVal = parseInt(e.target.value);
        const normalized = (sliderVal - 50) / 50; // -1 to 1
        const deviated = Math.pow(Math.abs(normalized), 2) * (normalized < 0 ? -1.5 : 1.5);
        valAdsrDeviation.textContent = `${Math.round(deviated * 100)}%`;
        engine.adsrDeviation = deviated;
        saveSettings();
    });
    // updateAdsr(); called by loadSettings

    // Sequencer changes
    patternSelect.addEventListener('change', () => {
        const pat = SequencerPatterns.find(p => p.id == patternSelect.value);
        engine.seqPattern = pat;
        renderSequencerGrid();
        saveSettings();
    });
    
    bpmInput.addEventListener('change', saveSettings);

    seqDensity.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valDensity.textContent = `${Math.round(val * 100)}%`;
        engine.seqDensity = val;
        renderSequencerGrid();
        saveSettings();
    });
    seqSyncopation.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valSyncopation.textContent = `${Math.round(val * 100)}%`;
        engine.seqSyncopation = val;
        renderSequencerGrid();
        saveSettings();
    });
    seqSwing.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valSwing.textContent = `${Math.round(val * 100)}%`;
        engine.seqSwing = val;
        saveSettings();
    });
    seqNoteRepeat.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valNoteRepeat.textContent = `${Math.round(val * 100)}%`;
        engine.seqNoteRepeat = val;
        renderSequencerGrid();
        saveSettings();
    });
    seqMicroTiming.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valMicroTiming.textContent = `${Math.round(val * 100)}%`;
        engine.seqMicroTiming = val;
        renderSequencerGrid();
        saveSettings();
    });
    seqProbability.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valProbability.textContent = `${Math.round(val * 100)}%`;
        engine.seqProbability = val;
        renderSequencerGrid();
        saveSettings();
    });
    kickDrum.addEventListener('change', (e) => {
        engine.kickEnabled = e.target.checked;
        saveSettings();
    });
    kickLevel.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valKick.textContent = `${Math.round(val * 100)}%`;
        engine.kickLevel = val;
        saveSettings();
    });

    seqMeterSelect.addEventListener('change', () => {
        const meter = seqMeterSelect.value;
        engine.setMeter(meter);
        updateStepsOptions(meter);
        
        // Default to the middle option for the selected meter
        const available = Array.from(algoLenSelect.options).map(o => parseInt(o.value));
        const middleIdx = Math.floor(available.length / 2);
        algoLenSelect.value = available[middleIdx];
        
        const patId = patternSelect.value;
        const pattern = SequencerPatterns.find(p => p.id == patId);
        if (pattern) pattern.length = parseInt(algoLenSelect.value);
        
        renderSequencerGrid();
        saveSettings();
    });

    function updateStepsOptions(meter) {
        let options = [];
        if (meter === '4/4') options = [8, 16, 32, 64, 128];
        else if (meter === '3/4') options = [6, 12, 24, 48, 96];
        else if (meter === '5/4') options = [10, 20, 40, 80];
        else if (meter === '6/8') options = [6, 12, 24, 48, 96];
        else if (meter === '7/4') options = [14, 28, 56];
        else options = [8, 16, 32, 64];

        const currentVal = algoLenSelect.value;
        algoLenSelect.textContent = '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            if (opt == currentVal) option.selected = true;
            algoLenSelect.appendChild(option);
        });
    }
    sampleLevelSlider.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valSampleLevel.textContent = `${Math.round(val * 100)}%`;
        engine.sampleLevel = val;
        saveSettings();
    });

    toneLevelSlider.addEventListener('input', (e) => {
        updateSliderUI(e.target);
        const val = toLogPercent(parseInt(e.target.value));
        valToneLevel.textContent = `${Math.round(val * 100)}%`;
        engine.toneLevel = val;
        saveSettings();
    });

    chordsCheck.addEventListener('change', (e) => {
        engine.chordsEnabled = e.target.checked;
        saveSettings();
    });

    if (moreLongNotesCheck) {
        moreLongNotesCheck.addEventListener('change', (e) => {
            engine.moreLongNotes = e.target.checked;
            saveSettings();
            const currentStrategy = Object.keys(algoButtons).find(k => algoButtons[k] && algoButtons[k].classList.contains('btn-primary')) || 'Harmonic';
            generateAlgorithmicPattern(currentStrategy);
        });
    }

    if (contrastCheck) {
        contrastCheck.addEventListener('change', (e) => {
            engine.contrastEnabled = e.target.checked;
            saveSettings();
        });
    }

    if (partToggle) {
        const updatePartToggleUI = () => {
            const isVerse = partToggle.checked;
            engine.songPart = isVerse ? 'verse' : 'chorus';
            if (labelChorus && labelVerse) {
                labelChorus.className = isVerse ? 'toggle-label' : 'toggle-label active-primary';
                labelVerse.className = isVerse ? 'toggle-label active-secondary' : 'toggle-label';
                labelChorus.style.color = isVerse ? 'var(--text-muted)' : '';
                labelVerse.style.color = isVerse ? '' : 'var(--text-muted)';
            }
            saveSettings();
            const currentStrategy = Object.keys(algoButtons).find(k => algoButtons[k] && algoButtons[k].classList.contains('btn-primary')) || 'Harmonic';
            generateAlgorithmicPattern(currentStrategy);
        };
        partToggle.addEventListener('change', updatePartToggleUI);
        if (labelChorus) {
            labelChorus.addEventListener('click', () => {
                partToggle.checked = false;
                updatePartToggleUI();
            });
        }
        if (labelVerse) {
            labelVerse.addEventListener('click', () => {
                partToggle.checked = true;
                updatePartToggleUI();
            });
        }
    }

    if (seqSliceAssignToggle) {
        const updateSliceAssignUI = () => {
            const isSeq = seqSliceAssignToggle.checked;
            engine.sliceAssignMode = isSeq ? 'sequential' : 'fit';
            if (labelFit && labelSeq) {
                labelFit.className = isSeq ? 'toggle-label' : 'toggle-label active-primary';
                labelSeq.className = isSeq ? 'toggle-label active-secondary' : 'toggle-label';
                labelFit.style.color = isSeq ? 'var(--text-muted)' : '';
                labelSeq.style.color = isSeq ? '' : 'var(--text-muted)';
            }
            saveSettings();
            const currentStrategy = Object.keys(algoButtons).find(k => algoButtons[k] && algoButtons[k].classList.contains('btn-primary')) || 'Harmonic';
            generateAlgorithmicPattern(currentStrategy);
        };
        seqSliceAssignToggle.addEventListener('change', updateSliceAssignUI);
        if (labelFit) {
            labelFit.addEventListener('click', () => {
                seqSliceAssignToggle.checked = false;
                updateSliceAssignUI();
            });
        }
        if (labelSeq) {
            labelSeq.addEventListener('click', () => {
                seqSliceAssignToggle.checked = true;
                updateSliceAssignUI();
            });
        }
    }

    if (seqModeToggle) {
        const updateSeqModeUI = () => {
            const isDrum = seqModeToggle.checked;
            engine.sequencerMode = isDrum ? 'drum' : 'melody';
            if (labelModeMel && labelModeDrum) {
                labelModeMel.className = isDrum ? 'toggle-label' : 'toggle-label active-primary';
                labelModeDrum.className = isDrum ? 'toggle-label active-secondary' : 'toggle-label';
                labelModeMel.style.color = isDrum ? 'var(--text-muted)' : '';
                labelModeDrum.style.color = isDrum ? '' : 'var(--text-muted)';
            }
            const btnExportMidiMel = document.getElementById('btn-export-midi');
            const btnExportMidiChords = document.getElementById('btn-export-midi-chords');
            const btnExportMidiDrum = document.getElementById('btn-export-midi-drum');
            if (btnExportMidiMel) btnExportMidiMel.style.display = isDrum ? 'none' : 'inline-flex';
            if (btnExportMidiChords) btnExportMidiChords.style.display = isDrum ? 'none' : 'inline-flex';
            if (btnExportMidiDrum) btnExportMidiDrum.style.display = isDrum ? 'inline-flex' : 'none';

            saveSettings();
            const currentStrategy = Object.keys(algoButtons).find(k => algoButtons[k] && algoButtons[k].classList.contains('btn-primary')) || 'Harmonic';
            generateAlgorithmicPattern(currentStrategy);
        };
        seqModeToggle.addEventListener('change', updateSeqModeUI);
        if (labelModeMel) {
            labelModeMel.addEventListener('click', () => {
                seqModeToggle.checked = false;
                updateSeqModeUI();
            });
        }
        if (labelModeDrum) {
            labelModeDrum.addEventListener('click', () => {
                seqModeToggle.checked = true;
                updateSeqModeUI();
            });
        }
    }

    if (btnDrumPrev) {
        btnDrumPrev.addEventListener('click', () => {
            if (currentDrumPage > 0) {
                currentDrumPage--;
                renderSequencerGrid();
            }
        });
    }
    if (btnDrumNext) {
        btnDrumNext.addEventListener('click', () => {
            const pat = SequencerPatterns.find(p => p.id == patternSelect.value);
            if (pat && pat.type === 'drum') {
                const maxPage = Math.max(0, Math.ceil(pat.length / 16) - 1);
                if (currentDrumPage < maxPage) {
                    currentDrumPage++;
                    renderSequencerGrid();
                }
            }
        });
    }



    Object.keys(algoButtons).forEach(strategy => {
        algoButtons[strategy].addEventListener('click', () => generateAlgorithmicPattern(strategy));
    });







    // Resume AudioContext on first user interaction
    const resumeAudio = () => {
        if (engine.ctx.state === 'suspended') {
            engine.ctx.resume();
        }
    };
    window.addEventListener('click', resumeAudio, { once: true });
    window.addEventListener('mousedown', resumeAudio, { once: true });
    window.addEventListener('touchstart', resumeAudio, { once: true });
    window.addEventListener('keydown', resumeAudio, { once: true });

    btnToggleSeq.addEventListener('click', async () => {
        if (engine.ctx.state === 'suspended') await engine.ctx.resume();
        
        if (engine.seqIsPlaying) {
            engine.stopSequencer();
            document.querySelectorAll('.seq-step').forEach(el => el.classList.remove('playing'));
        } else {
            const pat = SequencerPatterns.find(p => p.id == patternSelect.value);
            engine.startSequencer(pat, parseInt(bpmInput.value));
        }
        updatePlayIcons();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.repeat || e.target.tagName === 'INPUT') return;
        const key = e.key.toUpperCase();
        if (keyMap.hasOwnProperty(key)) {
            triggerPad(keyMap[key]);
        }
    });
    window.addEventListener('keyup', (e) => {
        const key = e.key.toUpperCase();
        if (keyMap.hasOwnProperty(key)) {
            const padId = keyMap[key];
            const padElement = document.getElementById(`pad-${padId}`);
            if (padElement) padElement.classList.remove('active');
        }
    });

    // Waveform click
    canvas.addEventListener('mousedown', (e) => {
        if (!engine.buffer) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickTime = (x / canvas.width) * engine.buffer.duration;
        
        // Find which slice was clicked
        const slice = engine.slices.find(s => clickTime >= s.start && clickTime <= s.end);
        if (slice) {
            engine.playPad(slice.id);
            const padIndex = engine.padMapping.findIndex(p => p === slice.id);
            if (padIndex !== -1) {
                const padEl = document.getElementById(`pad-${padIndex}`);
                if (padEl) {
                    padEl.classList.add('active');
                    setTimeout(() => padEl.classList.remove('active'), 100);
                }
            }
            
            // Toggle sequencer steps using this slice
            const patId = patternSelect.value;
            const pat = SequencerPatterns.find(p => p.id == patId);
            if (pat) {
                const stepsUsingSlice = pat.steps.filter((s, idx) => {
                    const sliceIdLookup = s.sliceId !== undefined ? s.sliceId : idx;
                    return (sliceIdLookup % engine.slices.length) === slice.id;
                });
                
                if (stepsUsingSlice.length > 0) {
                    const allActive = stepsUsingSlice.every(s => s.active);
                    const newState = !allActive;
                    stepsUsingSlice.forEach(s => s.active = newState);
                    
                    if (pat.isCustom) saveCustomPatterns();
                    renderSequencerGrid();
                }
            }
        }
    });

    // Waveform Drag Start
    canvas.draggable = true;
    canvas.addEventListener('dragstart', (e) => {
        if (!engine.buffer) {
            e.preventDefault();
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickTime = (x / canvas.width) * engine.buffer.duration;
        
        const slice = engine.slices.find(s => clickTime >= s.start && clickTime <= s.end);
        if (slice) {
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'slice', id: slice.id }));
            
            // Create a small drag image to prevent giant canvas dragging
            const dragDiv = document.createElement('div');
            dragDiv.textContent = `Slice ${slice.id + 1}`;
            dragDiv.style.cssText = "position:absolute; top:-1000px; padding:8px 12px; background:#6366f1; color:white; border-radius:6px; font-family:sans-serif; font-size:12px;";
            document.body.appendChild(dragDiv);
            e.dataTransfer.setDragImage(dragDiv, 0, 0);
            
            // cleanup
            setTimeout(() => document.body.removeChild(dragDiv), 0);
        } else {
            e.preventDefault();
        }
    });

    // Exporting
    if (btnExportWet) btnExportWet.addEventListener('click', () => exportSequence(true));
    if (btnExportDry) btnExportDry.addEventListener('click', () => exportSequence(false));
    if (btnExportMidi) btnExportMidi.addEventListener('click', exportMidi);
    if (btnExportMidiChords) btnExportMidiChords.addEventListener('click', exportMidiChords);
    if (btnExportMidiDrumGlobal) btnExportMidiDrumGlobal.addEventListener('click', exportMidiDrum);
    // Demo File
    const btnLoadDemo = document.getElementById('btn-load-demo');
    if (btnLoadDemo) {
        btnLoadDemo.addEventListener('click', async (e) => {
            if (engine.ctx.state === 'suspended') await engine.ctx.resume();
            e.stopPropagation();
            showLoading('Downloading Demo', 'Fetching professional sample pack...');
            try {
                if (filenameDisplay) filenameDisplay.textContent = 'I Wandered Lonely (Demo)';
                const response = await fetch('https://dn710005.ca.archive.org/0/items/spc251_2405_librivox/spc251_iwanderedlonely_mj_128kb.mp3');
                if (!response.ok) throw new Error('Network response was not ok');
                const arrayBuffer = await response.arrayBuffer();
                await loadAndProcessArrayBuffer(arrayBuffer);
            } catch (err) {
                alert("Error loading demo file: " + err.message);
            } finally {
                hideLoading();
            }
        });
    }
}

function generateAlgorithmicPattern(strategy) {
    if (!engine.buffer || engine.slices.length === 0) return;
    
    if (autoBpmEnabled && GENRE_BPMS[strategy]) {
        const newBpm = GENRE_BPMS[strategy];
        bpmInput.value = newBpm;
        engine.seqBpm = newBpm;
    }

    if (autoTimbreEnabled && ALGO_TIMBRES[strategy]) {
        const matchedTimbre = ALGO_TIMBRES[strategy];
        engine.activeTimbre = matchedTimbre;
        if (timbreSelect) timbreSelect.value = matchedTimbre;
    }

    Object.keys(algoButtons).forEach(k => {
        if (algoButtons[k]) {
            algoButtons[k].classList.remove('btn-primary');
            algoButtons[k].classList.add('btn-secondary');
        }
    });
    if (algoButtons[strategy]) {
        algoButtons[strategy].classList.remove('btn-secondary');
        algoButtons[strategy].classList.add('btn-primary');
    }

    const len = parseInt(algoLenSelect.value) || 64;
    // Use the same broad note pool as the audio engine to ensure consistent mapping
    const validNotes = ScaleQuantizer.getValidMidiNotes(engine.musicalKey, engine.musicalMode, -1, 9);
    
    // Find index range for A2 (45) to G4 (67) within the scale
    let vMinIdx = 0;
    while (vMinIdx < validNotes.length && validNotes[vMinIdx] < 45) vMinIdx++;
    let vMaxIdx = validNotes.length - 1;
    while (vMaxIdx >= 0 && validNotes[vMaxIdx] > 67) vMaxIdx--;
    
    // Center point for the algorithms
    const vMidIdx = Math.floor((vMinIdx + vMaxIdx) / 2);
    
    if (engine.sequencerMode === 'drum') {
        const mapping = engine.classifySlicesForDrumKit();
        const instruments = ['kick', 'snare', 'clap', 'chat', 'ohat', 'tom', 'perc', 'cymbal'];
        
        let drumTracks = instruments.map(inst => ({
            instrument: inst,
            sliceId: mapping[inst] || 0,
            steps: new Array(len).fill(null).map((_, idx) => ({ step: idx, active: false }))
        }));

        const setHits = (instName, patternArr, prob = 1.0, ratchetIntervals = {}) => {
            const trk = drumTracks.find(t => t.instrument === instName);
            if (!trk) return;
            for (let s = 0; s < len; s++) {
                if (patternArr[s % patternArr.length] && Math.random() < prob) {
                    trk.steps[s] = {
                        step: s,
                        active: true,
                        ratchets: ratchetIntervals[s % 16] || 1
                    };
                }
            }
        };

        const dense = (engine.seqDensity || 0.5);
        
        if (strategy === 'House' || strategy === 'Acid' || strategy === 'Trance' || strategy === 'Slap House') {
            setHits('kick', [1, 0, 0, 0], dense * 1.5);
            setHits('clap', [0, 0, 0, 0, 1, 0, 0, 0], dense * 1.2);
            setHits('ohat', [0, 0, 1, 0], dense * 1.4);
            setHits('chat', [1, 1, 1, 1, 1, 1, 1, 1], dense * 0.8);
            setHits('perc', [0, 1, 0, 1, 0, 0, 1, 0], dense * 0.6);
        } else if (strategy === 'Trap' || strategy === 'Drill' || strategy === 'Hyperpop' || strategy === 'Phonk') {
            setHits('kick', [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0], dense * 1.5);
            setHits('snare', [0, 0, 0, 0, 1, 0, 0, 0], dense * 1.5);
            setHits('chat', [1, 1, 1, 1, 1, 1, 1, 1], dense * 1.6, { 2: 2, 6: 3, 14: 4 });
            setHits('tom', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0], dense * 0.7);
            setHits('cymbal', [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], dense * 0.5);
        } else if (strategy === 'Breakbeat' || strategy === 'Jungle' || strategy === 'Drum & Bass' || strategy === 'Neuro') {
            setHits('kick', [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], dense * 1.4);
            setHits('snare', [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0], dense * 1.3);
            setHits('chat', [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0], dense * 1.2);
            setHits('perc', [0, 1, 0, 1, 0, 0, 1, 0], dense * 0.9);
        } else if (strategy === 'Jersey Club' || strategy === 'Footwork') {
            setHits('kick', [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0], dense * 1.6);
            setHits('chat', [1, 0, 1, 0, 1, 0, 1, 0], dense * 1.2);
            setHits('clap', [0, 0, 0, 0, 1, 0, 0, 0], dense * 1.3);
            setHits('perc', [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], dense * 1.1);
        } else if (strategy === 'R&B' || strategy === 'Neo-Soul' || strategy === 'Future Bass') {
            setHits('kick', [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0], dense * 1.3);
            setHits('snare', [0, 0, 0, 0, 1, 0, 0, 0], dense * 1.4);
            setHits('chat', [1, 0, 1, 0, 1, 0, 1, 0], dense * 1.1);
            setHits('ohat', [0, 0, 0, 0, 0, 0, 1, 0], dense * 0.8);
        } else {
            setHits('kick', [1, 0, 0, 0, 0, 0, 1, 0], dense * 1.3);
            setHits('snare', [0, 0, 0, 0, 1, 0, 0, 0], dense * 1.3);
            setHits('chat', [1, 1, 0, 1, 1, 1, 0, 1], dense * 1.1);
            setHits('tom', [0, 0, 1, 0, 0, 0, 0, 0], dense * 0.6);
            setHits('perc', [0, 0, 0, 1, 0, 1, 0, 0], dense * 0.8);
        }

        const newPat = {
            id: 'drum_' + Date.now(),
            name: strategy + ' Drums ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
            strategy: strategy,
            type: 'drum',
            length: len,
            drumTracks: drumTracks,
            isCustom: true
        };

        SequencerPatterns.push(newPat);
        saveCustomPatterns();
        populatePatterns();
        patternSelect.value = newPat.id;
        engine.seqPattern = newPat;
        renderSequencerGrid();
        return;
    }

    let steps = [];
    const isVerse = engine.songPart === 'verse';
    // Verse section patterns have slightly sparser density to accommodate vocal/lead lines
    const density = (engine.seqDensity || 0.5) * (isVerse ? 0.75 : 1.0);

    // Map any raw strategy index safely to a section-optimized register range.
    // Verse melodies sit more comfortably in the lower/mid register.
    // Chorus melodies sit higher, acting as a confident soaring lead.
    const getOptimizedIdx = (rawIdx) => {
        // Normalize out-of-bounds legacy roots
        let baseIdx = rawIdx < 0 ? 0 : rawIdx;
        let shift = isVerse ? -3 : 5;
        // Strictly clamp to the A2-G4 range indices
        return Math.max(vMinIdx, Math.min(vMaxIdx, baseIdx + shift));
    };

    let seqSliceCounter = 0;
    const isSeqMode = engine.sliceAssignMode === 'sequential';

    const findBestSlice = (targetIdx) => {
        if (isSeqMode) {
            if (engine.slices.length > 1) {
                const assignedId = 1 + (seqSliceCounter % (engine.slices.length - 1));
                seqSliceCounter++;
                return assignedId;
            } else {
                return 0;
            }
        }
        const optimizedIdx = getOptimizedIdx(targetIdx);
        const targetMidi = validNotes[optimizedIdx];
        let bestSliceId = engine.slices.length > 1 ? 1 : 0;
        let minDiff = Infinity;
        engine.slices.forEach((slice, idx) => {
            if (idx === 0 && engine.slices.length > 1) return;
            if (slice.pitch && slice.pitch.midi > 0) {
                const diff = Math.abs(slice.pitch.midi - targetMidi);
                if (diff < minDiff) { minDiff = diff; bestSliceId = idx; }
            }
        });
        return bestSliceId;
    };

    const getOffset = (currentIdx, sliceId) => {
        if (isSeqMode) return 0; // Play sequential slices at their native pitch
        const optimizedIdx = getOptimizedIdx(currentIdx);
        
        let baseIdx = -1;
        if (engine.tuneEnabled) {
            // In Tune mode, offsets are relative to the master UI root note
            const rootMidi = ScaleQuantizer.NOTES.indexOf(engine.musicalKey) + (engine.musicalOctave + 4) * 12;
            baseIdx = validNotes.indexOf(rootMidi);
        } else {
            // In Relative mode, offsets are relative to the sample's detected pitch
            const slice = engine.slices[sliceId];
            if (slice && slice.pitch && slice.pitch.midi > 0) {
                const sliceBaseMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, engine.musicalKey, engine.musicalMode);
                baseIdx = validNotes.indexOf(sliceBaseMidi);
            }
        }
        
        // Fallback to center if reference point not found
        if (baseIdx === -1) baseIdx = Math.floor(validNotes.length / 2);
        
        return optimizedIdx - baseIdx;
    };

    let i = 0;
    if (strategy === 'Brownian') {
        let currentIdx = vMidIdx;
        let lastLeap = 0;
        while (i < len) {
            if (Math.random() < density) {
                let duration = Math.random() < 0.2 ? [2, 3, 4, 6][Math.floor(Math.random() * 4)] : 1;
                duration = Math.min(duration, len - i);
                let isChord = duration >= 3 && Math.random() < 0.4;
                let interval = (Math.abs(lastLeap) >= 3) ? (lastLeap > 0 ? -1 - Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2)) : (Math.random() < 0.6 ? Math.floor(Math.random() * 5) - 2 : (Math.random() > 0.5 ? 3 : -3));
                if (Math.abs(interval) >= 3) lastLeap = interval; else lastLeap = 0;
                currentIdx = Math.max(vMinIdx, Math.min(vMaxIdx, currentIdx + interval));
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Intervallic') {
        let currentIdx = vMidIdx;
        while (i < len) {
            if (Math.random() < density) {
                let duration = Math.random() < 0.2 ? [2, 3, 4, 6][Math.floor(Math.random() * 4)] : 1;
                duration = Math.min(duration, len - i);
                let isChord = duration >= 3 && Math.random() < 0.4;
                const scaleJump = [1, 2, 4, 7][Math.floor(Math.random() * 4)] * (Math.random() > 0.5 ? 1 : -1);
                currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx + scaleJump));
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Euclidean') {
        const pulses = Math.max(1, Math.floor(len * density));
        const rhythmicPattern = SequencerPatterns.generateEuclidean(len, pulses).steps;
        const arpeggio = [0, 2, 4, 7, 9, 12];
        let arpIdx = 0;
        const rootIdx = vMinIdx;
        while (i < len) {
            if (rhythmicPattern[i].active) {
                let duration = Math.random() < 0.15 ? [2, 2, 3, 4][Math.floor(Math.random() * 4)] : 1;
                duration = Math.min(duration, len - i);
                let isChord = duration >= 3 && Math.random() < 0.3;
                const currentIdx = rootIdx + arpeggio[arpIdx % arpeggio.length];
                arpIdx++;
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Harmonic') {
        const chordTones = [0, 2, 4];
        const rootIdx = vMinIdx;
        while (i < len) {
            const isPulse = (i % 8 === 0 || i % 8 === 3 || i % 8 === 6);
            if (isPulse && (Math.random() < density * 1.5)) {
                let duration = [2, 3, 4, 6][Math.floor(Math.random() * 4)];
                duration = Math.min(duration, len - i);
                let isChord = duration >= 3 && Math.random() < 0.8;
                const currentIdx = rootIdx + chordTones[Math.floor(Math.random() * chordTones.length)] + (Math.floor(i / 8) * 2);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Markov') {
        let currentIdx = vMidIdx;
        let lastDir = 1;
        while (i < len) {
            if (Math.random() < density) {
                let duration = Math.random() < 0.2 ? [2, 3, 4, 6][Math.floor(Math.random() * 4)] : 1;
                duration = Math.min(duration, len - i);
                let isChord = duration >= 3 && Math.random() < 0.4;
                const stayDir = Math.random() < 0.7;
                const dir = stayDir ? lastDir : -lastDir;
                const amount = [1, 1, 2, 3][Math.floor(Math.random() * 4)];
                currentIdx = Math.max(vMinIdx, Math.min(vMaxIdx, currentIdx + (dir * amount)));
                lastDir = dir;
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Stochastic') {
        while (i < len) {
            if (Math.random() < density * 1.2) {
                let duration = Math.random() < 0.25 ? [2, 3, 4, 6][Math.floor(Math.random() * 4)] : 1;
                duration = Math.min(duration, len - i);
                let isChord = duration >= 3 && Math.random() < 0.5;
                const currentIdx = vMinIdx + (Math.floor(Math.random() * (vMaxIdx - vMinIdx + 1)));
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Mirror') {
        let halfSteps = [];
        let hi = 0;
        let currentIdx = vMidIdx;
        while (hi < len / 2) {
            if (Math.random() < density) {
                let duration = Math.random() < 0.2 ? [2, 3, 4, 6][Math.floor(Math.random() * 4)] : 1;
                duration = Math.min(duration, Math.floor(len / 2) - hi);
                currentIdx = Math.max(vMinIdx, Math.min(vMaxIdx, currentIdx + Math.floor(Math.random() * 5) - 2));
                halfSteps.push({ active: true, idx: currentIdx, duration });
                for (let j = 1; j < duration; j++) halfSteps.push({ active: false });
                hi += duration;
            } else { halfSteps.push({ active: false }); hi++; }
        }
        for (let j = 0; j < len; j++) {
            const isSecondHalf = j >= len / 2;
            const source = isSecondHalf ? halfSteps[len - 1 - j] : halfSteps[j];
            if (source.active) {
                const sliceId = findBestSlice(source.idx);
                const isChord = source.duration >= 3 && Math.random() < 0.4;
                steps.push({ step: j, active: true, duration: source.duration, isChord, sliceId, melodicOffset: getOffset(source.idx, sliceId) });
                for (let k = 1; k < source.duration; k++) steps.push({ step: j + k, active: false });
                j += (source.duration - 1);
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Pedal') {
        const rootIdx = vMinIdx;
        let currentIdx = rootIdx + 7;
        for (let j = 0; j < len; j++) {
            const isPedal = j % 2 === 0;
            if (Math.random() < density * 1.2) {
                let duration = (isPedal && Math.random() > 0.5) ? 2 : 1;
                duration = Math.min(duration, len - j);
                const isChord = duration >= 3 && Math.random() < 0.5;
                const targetIdx = isPedal ? rootIdx : (currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx + Math.floor(Math.random() * 3) - 1)));
                const sliceId = findBestSlice(targetIdx);
                steps.push({ step: j, active: true, duration, isChord, sliceId, melodicOffset: getOffset(targetIdx, sliceId) });
                if (duration > 1) { for (let k = 1; k < duration; k++) steps.push({ step: j + k, active: false }); j += (duration - 1); }
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Bitwise') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            const isActive = ((j & (j >> 2)) % 3 === 0) && (Math.random() < density * 1.5);
            if (isActive) {
                let duration = (j % 4 === 0) ? 2 : 1;
                const isChord = duration >= 3 && Math.random() < 0.4;
                const currentIdx = rootIdx + ((j ^ (j >> 3)) % 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, duration, isChord, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                if (duration > 1) { for (let k = 1; k < duration; k++) steps.push({ step: j + k, active: false }); j += (duration - 1); }
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Cellular') {
        const rootIdx = vMinIdx;
        let row = new Array(len).fill(0); row[Math.floor(len / 2)] = 1;
        const nextRow = (r) => {
            let nr = new Array(len).fill(0);
            for (let j = 0; j < len; j++) {
                const left = r[(j - 1 + len) % len]; const self = r[j]; const right = r[(j + 1) % len];
                const rule = (left << 2) | (self << 1) | right; nr[j] = [0, 1, 1, 0, 1, 0, 0, 1][rule];
            }
            return nr;
        };
        for (let j = 0; j < 4; j++) row = nextRow(row);
        for (let j = 0; j < len; j++) {
            if (row[j] && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (j % 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Fibonacci') {
        const rootIdx = vMinIdx;
        let a = 1, b = 1; let fibs = new Set();
        for (let j = 0; j < 12; j++) { fibs.add(a % len); let tmp = a; a = b; b = tmp + b; }
        for (let j = 0; j < len; j++) {
            if (fibs.has(j) && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (j % 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Anchor') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            const isAnchor = j % 4 === 0;
            if ((isAnchor || Math.random() < density) && Math.random() < 0.8) {
                const targetIdx = isAnchor ? rootIdx : rootIdx + [2, 4, 7, 9, 11][Math.floor(Math.random() * 5)];
                const sliceId = findBestSlice(targetIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(targetIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Acid') {
        const rootIdx = vMinIdx;
        let currentIdx = rootIdx + 7;
        let runLeft = 0;
        let dir = 1;
        for (let i = 0; i < len; i++) {
            if (runLeft <= 0) {
                runLeft = [4, 6, 8][Math.floor(Math.random() * 3)];
                dir = Math.random() > 0.5 ? 1 : -1;
            }
            if (Math.random() < density * 1.5) {
                currentIdx = Math.max(rootIdx, Math.min(rootIdx + 24, currentIdx + dir));
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: i, active: false });
            runLeft--;
        }
    } else if (strategy === 'Phasing') {
        const rootIdx = vMinIdx;
        const motif = [0, 2, 4, 7, 9].map(n => rootIdx + n);
        for (let i = 0; i < len; i++) {
            if (Math.random() < density) {
                const currentIdx = motif[(i + Math.floor(i / 8)) % motif.length];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: i, active: false });
        }
    } else if (strategy === 'Motif') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        let boxBase = rootIdx;
        for (let i = 0; i < len; i++) {
            if (i % 8 === 0) boxBase += (Math.random() > 0.5 ? 2 : -2);
            if (Math.random() < density) {
                const currentIdx = boxBase + Math.floor(Math.random() * 5);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: i, active: false });
        }
    } else if (strategy === 'Drill') {
        const rootIdx = vMinIdx;
        while (i < len) {
            if (Math.random() < density * 1.5) {
                let duration = [1, 1, 2, 3][Math.floor(Math.random() * 4)];
                duration = Math.min(duration, len - i);
                const currentIdx = rootIdx + [0, 1, 3, 4, 6][Math.floor(Math.random() * 5)];
                const sliceId = findBestSlice(currentIdx);
                const ratchets = (i % 8 === 6) ? 3 : 1; // Drill triplets
                steps.push({ step: i, active: true, duration, sliceId, ratchets, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Dubstep') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            const isAccent = (j % 16 === 0 || j % 16 === 8);
            if (isAccent || (Math.random() < density * 0.5)) {
                const ratchets = Math.random() > 0.7 ? [2, 4, 8][Math.floor(Math.random() * 3)] : 1;
                const currentIdx = rootIdx + (j % 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, ratchets, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Trance') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        const arp = [0, 4, 7, 12, 11, 7, 4, 0];
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.8) {
                const currentIdx = rootIdx + arp[j % arp.length];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'House') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            const isOffbeat = j % 4 === 2;
            if (isOffbeat || Math.random() < density) {
                const currentIdx = rootIdx + (j % 2 === 0 ? 0 : 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Vapor') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        while (i < len) {
            if (Math.random() < density * 0.8) {
                let duration = [3, 4, 6, 8][Math.floor(Math.random() * 4)];
                duration = Math.min(duration, len - i);
                const currentIdx = rootIdx + (Math.floor(Math.random() * 24) - 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Synthwave') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            const isDriving = j % 2 === 0;
            if (isDriving && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (j % 8 === 0 ? 0 : 7);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Garage') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.2) {
                const microTiming = (j % 2 !== 0) ? (Math.random() * 0.02 + 0.01) : 0;
                const currentIdx = rootIdx + [0, 2, 5, 7, 10][Math.floor(Math.random() * 5)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, microTiming, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Samba') {
        const rootIdx = vMinIdx;
        const accents = [0, 3, 6, 8, 11, 14];
        for (let j = 0; j < len; j++) {
            if (accents.includes(j % 16) || Math.random() < density) {
                const currentIdx = rootIdx + (j % 16);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Industrial') {
        const rootIdx = Math.floor(validNotes.length / 2) - 21;
        for (let j = 0; j < len; j++) {
            if (j % 2 === 0 && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (Math.random() > 0.8 ? 1 : 0);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Trap') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density) {
                const ratchets = (Math.random() > 0.8) ? [2, 3, 4, 6][Math.floor(Math.random() * 4)] : 1;
                const currentIdx = rootIdx + [0, 2, 3, 5, 7][Math.floor(Math.random() * 5)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, ratchets, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Folk') {
        const rootIdx = vMinIdx;
        const progression = [0, 5, 7, 5];
        while (i < len) {
            const bar = Math.floor(i / 16);
            const currentIdx = rootIdx + progression[bar % progression.length] + [0, 2, 4, 7][Math.floor(Math.random() * 4)];
            const sliceId = findBestSlice(currentIdx);
            steps.push({ step: i, active: true, duration: 2, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            steps.push({ step: i + 1, active: false });
            i += 2;
        }
    } else if (strategy === 'Disco') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            const isOctave = j % 2 === 0;
            if (Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (isOctave ? 0 : 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Grime') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 0.6) {
                const currentIdx = rootIdx + [0, 1, 13][Math.floor(Math.random() * 3)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Neo-Soul') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        while (i < len) {
            if (Math.random() < density) {
                let duration = [3, 4, 6][Math.floor(Math.random() * 3)];
                duration = Math.min(duration, len - i);
                const microTiming = Math.random() * 0.03 + 0.02; // Late feel
                const currentIdx = rootIdx + (Math.floor(Math.random() * 12) - 6);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord: true, sliceId, microTiming, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Classical') {
        const rootIdx = vMinIdx;
        const alberti = [0, 7, 4, 7];
        for (let j = 0; j < len; j++) {
            const currentIdx = rootIdx + alberti[j % 4] + (Math.floor(j / 16) * 2);
            const sliceId = findBestSlice(currentIdx);
            steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
        }
    } else if (strategy === 'Neuro') {
        const rootIdx = vMinIdx;
        while (i < len) {
            const ratchets = [1, 2, 4, 8][Math.floor(Math.pow(Math.random(), 2) * 4)];
            const currentIdx = rootIdx + (i % 12);
            const sliceId = findBestSlice(currentIdx);
            steps.push({ step: i, active: true, sliceId, ratchets, melodicOffset: getOffset(currentIdx, sliceId) });
            i++;
        }
    } else if (strategy === 'Pendulum') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let i = 0; i < len; i++) {
            if (Math.random() < density) {
                const currentIdx = rootIdx + Math.round(Math.sin(i * 0.5) * 7);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: i, active: false });
        }
    } else if (strategy === 'Bossa Nova') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        const clave = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0];
        for (let j = 0; j < len; j++) {
            if (clave[j % 16] && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + [0, 2, 4, 7][Math.floor(Math.random() * 4)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, isChord: Math.random() < 0.4, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Cumbia') {
        const rootIdx = Math.floor(validNotes.length / 2) - 10;
        for (let j = 0; j < len; j++) {
            const isOffbeat = j % 4 === 2 || j % 4 === 3;
            if (isOffbeat && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (j % 8 < 4 ? 0 : 7);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Dancehall') {
        const rootIdx = Math.floor(validNotes.length / 2) - 12;
        const tresillo = [1, 0, 0, 1, 0, 0, 1, 0];
        for (let j = 0; j < len; j++) {
            if (tresillo[j % 8] && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + [0, 0, 12][Math.floor(Math.random() * 3)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Flamenco') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density) {
                const currentIdx = rootIdx + [0, 1, 4, 5, 7][Math.floor(Math.random() * 5)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, ratchets: Math.random() < 0.25 ? 3 : 1, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Polyrhythmic') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            const isPulse = j % 5 === 0 || j % 7 === 0;
            if (isPulse || Math.random() < density * 0.5) {
                const currentIdx = rootIdx + (j % 5) + (j % 7);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Rumba') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            const isCall = j % 8 < 4;
            if (Math.random() < density) {
                const currentIdx = rootIdx + (isCall ? 0 : [2, 4, 7][Math.floor(Math.random() * 3)]);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Bhangra') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            const isBounce = j % 4 === 0 || j % 4 === 3;
            if (isBounce && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (j % 8 === 0 ? 0 : 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Footwork') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.2) {
                const currentIdx = rootIdx + Math.floor(Math.random() * 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, ratchets: Math.random() < 0.3 ? 4 : 1, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Drum & Bass') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (j % 4 === 0 ? 0 : Math.floor(Math.random() * 16));
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Jungle') {
        const rootIdx = vMinIdx;
        while (i < len) {
            if (Math.random() < density * 1.2) {
                const isBass = i % 8 < 4;
                const duration = isBass ? 1 : [2, 4][Math.floor(Math.random() * 2)];
                const currentIdx = rootIdx + (isBass ? 0 : 12 + Math.floor(Math.random() * 7));
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Breakbeat') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            const isBreak = j % 8 === 3 || j % 8 === 6;
            if (!isBreak && Math.random() < density * 1.3) {
                const currentIdx = rootIdx + [0, 3, 5, 7][Math.floor(Math.random() * 4)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, swing: 0.15, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Future Bass') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        while (i < len) {
            if (i % 4 === 0 && Math.random() < density * 2) {
                const duration = 4;
                const currentIdx = rootIdx + [0, 4, 5, 7][Math.floor(Math.random() * 4)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Hardstyle') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            const isOff = j % 4 === 2;
            if (isOff || Math.random() < density * 0.5) {
                const currentIdx = rootIdx + (isOff ? 0 : 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'IDM') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        while (i < len) {
            if (Math.random() < density) {
                const duration = Math.random() < 0.3 ? [1, 2, 3, 5][Math.floor(Math.random() * 4)] : 1;
                const currentIdx = rootIdx + (Math.floor(Math.pow(Math.random(), 2) * 16));
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, ratchets: Math.random() < 0.1 ? 2 : 1, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Psytrance') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            if (j % 4 !== 0 && Math.random() < density * 1.8) {
                const currentIdx = rootIdx + (j % 16 === 14 ? 12 : 0);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Slap House') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.3) {
                const currentIdx = rootIdx + [0, 0, 12, 12][Math.floor(Math.random() * 4)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Cinematic') {
        const rootIdx = vMinIdx;
        const cell = [0, 7, 8, 7];
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.5) {
                const currentIdx = rootIdx + cell[j % 4];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Dungeon Synth') {
        const rootIdx = vMinIdx;
        while (i < len) {
            if (Math.random() < density * 1.5) {
                const duration = 4;
                const currentIdx = rootIdx + (i % 8 === 0 ? 0 : 7);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Electroacoustic') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 0.4) {
                const currentIdx = rootIdx + (Math.random() < 0.5 ? -12 : 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Generative Drone') {
        const rootIdx = vMinIdx;
        while (i < len) {
            if (Math.random() < density * 2) {
                const duration = 8;
                const currentIdx = rootIdx + [0, 1, 2][Math.floor(Math.random() * 3)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Krautrock') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.8) {
                const currentIdx = rootIdx + (j % 2 === 0 ? 0 : 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Post-Rock') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.5) {
                const currentIdx = rootIdx + [0, 4, 7, 11][Math.floor(Math.random() * 4)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Shoegaze') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            if (j % 4 === 0 && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + [0, 5, 7][Math.floor(Math.random() * 3)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, isChord: true, duration: 4, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Spectral') {
        const rootIdx = vMinIdx;
        const overtones = [0, 12, 19, 24, 28, 31, 34, 36];
        for (let j = 0; j < len; j++) {
            if (Math.random() < density) {
                const currentIdx = rootIdx + overtones[j % overtones.length];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Hyperpop') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.4) {
                const currentIdx = rootIdx + (Math.random() < 0.5 ? 0 : Math.floor(Math.random() * 24));
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, ratchets: Math.random() < 0.2 ? 4 : 1, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Jersey Club') {
        const rootIdx = vMinIdx;
        const jersey = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0];
        for (let j = 0; j < len; j++) {
            if (jersey[j % 16] && Math.random() < density * 1.8) {
                const currentIdx = rootIdx + (j % 8 === 0 ? 0 : 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Phonk') {
        const rootIdx = vMinIdx;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.3) {
                const isCowbell = j % 4 !== 0;
                const currentIdx = rootIdx + (isCowbell ? 24 + (j % 3) : 0);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'R&B') {
        const rootIdx = Math.floor(validNotes.length / 2) - 7;
        while (i < len) {
            if (Math.random() < density) {
                const duration = [2, 4][Math.floor(Math.random() * 2)];
                const currentIdx = rootIdx + [0, 2, 4, 9][Math.floor(Math.random() * 4)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: i, active: true, duration, isChord: true, microTiming: 0.03, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                for (let j = 1; j < duration; j++) steps.push({ step: i + j, active: false });
                i += duration;
            } else { steps.push({ step: i, active: false }); i++; }
        }
    } else if (strategy === 'Synth-Pop') {
        const rootIdx = Math.floor(validNotes.length / 2) - 14;
        for (let j = 0; j < len; j++) {
            if (Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (j % 2 === 0 ? 0 : 12);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'UK Drill') {
        const rootIdx = Math.floor(validNotes.length / 2) - 14;
        for (let j = 0; j < len; j++) {
            const isSlide = j % 8 === 6 || j % 8 === 7;
            if (Math.random() < density * 1.2) {
                const currentIdx = rootIdx + (isSlide ? 12 : 0);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'UK Funky') {
        const rootIdx = Math.floor(validNotes.length / 2) - 12;
        const funky = [1, 0, 0, 1, 0, 0, 1, 0];
        for (let j = 0; j < len; j++) {
            if (funky[j % 8] && Math.random() < density * 1.5) {
                const currentIdx = rootIdx + (j % 8 === 0 ? 0 : 7);
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    } else if (strategy === 'Witch House') {
        const rootIdx = Math.floor(validNotes.length / 2) - 14;
        for (let j = 0; j < len; j++) {
            if (j % 2 === 0 && Math.random() < density * 1.4) {
                const currentIdx = rootIdx + [0, 1, 7][Math.floor(Math.random() * 3)];
                const sliceId = findBestSlice(currentIdx);
                steps.push({ step: j, active: true, isChord: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
            } else steps.push({ step: j, active: false });
        }
    }

    if (steps.length > len) {
        steps = steps.slice(0, len);
    } else while (steps.length < len) {
        steps.push({ step: steps.length, active: false });
    }

    if (isVerse) {
        steps.forEach(step => {
            if (step.active && step.isChord && Math.random() < 0.75) {
                step.isChord = false; // Thin out most chords to make Verse sound sparser
            }
        });
    } else {
        const baseRootIdx = Math.floor(validNotes.length / 2) - 12;
        const popDegrees = [0, 2, 4, 7, 9];
        const popProgressionOffsets = [0, 7, 5, 9];
        const catchyRhythm = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
        
        const sourceSteps = [...steps];
        let chorusMotif = [];
        for (let k = 0; k < 16; k++) {
            let srcStep = sourceSteps[k] || { active: false };
            let isActive = catchyRhythm[k] ? (Math.random() < density * 1.5) : (srcStep.active && Math.random() < 0.4);
            if (isActive) {
                let targetDegree = popDegrees[Math.floor(Math.random() * popDegrees.length)];
                let duration = srcStep.duration && srcStep.duration > 1 ? srcStep.duration : (Math.random() < 0.3 ? [2, 3, 4][Math.floor(Math.random() * 3)] : 1);
                chorusMotif[k] = { active: true, duration: duration, degree: targetDegree };
            } else {
                chorusMotif[k] = { active: false };
            }
        }
        if (!chorusMotif[0] || !chorusMotif[0].active) {
            chorusMotif[0] = { active: true, duration: Math.random() < 0.5 ? 2 : 1, degree: 0 };
        }
        
        let j = 0;
        while (j < len) {
            let mStep = chorusMotif[j % 16];
            let currentBar = Math.floor(j / 16) % popProgressionOffsets.length;
            let progressionShift = popProgressionOffsets[currentBar];
            
            if (mStep && mStep.active) {
                let isChord = (j % 8 === 0) || (j % 16 === 0);
                let currentIdx = baseRootIdx + (isChord ? progressionShift : mStep.degree);
                currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx));
                const sliceId = findBestSlice(currentIdx);
                
                let actualDuration = Math.min(mStep.duration || 1, len - j);
                steps[j] = {
                    step: j,
                    active: true,
                    duration: actualDuration,
                    isChord: isChord,
                    sliceId: sliceId,
                    melodicOffset: getOffset(currentIdx, sliceId)
                };
                for (let d = 1; d < actualDuration; d++) {
                    if (j + d < len) steps[j + d] = { step: j + d, active: false };
                }
                j += actualDuration;
            } else {
                steps[j] = { step: j, active: false };
                j++;
            }
        }
    }

    if (engine.moreLongNotes) {
        let sIdx = 0;
        while (sIdx < steps.length) {
            const currentStep = steps[sIdx];
            if (currentStep && currentStep.active) {
                if (Math.random() < 0.75) {
                    const candidateDurations = [2, 3, 4, 6];
                    const chosenDuration = candidateDurations[Math.floor(Math.random() * candidateDurations.length)];
                    const actualDuration = Math.min(chosenDuration, len - sIdx);
                    if (actualDuration > (currentStep.duration || 1)) {
                        currentStep.duration = actualDuration;
                        if (actualDuration >= 3 && Math.random() < 0.4) currentStep.isChord = true;
                        for (let k = 1; k < actualDuration; k++) {
                            if (sIdx + k < steps.length) {
                                steps[sIdx + k] = { step: sIdx + k, active: false };
                            }
                        }
                    }
                }
                sIdx += (currentStep.duration || 1);
            } else {
                sIdx++;
            }
        }
    }

    const newPat = {
        id: 'algo_' + Date.now(),
        name: strategy + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
        strategy: strategy,
        type: 'melodic',
        length: len,
        steps: steps,
        isCustom: true
    };
    
    let contrastSteps = [];
    for (let s = 0; s < len; s++) {
        const mainStep = steps[s] || { active: false };
        let cActive = !mainStep.active && (s % 2 !== 0 || Math.random() < 0.4);
        if (cActive) {
            let baseTarget = mainStep.sliceId !== undefined ? mainStep.sliceId : s;
            let compIdx = Math.max(0, Math.min(validNotes.length - 1, (baseTarget + 4) % validNotes.length));
            let cSliceId = findBestSlice(compIdx);
            contrastSteps.push({
                step: s,
                active: true,
                duration: 1,
                isChord: false,
                sliceId: cSliceId,
                melodicOffset: getOffset(compIdx, cSliceId)
            });
        } else {
            contrastSteps.push({ step: s, active: false });
        }
    }
    engine.contrastPattern = contrastSteps;

    SequencerPatterns.push(newPat);
    saveCustomPatterns();
    populatePatterns();
    patternSelect.value = newPat.id;
    engine.seqPattern = newPat;
    renderSequencerGrid();
    saveSettings();
}

// --- Audio Loading & Processing ---

async function loadAndProcessArrayBuffer(arrayBuffer) {
    try {
        await saveAudioToDB(arrayBuffer); // Save before decoding, which detaches the buffer
        showLoading('Decoding Audio', 'Analyzing waveform and transients...');
        await engine.loadAudio(arrayBuffer.slice(0)); 
        uploadOverlay.classList.add('hidden');
        workspace.classList.remove('hidden');
        waveformArea.classList.remove('hidden');
        engine.setMusicalConfig(keySelect.value, modeSelect.value, octaveSelect.value);
        // Delay to ensure workspace layout is computed
        await new Promise(resolve => setTimeout(resolve, 100));
        handleResize();
        await processAudio();

        // Auto-generate a random starting pattern to inspire the user immediately
        const algos = Object.keys(algoButtons);
        const randomAlgo = algos[Math.floor(Math.random() * algos.length)];
        generateAlgorithmicPattern(randomAlgo);
    } catch (err) {
        alert("Error decoding audio file. " + err.message);
    }
}

async function handleFileUpload(file) {
    if (filenameDisplay) filenameDisplay.textContent = file.name;
    showLoading('Reading File', `Loading ${file.name}...`);
    try {
        const arrayBuffer = await file.arrayBuffer();
        await loadAndProcessArrayBuffer(arrayBuffer);
    } catch (err) {
        alert("Error reading file: " + err.message);
    } finally {
        hideLoading();
    }
}

async function processAudio() {
    if (!engine.buffer) return;
    
    showLoading('Processing Slices', 'Identifying pitch and applying algorithms...');
    if (loadingTime) loadingTime.textContent = 'Starting...';
    if (loadingBar) loadingBar.style.width = '0%';
    if (loadingPercentage) loadingPercentage.textContent = '0%';
    
    // Use setTimeout to allow the browser to render the loading overlay before heavy processing
    await new Promise(resolve => setTimeout(resolve, 50));

    const startTime = Date.now();
    let totalProcessed = 0;
    const slicesCount = parseInt(targetSlicesSelect.value);
    // Rough estimate of total slices across all 6 algorithms
    const estimatedTotal = slicesCount * 6;

    engine.onProgress = (current, total) => {
        totalProcessed++;
        const progress = Math.min(100, (totalProcessed / estimatedTotal) * 100);
        if (loadingBar) loadingBar.style.width = `${progress}%`;
        if (loadingPercentage) loadingPercentage.textContent = `${Math.round(progress)}%`;
        
        if (totalProcessed > 5) {
            const elapsed = (Date.now() - startTime) / 1000;
            const timePerSlice = elapsed / totalProcessed;
            const remaining = Math.max(0, timePerSlice * (estimatedTotal - totalProcessed));
            if (loadingTime) loadingTime.textContent = `EST: ${remaining.toFixed(1)}s`;
        }
    };

    try {
        const algo = algoSelect.value;
        const slices = parseInt(targetSlicesSelect.value);

        await engine.processAllAlgorithms(slices);
        engine.setActiveAlgorithm(algo);

        renderPads();
        drawWaveform();

        updatePlayIcons();

        // 4. Global Key Detection
        const detection = PitchDetector.detectGlobalKey(engine.slices);
        if (detection) {
            autoKeyDisplay.style.display = 'block';
            const modeLabel = detection.mode === 'ionian' ? 'Major' : 'Minor';
            detectedKeyValue.textContent = `${detection.key} ${modeLabel}`;
            
            // Automatically update selects
            keySelect.value = detection.key;
            modeSelect.value = detection.mode;
            
            engine.setMusicalConfig(detection.key, detection.mode, octaveSelect.value);
        }

        if (loadingTime) loadingTime.textContent = 'Finalizing...';
        saveSettings();
        drawAdsrCurve();
        renderSequencerGrid();
    } finally {
        hideLoading();
    }
}

// --- UI Rendering ---

function renderSequencerGrid() {
    const patId = patternSelect.value;
    const pattern = SequencerPatterns.find(p => p.id == patId);
    if (!pattern) return;

    if (pattern.type === 'drum') {
        const totalPages = Math.ceil(pattern.length / 16);
        const maxPage = Math.max(0, totalPages - 1);
        if (currentDrumPage > maxPage) currentDrumPage = maxPage;
        
        if (drumPaginationWrapper) {
            drumPaginationWrapper.style.display = totalPages > 1 ? 'flex' : 'none';
            if (labelDrumPage) {
                labelDrumPage.textContent = `Page ${currentDrumPage + 1}/${totalPages}`;
            }
        }

        const startIndex = currentDrumPage * 16;
        const columns = Math.min(pattern.length - startIndex, 16);
        seqGrid.style.gridTemplateColumns = `120px repeat(${columns}, 1fr)`;
        seqGrid.innerHTML = '';

        const instruments = ['kick', 'snare', 'clap', 'chat', 'ohat', 'tom', 'perc', 'cymbal'];
        const labels = {
            kick: 'Kick', snare: 'Snare', clap: 'Clap', chat: 'Closed Hat',
            ohat: 'Open Hat', tom: 'Tom', perc: 'Perc', cymbal: 'Cymbal'
        };

        const stepsPerBeat = engine.stepsPerBeat || 4;
        let stepsPerBar = stepsPerBeat * 4;
        if (engine.currentMeter === '3/4') stepsPerBar = stepsPerBeat * 3;
        if (engine.currentMeter === '5/4') stepsPerBar = stepsPerBeat * 5;
        if (engine.currentMeter === '6/8') stepsPerBar = 6;
        if (engine.currentMeter === '7/4') stepsPerBar = stepsPerBeat * 7;

        pattern.drumTracks.forEach((track) => {
            const headerEl = document.createElement('div');
            headerEl.className = 'drum-track-header';
            headerEl.style.cssText = 'display:flex; flex-direction:column; justify-content:center; padding:0 8px; background:rgba(0,0,0,0.3); border-right:2px solid var(--border-color); border-bottom:1px solid rgba(255,255,255,0.05); font-size:0.75rem; font-weight:bold; color:var(--text-color); user-select:none;';
            const instLabel = document.createElement('div');
            instLabel.textContent = labels[track.instrument] || 'Unknown';
            headerEl.appendChild(instLabel);

            const sliceBadge = document.createElement('div');
            sliceBadge.style.cssText = 'font-size:0.55rem; color:var(--accent-primary); cursor:pointer;';
            sliceBadge.title = "Click to Audition Slice";
            sliceBadge.textContent = `Slice ${track.sliceId + 1}`;

            sliceBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                if (engine.slices && engine.slices[track.sliceId]) {
                    engine._createSource(track.sliceId, engine.ctx.currentTime, 1.0, engine.ctx, null, 0.4, engine.sampleLevel || 0.8, false);
                }
            });
            seqGrid.appendChild(headerEl);

            for (let c = 0; c < columns; c++) {
                const s = startIndex + c;
                const stepData = track.steps[s];
                const stepEl = document.createElement('div');
                stepEl.className = 'seq-step drum-step';
                stepEl.id = `drum-step-${track.instrument}-${s}`;
                stepEl.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                stepEl.style.minHeight = '36px';
                stepEl.style.cursor = 'pointer';
                stepEl.style.position = 'relative';

                const barIndex = Math.floor(s / stepsPerBar);
                if (barIndex % 2 === 1) stepEl.style.background = 'rgba(255, 255, 255, 0.04)';
                else stepEl.style.background = 'rgba(255, 255, 255, 0.01)';

                if (s % stepsPerBar === 0) stepEl.style.borderLeft = '2px solid rgba(255, 255, 255, 0.25)';
                else if (s % stepsPerBeat === 0) stepEl.style.borderLeft = '1px solid rgba(255, 255, 255, 0.1)';

                const applyActiveStyles = () => {
                    stepEl.classList.add('active');
                    if (track.instrument === 'kick') stepEl.style.borderColor = '#ef4444';
                    else if (track.instrument === 'snare' || track.instrument === 'clap') stepEl.style.borderColor = '#f59e0b';
                    else if (track.instrument === 'chat' || track.instrument === 'ohat') stepEl.style.borderColor = '#10b981';
                    else stepEl.style.borderColor = 'var(--accent-primary)';
                    
                    stepEl.textContent = '';
                    const numDiv = document.createElement('div');
                    numDiv.style.cssText = 'font-size:0.45rem; color:rgba(255,255,255,0.2); position:absolute; top:2px; left:2px; pointer-events:none;';
                    numDiv.textContent = s + 1;
                    stepEl.appendChild(numDiv);

                    if (stepData && stepData.ratchets && stepData.ratchets > 1) {
                        const badge = document.createElement('span');
                        badge.className = 'ratchet-badge';
                        badge.style.fontSize = '0.45rem';
                        badge.textContent = `x${stepData.ratchets}`;
                        stepEl.appendChild(badge);
                    }

                };

                if (stepData && stepData.active) {
                    applyActiveStyles();
                } else {
                    stepEl.textContent = '';
                    const numDiv = document.createElement('div');
                    numDiv.style.cssText = 'font-size:0.45rem; color:rgba(255,255,255,0.2); position:absolute; top:2px; left:2px; pointer-events:none;';
                    numDiv.textContent = s + 1;
                    stepEl.appendChild(numDiv);

                }

                if (engine.seqIsPlaying && engine.seqCurrentStep === s) {
                    stepEl.classList.add('playing');
                }

                stepEl.addEventListener('click', () => {
                    if (stepData) {
                        stepData.active = !stepData.active;
                        if (stepData.active) {
                            applyActiveStyles();
                        } else {
                            stepEl.classList.remove('active');
                            stepEl.style.borderColor = '';
                            stepEl.textContent = '';
                            const numDiv = document.createElement('div');
                            numDiv.style.cssText = 'font-size:0.45rem; color:rgba(255,255,255,0.2); position:absolute; top:2px; left:2px; pointer-events:none;';
                            numDiv.textContent = s + 1;
                            stepEl.appendChild(numDiv);

                        }
                        saveCustomPatterns();
                    }
                });

                seqGrid.appendChild(stepEl);
            }
        });
        return;
    }

    if (drumPaginationWrapper) {
        drumPaginationWrapper.style.display = 'none';
    }

    const columns = Math.min(pattern.length, 16);
    seqGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    seqGrid.innerHTML = '';

    const maskedPattern = engine.getMaskedPattern();

    for (let i = 0; i < pattern.length; i++) {
        const baseStepData = pattern.steps[i];
        const stepData = maskedPattern && maskedPattern.length > i ? maskedPattern[i] : baseStepData;
        const duration = stepData.duration || 1;

        const stepEl = document.createElement('div');
        stepEl.className = 'seq-step';
        stepEl.id = `seq-step-${i}`;

        // Visual grouping based on meter
        const stepsPerBeat = engine.stepsPerBeat || 4;
        let stepsPerBar = stepsPerBeat * 4;
        if (engine.currentMeter === '3/4') stepsPerBar = stepsPerBeat * 3;
        if (engine.currentMeter === '5/4') stepsPerBar = stepsPerBeat * 5;
        if (engine.currentMeter === '6/8') stepsPerBar = 6;
        if (engine.currentMeter === '7/4') stepsPerBar = stepsPerBeat * 7;
        
        const barIndex = Math.floor(i / stepsPerBar);
        const beatIndex = Math.floor(i / stepsPerBeat);
        
        // Alternating bar shading
        if (barIndex % 2 === 1) {
            stepEl.style.background = 'rgba(255, 255, 255, 0.04)';
        } else {
            stepEl.style.background = 'rgba(255, 255, 255, 0.01)';
        }

        // Delineate bars and beats with borders
        if (i % stepsPerBar === 0) {
            stepEl.style.borderLeft = '2px solid rgba(255, 255, 255, 0.25)';
        } else if (i % stepsPerBeat === 0) {
            stepEl.style.borderLeft = '1px solid rgba(255, 255, 255, 0.1)';
        }
        
        if (duration > 1) {
            stepEl.style.gridColumn = `span ${duration}`;
            if (stepData.isChord) stepEl.classList.add('chord');
        }

        // Preserve playing state if active
        if (engine.seqIsPlaying && engine.seqCurrentStep >= i && engine.seqCurrentStep < i + duration) {
            stepEl.classList.add('playing');
        }
        
        let sliceInfoStr = '';
        if (engine.slices && engine.slices.length > 0) {
            const sliceIdLookup = (stepData && stepData.sliceId !== undefined) ? stepData.sliceId : i;
            const sliceId = sliceIdLookup % engine.slices.length;
            const slice = engine.slices[sliceId];
            if (slice) {
                let noteName = (slice.pitch && slice.pitch.noteName) ? slice.pitch.noteName : '--';
                
                // If melodic pattern, calculate the actual transposed note name
                if (pattern.type === 'melodic' && stepData.melodicOffset !== undefined && slice.pitch.midi > 0) {
                    const validNotes = ScaleQuantizer.getValidMidiNotes(engine.musicalKey, engine.musicalMode, -1, 9);
                    
                    if (engine.tuneEnabled) {
                        const rootMidi = ScaleQuantizer.NOTES.indexOf(engine.musicalKey) + (engine.musicalOctave + 4) * 12;
                        let baseIdx = validNotes.indexOf(rootMidi);
                        if (baseIdx === -1) baseIdx = Math.floor(validNotes.length / 2);
                        
                        let targetIdx = Math.max(0, Math.min(validNotes.length - 1, baseIdx + stepData.melodicOffset));
                        let targetMidi = validNotes[targetIdx];
                        targetMidi = Math.max(24, Math.min(102, targetMidi));
                        noteName = PitchDetector.midiToNoteName(targetMidi);
                    } else {
                        const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, engine.musicalKey, engine.musicalMode);
                        let idx = validNotes.indexOf(closestMidi);
                        if (idx !== -1) {
                            idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                            const noteDegree = validNotes[idx] % 12;
                            let targetMidi = noteDegree + (engine.musicalOctave + 4) * 12;
                            targetMidi = Math.max(24, Math.min(102, targetMidi));
                            noteName = PitchDetector.midiToNoteName(targetMidi);
                        }
                    }
                }
                
                sliceInfoStr = `S${sliceId + 1} ${noteName}`;
            }
        }
        
        stepEl.textContent = '';
        const indexDiv = document.createElement('div');
        indexDiv.style.cssText = 'font-size: 0.75rem; font-weight: 600; margin-bottom: 2px; pointer-events: none;';
        indexDiv.textContent = i + 1;
        stepEl.appendChild(indexDiv);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'step-slice-info';
        infoDiv.draggable = true;
        infoDiv.style.cssText = 'font-size: 0.5rem; color: var(--accent-secondary); font-weight: bold; cursor: grab;';
        infoDiv.textContent = sliceInfoStr;
        stepEl.appendChild(infoDiv);

        stepEl.style.flexDirection = 'column';
        stepEl.style.alignItems = 'center';
        stepEl.style.justifyContent = 'center';
        
        // The pattern.steps is now a dense array, so index i maps exactly to the step
        
        if (stepData && stepData.active) {
            stepEl.classList.add('active');
            
            // Note Repeat (Ratchet) Indicator
            if (stepData.ratchets && stepData.ratchets > 1) {
                const badge = document.createElement('span');
                badge.className = 'ratchet-badge';
                badge.textContent = `x${stepData.ratchets}`;
                stepEl.appendChild(badge);
            }

            // Micro-Timing Indicator
            if (stepData.microTiming && stepData.microTiming > 0) {
                const dot = document.createElement('span');
                dot.className = 'micro-dot';
                dot.title = `Micro-timing: ${Math.round(stepData.microTiming * 1000)}ms`;
                stepEl.appendChild(dot);
            }
        }
        
        infoDiv.addEventListener('dragstart', (e) => {
            e.stopPropagation();
            if (engine.slices && engine.slices.length > 0) {
                const sliceIdLookup = (baseStepData && baseStepData.sliceId !== undefined) ? baseStepData.sliceId : i;
                const sliceId = sliceIdLookup % engine.slices.length;
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'slice', id: sliceId }));
                
                const dragDiv = document.createElement('div');
                dragDiv.textContent = `Slice ${sliceId + 1}`;
                dragDiv.style.cssText = "position:absolute; top:-1000px; padding:8px 12px; background:#6366f1; color:white; border-radius:6px;";
                document.body.appendChild(dragDiv);
                e.dataTransfer.setDragImage(dragDiv, 0, 0);
                setTimeout(() => document.body.removeChild(dragDiv), 0);
            }
        });

        const toggleStep = (activeState) => {
            baseStepData.active = activeState;
            if (activeState) {
                stepEl.classList.add('active');
                if (engine.slices && engine.slices.length > 0) {
                    const sliceId = baseStepData.sliceId !== undefined ? baseStepData.sliceId : i;
                    engine.playPad(sliceId % engine.slices.length);
                }
            } else {
                stepEl.classList.remove('active');
                const badge = stepEl.querySelector('.ratchet-badge');
                if (badge) badge.remove();
            }
        };

        stepEl.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('step-slice-info')) return;
            if (!baseStepData) return;
            isDraggingGrid = true;
            gridDragToggleState = !baseStepData.active;
            toggleStep(gridDragToggleState);
        });

        stepEl.addEventListener('mouseenter', () => {
            if (isDraggingGrid && baseStepData) {
                if (baseStepData.active !== gridDragToggleState) {
                    toggleStep(gridDragToggleState);
                }
            }
        });

        // Step Sequencer Drag and Drop
        stepEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            stepEl.classList.add('drag-over');
        });
        stepEl.addEventListener('dragleave', () => {
            stepEl.classList.remove('drag-over');
        });
        stepEl.addEventListener('drop', (e) => {
            e.preventDefault();
            stepEl.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                if (data.type === 'slice' && baseStepData) {
                    baseStepData.sliceId = data.id;
                    baseStepData.active = true;
                    engine.playPad(data.id);
                    renderSequencerGrid();
                    if (pattern.isCustom) saveCustomPatterns();
                }
            } catch(err) {}
        });

        seqGrid.appendChild(stepEl);
        
        if (duration > 1) {
            i += (duration - 1);
        }
    }
    
    // Update waveform highlights to reflect active sequencer steps
    if (typeof drawWaveform === 'function') {
        drawWaveform();
    }
    renderPads();
}

function renderPads() {
    padsContainer.textContent = '';
    keyMap = {};
    
    if (!engine.slices || engine.slices.length === 0) return;

    // Get unique sliceIds used in the current pattern
    const maskedPattern = engine.getMaskedPattern();
    const usedSliceIds = new Set();
    
    if (maskedPattern) {
        maskedPattern.forEach((step, idx) => {
            if (step.active) {
                const sliceIdLookup = step.sliceId !== undefined ? step.sliceId : idx;
                usedSliceIds.add(sliceIdLookup % engine.slices.length);
            }
        });
    }
    
    // Sort used slices by their ID
    const sortedUsedSliceIds = Array.from(usedSliceIds).sort((a, b) => a - b);
    
    // Rebuild padMapping to match the displayed pads
    engine.padMapping = sortedUsedSliceIds;

    sortedUsedSliceIds.forEach((sliceId, index) => {
        const slice = engine.slices[sliceId];
        if (!slice) return;

        const keyChar = index < KEYS.length ? KEYS[index] : '';
        if (keyChar) keyMap[keyChar] = index;

        const pad = document.createElement('div');
        pad.className = 'pad';
        pad.id = `pad-${index}`;
        if (selectedPadId === index) pad.style.borderColor = 'var(--accent-secondary)';
        
        const pitchText = slice.pitch ? slice.pitch.noteName : '--';

        pad.textContent = '';
        if (keyChar) {
            const keySpan = document.createElement('span');
            keySpan.className = 'pad-key';
            keySpan.textContent = keyChar;
            pad.appendChild(keySpan);
        }
        const pitchSpan = document.createElement('span');
        pitchSpan.className = 'pad-pitch';
        pitchSpan.textContent = pitchText;
        pad.appendChild(pitchSpan);

        const numSpan = document.createElement('span');
        numSpan.className = 'pad-number';
        numSpan.textContent = `S${sliceId + 1}`;
        pad.appendChild(numSpan);


        pad.addEventListener('mousedown', () => triggerPad(index));
        pad.addEventListener('mouseup', () => pad.classList.remove('active'));
        pad.addEventListener('mouseleave', () => pad.classList.remove('active'));

        // Drag and Drop for Pads
        pad.draggable = true;
        pad.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'slice', id: sliceId }));
            const dragDiv = document.createElement('div');
            dragDiv.textContent = `Slice ${sliceId + 1}`;
            dragDiv.style.cssText = "position:absolute; top:-1000px; padding:8px 12px; background:#6366f1; color:white; border-radius:6px;";
            document.body.appendChild(dragDiv);
            e.dataTransfer.setDragImage(dragDiv, 0, 0);
            setTimeout(() => document.body.removeChild(dragDiv), 0);
        });
        
        pad.addEventListener('dragover', (e) => {
            e.preventDefault();
            pad.classList.add('drag-over');
        });
        pad.addEventListener('dragleave', () => pad.classList.remove('drag-over'));
        pad.addEventListener('drop', (e) => {
            e.preventDefault();
            pad.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                if (data.type === 'slice') {
                    // Update the pad mapping for this index
                    engine.padMapping[index] = data.id;
                    // Find all steps that use the old sliceId at this position and update them?
                    // Actually, if we just update the mapping, we should probably update the pattern too
                    // if the user intended to replace this slice in the pattern.
                    // But for now, let's keep it simple: just update the pad.
                    renderPads();
                    engine.playPad(data.id);
                }
            } catch(err){}
        });

        padsContainer.appendChild(pad);
    });
}

function triggerPad(padIndex) {
    const pad = document.getElementById(`pad-${padIndex}`);
    if (pad) pad.classList.add('active');
    
    // Update selected pad UI
    const oldPad = document.getElementById(`pad-${selectedPadId}`);
    if (oldPad) oldPad.style.borderColor = '';
    selectedPadId = padIndex;
    if (pad) pad.style.borderColor = 'var(--accent-secondary)';

    const sliceId = engine.padMapping[padIndex];
    if (sliceId !== undefined) {
        engine.playPad(sliceId);
    }
    
    setTimeout(() => {
        if (pad) pad.classList.remove('active');
    }, 100);
}

function drawWaveform() {
    if (!engine.buffer) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = engine.buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = '#6366f1'; 
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }

    const duration = engine.buffer.duration;
    
    // Find active slices from masked pattern
    const activeSliceIds = new Set();
    const maskedPattern = engine.getMaskedPattern();
    if (maskedPattern) {
        maskedPattern.forEach((s, idx) => {
            if (s.active && engine.slices.length > 0) {
                const sliceIdLookup = s.sliceId !== undefined ? s.sliceId : idx;
                activeSliceIds.add(sliceIdLookup % engine.slices.length);
            }
        });
    }

    ctx.strokeStyle = '#10b981'; 
    ctx.lineWidth = 1;
    
    engine.slices.forEach((slice, index) => {
        const x = (slice.start / duration) * width;
        const endX = (slice.end / duration) * width;
        const sliceWidth = endX - x;
        
        if (activeSliceIds.has(slice.id)) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Faint green highlight
            ctx.fillRect(x, 0, sliceWidth, height);
        }

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Inter';
        ctx.fillText(index + 1, x + 4, 14);
    });
}

function flashWaveformSlice(sliceId, playDurationSeconds, playId) {
    if (!engine.buffer || !engine.slices[sliceId]) return;
    
    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;
    
    const slice = engine.slices[sliceId];
    const duration = engine.buffer.duration;
    
    const leftPercent = (slice.start / duration) * 100;
    const widthPercent = ((slice.end - slice.start) / duration) * 100;
    
    const flashEl = document.createElement('div');
    if (playId) flashEl.id = `flash-${playId}`;
    flashEl.style.position = 'absolute';
    flashEl.style.top = '0';
    flashEl.style.bottom = '0';
    flashEl.style.left = `${leftPercent}%`;
    flashEl.style.width = `${widthPercent}%`;
    flashEl.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
    flashEl.style.boxShadow = '0 0 10px rgba(255,255,255,0.6)';
    flashEl.style.zIndex = '5';
    flashEl.style.pointerEvents = 'none';
    
    canvasContainer.appendChild(flashEl);
    
    const playDurationMs = playDurationSeconds !== undefined ? playDurationSeconds * 1000 : (slice.end - slice.start) * 1000;
    
    // Fallback safety timeout in case onended fails
    setTimeout(() => {
        if (flashEl.parentNode) {
            flashEl.parentNode.removeChild(flashEl);
        }
    }, playDurationMs + 100);
}

function removeWaveformFlash(playId) {
    if (!playId) return;
    const flashEl = document.getElementById(`flash-${playId}`);
    if (flashEl && flashEl.parentNode) {
        flashEl.parentNode.removeChild(flashEl);
    }
}

// --- MIDI ---

function handleMidiNoteOn(note, velocity) {
    // 36 (C1) is usually bottom pad on MPC/Push
    const padOffset = note - 36;
    if (padOffset >= 0 && padOffset < 16) {
        // Trigger Pad mode
        triggerPad(padOffset);
    } else if (note > 60) {
        // Trigger Chromatic mode on selected pad
        const sliceId = engine.padMapping[selectedPadId];
        if (sliceId !== undefined) {
            engine.playPad(sliceId, note);
        }
    }
}

function handleMidiNoteOff(note) {
    // Not needed for one-shot drum hits
}

// --- Exporting ---

async function exportSequence(includeEffects = false) {
    if (!engine.buffer || engine.slices.length === 0) return;
    
    const patId = patternSelect.value;
    const pattern = SequencerPatterns.find(p => p.id == patId);
    
    const modeStr = includeEffects ? 'Wet' : 'Dry';
    showLoading(`Rendering WAV (${modeStr})`, 'Generating high-quality sequence export...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Temporarily set engine sequence config
    engine.seqPattern = pattern;
    engine.seqBpm = parseInt(bpmInput.value);

    try {
        const renderedBuffer = await engine.renderSequenceToBuffer(includeEffects);
        if (renderedBuffer) {
            const blob = WavEncoder.encode(renderedBuffer);
            downloadBlob(blob, `sequence-${pattern.name.replace(/\s+/g, '-').toLowerCase()}-${modeStr.toLowerCase()}.wav`);
        }
    } catch(err) {
        alert("Error rendering sequence: " + err);
    } finally {
        hideLoading();
    }
}

async function exportMidi() {
    if (!engine.buffer || engine.slices.length === 0) return;
    
    const patId = patternSelect.value;
    const pattern = SequencerPatterns.find(p => p.id == patId);
    
    showLoading('Generating MIDI', 'Creating standard MIDI file...');
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const blob = MidiExporter.generateMidiBlob(pattern, parseInt(bpmInput.value), engine.slices);
        if (blob) {
            downloadBlob(blob, `sequence-${pattern.name.replace(/\s+/g, '-').toLowerCase()}.mid`);
        }
    } catch(err) {
        alert("Error generating MIDI: " + err);
    } finally {
        hideLoading();
    }
}

async function exportMidiChords() {
    if (!engine.buffer || engine.slices.length === 0) return;
    
    const patId = patternSelect.value;
    const pattern = SequencerPatterns.find(p => p.id == patId);
    
    showLoading('Generating MIDI Chords', 'Creating complementary sustained chords...');
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const validNotes = ScaleQuantizer.getValidMidiNotes(engine.musicalKey, engine.musicalMode, 2, 4);
        const blob = MidiExporter.generateChordsMidiBlob(
            pattern, 
            parseInt(bpmInput.value), 
            engine.musicalKey, 
            engine.musicalMode,
            validNotes
        );
        if (blob) {
            downloadBlob(blob, `sequence-${pattern.name.replace(/\s+/g, '-').toLowerCase()}-chords.mid`);
        }
    } catch(err) {
        alert("Error generating MIDI chords: " + err);
    } finally {
        hideLoading();
    }
}

async function exportMidiDrum() {
    if (!engine.buffer || engine.slices.length === 0) return;
    
    const patId = patternSelect.value;
    const pattern = SequencerPatterns.find(p => p.id == patId);
    
    showLoading('Generating MIDI Drum Pattern', 'Creating multi-track GM Drum MIDI file...');
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const blob = MidiExporter.generateDrumMidiBlob(pattern, parseInt(bpmInput.value));
        if (blob) {
            downloadBlob(blob, `drum-pattern-${pattern.name.replace(/\s+/g, '-').toLowerCase()}.mid`);
        }
    } catch(err) {
        alert("Error generating MIDI Drum pattern: " + err);
    } finally {
        hideLoading();
    }
}


function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// --- Recording Logic ---

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.addEventListener('dataavailable', (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        });

        mediaRecorder.addEventListener('stop', async () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            const arrayBuffer = await blob.arrayBuffer();
            try {
                await saveAudioToDB(arrayBuffer);
                await engine.loadAudio(arrayBuffer.slice(0));
                uploadOverlay.classList.add('hidden');
                workspace.classList.remove('hidden');
                waveformArea.classList.remove('hidden');
                await new Promise(resolve => setTimeout(resolve, 100));
                handleResize();
                processAudio();
            } catch (err) {
                alert("Error loading recorded audio.");
            }
            stream.getTracks().forEach(track => track.stop());
        });

        mediaRecorder.start();
        isRecording = true;
        recordingOverlay.classList.remove('hidden');
        recordStartTime = Date.now();
        recordTimer = setInterval(updateRecordingTime, 1000);
        updateRecordingTime();

    } catch (err) {
        alert("Microphone access denied or unavailable.");
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        recordingOverlay.classList.add('hidden');
        clearInterval(recordTimer);
    }
}

function updateRecordingTime() {
    const diff = Math.floor((Date.now() - recordStartTime) / 1000);
    const mins = String(Math.floor(diff / 60)).padStart(2, '0');
    const secs = String(diff % 60).padStart(2, '0');
    recordingTime.textContent = `${mins}:${secs}`;
}

// --- Persistence ---
function saveSettings() {
    const settings = {
        algo: algoSelect.value,
        slices: targetSlicesSelect.value,
        key: keySelect.value,
        mode: modeSelect.value,
        octave: octaveSelect.value,
        choke: globalChokeCheckbox.checked,
        adsrA: adsrA.value,
        adsrD: adsrD.value,
        adsrS: adsrS.value,
        adsrR: adsrR.value,
        pattern: patternSelect.value,
        bpm: bpmInput.value,
        density: seqDensity.value,
        syncopation: seqSyncopation.value,
        noteRepeat: seqNoteRepeat.value,
        microTiming: seqMicroTiming.value,
        probability: seqProbability.value,
        swing: seqSwing.value,
        kick: kickDrum.checked,
        kickLevel: kickLevel.value,
        sampleLevel: sampleLevelSlider.value,
        toneLevel: toneLevelSlider.value,
        chords: chordsCheck.checked,
        part: partToggle ? (partToggle.checked ? 'verse' : 'chorus') : 'chorus',
        reverb: fxReverb.value,
        delay: fxDelay.value,
        distort: fxDistort.value,
        smartComp: fxSmartComp ? fxSmartComp.checked : false,
        eqLow: fxEqLow.value,
        eqMid: fxEqMid.value,
        eqHigh: fxEqHigh.value,
        autoBpm: autoBpmEnabled,
        timbre: timbreSelect ? timbreSelect.value : 'pure-sine',
        autoTimbre: autoTimbreEnabled,
        moreLongNotes: moreLongNotesCheck ? moreLongNotesCheck.checked : false,
        contrast: contrastCheck ? contrastCheck.checked : false,
        tune: tuneCheck ? tuneCheck.checked : false,
        sliceAssignMode: engine.sliceAssignMode || 'fit',
        sequencerMode: engine.sequencerMode || 'melody'
    };
    localStorage.setItem('splinchedSettings', JSON.stringify(settings));
}

function loadCustomPatterns() {
    const data = localStorage.getItem('splinchedCustomPatterns');
    if (data) {
        try {
            const arr = JSON.parse(data);
            if (Array.isArray(arr)) {
                arr.forEach(p => {
                    // Basic validation for pattern object
                    if (p && typeof p === 'object' && p.id && p.name) {
                        // Ensure name and id are strings
                        p.id = String(p.id);
                        p.name = String(p.name).substring(0, 100);
                        p.isCustom = true;
                        SequencerPatterns.push(p);
                    }
                });
            }
        } catch(e) {
            console.warn("Failed to load custom patterns", e);
        }
    }
}

function saveCustomPatterns() {
    const custom = SequencerPatterns.filter(p => p.isCustom);
    localStorage.setItem('splinchedCustomPatterns', JSON.stringify(custom));
}

function loadSettings() {
    const data = localStorage.getItem('splinchedSettings');
    if (data) {
        try {
            const settings = JSON.parse(data);
            if (!settings || typeof settings !== 'object') return;
            algoSelect.value = settings.algo || 'transient';
            targetSlicesSelect.value = settings.slices || '32';
            keySelect.value = settings.key || 'A';
            modeSelect.value = settings.mode || 'aeolian';
            octaveSelect.value = settings.octave !== undefined ? settings.octave : '0';
            globalChokeCheckbox.checked = !!settings.choke;
            
            adsrA.value = settings.adsrA !== undefined ? settings.adsrA : fromLog(20);
            adsrD.value = settings.adsrD !== undefined ? settings.adsrD : fromLog(150);
            adsrS.value = settings.adsrS !== undefined ? settings.adsrS : fromLog(0);
            adsrR.value = settings.adsrR !== undefined ? settings.adsrR : fromLog(80);
            
            patternSelect.value = settings.pattern || '0';
            bpmInput.value = settings.bpm || '120';
            
            seqDensity.value = settings.density !== undefined ? settings.density : '50';
            seqSyncopation.value = settings.syncopation !== undefined ? settings.syncopation : '39';
            seqNoteRepeat.value = settings.noteRepeat !== undefined ? fromLogPercent(settings.noteRepeat) : '39';
            if (settings.microTiming !== undefined) seqMicroTiming.value = fromLogPercent(settings.microTiming);
            if (settings.probability !== undefined) seqProbability.value = fromLogPercent(settings.probability);
            if (settings.swing !== undefined) seqSwing.value = fromLogPercent(settings.swing);
            if (settings.kick !== undefined) kickDrum.checked = settings.kick;
            if (settings.kickLevel !== undefined) kickLevel.value = fromLogPercent(settings.kickLevel);
            else kickLevel.value = fromLogPercent(0.15);

            if (settings.sampleLevel !== undefined) sampleLevelSlider.value = settings.sampleLevel;
            else sampleLevelSlider.value = fromLogPercent(1.0);

            if (settings.toneLevel !== undefined) toneLevelSlider.value = settings.toneLevel;
            else toneLevelSlider.value = fromLogPercent(0.04);

            if (settings.chords !== undefined) chordsCheck.checked = settings.chords;
            else chordsCheck.checked = false;

            if (moreLongNotesCheck) {
                moreLongNotesCheck.checked = !!settings.moreLongNotes;
            }
            if (contrastCheck) {
                contrastCheck.checked = !!settings.contrast;
            }
            
            // Sync engine state
            engine.sampleLevel = toLogPercent(parseInt(sampleLevelSlider.value));
            engine.toneLevel = toLogPercent(parseInt(toneLevelSlider.value));
            engine.chordsEnabled = chordsCheck.checked;
            engine.moreLongNotes = moreLongNotesCheck ? moreLongNotesCheck.checked : false;
            engine.contrastEnabled = contrastCheck ? contrastCheck.checked : false;
            if (tuneCheck) {
                tuneCheck.checked = !!settings.tune;
                engine.tuneEnabled = tuneCheck.checked;
            }
            engine.sliceAssignMode = settings.sliceAssignMode || 'fit';
            if (seqSliceAssignToggle) {
                const isSeq = engine.sliceAssignMode === 'sequential';
                seqSliceAssignToggle.checked = isSeq;
                if (labelFit && labelSeq) {
                    labelFit.className = isSeq ? 'toggle-label' : 'toggle-label active-primary';
                    labelSeq.className = isSeq ? 'toggle-label active-secondary' : 'toggle-label';
                    labelFit.style.color = isSeq ? 'var(--text-muted)' : '';
                    labelSeq.style.color = isSeq ? '' : 'var(--text-muted)';
                }
            }
            engine.sequencerMode = settings.sequencerMode || 'melody';
            if (seqModeToggle) {
                const isDrum = engine.sequencerMode === 'drum';
                seqModeToggle.checked = isDrum;
                if (labelModeMel && labelModeDrum) {
                    labelModeMel.className = isDrum ? 'toggle-label' : 'toggle-label active-primary';
                    labelModeDrum.className = isDrum ? 'toggle-label active-secondary' : 'toggle-label';
                    labelModeMel.style.color = isDrum ? 'var(--text-muted)' : '';
                    labelModeDrum.style.color = isDrum ? '' : 'var(--text-muted)';
                }
            }
            if (partToggle) {
                partToggle.checked = (settings.part === 'verse');
                engine.songPart = settings.part || 'chorus';
                if (labelChorus && labelVerse) {
                    labelChorus.className = partToggle.checked ? 'toggle-label' : 'toggle-label active-primary';
                    labelVerse.className = partToggle.checked ? 'toggle-label active-secondary' : 'toggle-label';
                    labelChorus.style.color = partToggle.checked ? 'var(--text-muted)' : '';
                    labelVerse.style.color = partToggle.checked ? '' : 'var(--text-muted)';
                }
            }

            // Load FX values
            if (settings.reverb !== undefined) fxReverb.value = settings.reverb;
            if (settings.delay !== undefined) {
                fxDelay.value = settings.delay <= 1.0 ? 250 : settings.delay;
            } else {
                fxDelay.value = 250;
            }
            if (settings.distort !== undefined) fxDistort.value = settings.distort;
            if (settings.smartComp !== undefined && fxSmartComp) fxSmartComp.checked = settings.smartComp;
            if (settings.eqLow !== undefined) fxEqLow.value = settings.eqLow;
            if (settings.eqMid !== undefined) fxEqMid.value = settings.eqMid;
            if (settings.eqHigh !== undefined) fxEqHigh.value = settings.eqHigh;
            
            if (settings.autoBpm !== undefined) {
                autoBpmEnabled = settings.autoBpm;
                autoBpmBtn.classList.toggle('btn-auto-bpm-active', autoBpmEnabled);
            } else {
                autoBpmEnabled = true;
                autoBpmBtn.classList.add('btn-auto-bpm-active');
            }

            if (settings.timbre !== undefined && timbreSelect) {
                timbreSelect.value = settings.timbre;
                engine.activeTimbre = settings.timbre;
            } else {
                if (timbreSelect) timbreSelect.value = 'pure-sine';
                engine.activeTimbre = 'pure-sine';
            }

            if (settings.autoTimbre !== undefined && btnAutoTimbre) {
                autoTimbreEnabled = settings.autoTimbre;
                btnAutoTimbre.classList.toggle('btn-auto-bpm-active', autoTimbreEnabled);
            } else if (btnAutoTimbre) {
                autoTimbreEnabled = true;
                btnAutoTimbre.classList.add('btn-auto-bpm-active');
            }
            
            // Dispatch events to update UI text visually
            const e = new Event('input');
            adsrA.dispatchEvent(e);
            adsrD.dispatchEvent(e);
            adsrS.dispatchEvent(e);
            adsrR.dispatchEvent(e);
            seqDensity.dispatchEvent(e);
            seqSyncopation.dispatchEvent(e);
            seqNoteRepeat.dispatchEvent(e);
            seqMicroTiming.dispatchEvent(e);
            seqProbability.dispatchEvent(e);
            fxReverb.dispatchEvent(e);
            fxDelay.dispatchEvent(e);
            fxDistort.dispatchEvent(e);
            if (fxSmartComp) {
                engine.updateEffects({ smartCompEnabled: fxSmartComp.checked });
            }
            fxEqLow.dispatchEvent(e);
            fxEqMid.dispatchEvent(e);
            fxEqHigh.dispatchEvent(e);
            // Update UI styles after loading
            Object.keys(SLIDER_DEFAULTS).forEach(id => {
                const el = document.getElementById(id);
                if (el) updateSliderUI(el);
            });
            
            engine.setMusicalConfig(keySelect.value, modeSelect.value, octaveSelect.value);
            engine.globalChoke = globalChokeCheckbox.checked;
            engine.kickEnabled = kickDrum.checked;
            engine.sampleLevel = toLogPercent(parseInt(sampleLevelSlider.value));
            engine.toneLevel = toLogPercent(parseInt(toneLevelSlider.value));
            engine.seqPattern = SequencerPatterns.find(p => p.id == patternSelect.value);
        } catch(e) {}
    } else {
        // Apply fresh defaults
        adsrA.value = SLIDER_DEFAULTS['adsr-a'];
        adsrD.value = SLIDER_DEFAULTS['adsr-d'];
        adsrS.value = SLIDER_DEFAULTS['adsr-s'];
        adsrR.value = SLIDER_DEFAULTS['adsr-r'];
        seqDensity.value = SLIDER_DEFAULTS['seq-density'];
        seqSyncopation.value = SLIDER_DEFAULTS['seq-syncopation'];
        seqNoteRepeat.value = SLIDER_DEFAULTS['seq-note-repeat'];
        seqMicroTiming.value = SLIDER_DEFAULTS['seq-micro-timing'];
        seqProbability.value = SLIDER_DEFAULTS['seq-probability'];
        seqSwing.value = SLIDER_DEFAULTS['seq-swing'];
        kickLevel.value = SLIDER_DEFAULTS['kick-level'];
        
        // Dispatch events and update UI
        Object.keys(SLIDER_DEFAULTS).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.dispatchEvent(new Event('input'));
                updateSliderUI(el);
            }
        });
        drawAdsrCurve();
        engine.seqPattern = SequencerPatterns.find(p => p.id == patternSelect.value);
    }
}

// Simple IndexedDB wrapper for audio
const DB_VERSION = 2;

function saveAudioToDB(arrayBuffer) {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('SplinchedDB', DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('audio')) {
                db.createObjectStore('audio');
            }
        };
        req.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('audio')) return resolve();
            try {
                const tx = db.transaction('audio', 'readwrite');
                const store = tx.objectStore('audio');
                const putReq = store.put(arrayBuffer, 'currentUpload');
                putReq.onsuccess = () => resolve();
                putReq.onerror = (err) => reject(err);
            } catch(err) {
                resolve();
            }
        };
        req.onerror = (err) => reject(err);
    });
}

function loadAudioFromDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('SplinchedDB', DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
        };
        req.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('audio')) return resolve(null);
            try {
                const tx = db.transaction('audio', 'readonly');
                const store = tx.objectStore('audio');
                const getReq = store.get('currentUpload');
                getReq.onsuccess = () => resolve(getReq.result);
                getReq.onerror = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        };
        req.onerror = () => resolve(null);
    });
}

// --- Effects Listeners ---
if (btnFxToggle) {
    btnFxToggle.addEventListener('click', () => {
        engine.fxEnabled = !engine.fxEnabled;
        btnFxToggle.classList.toggle('active', engine.fxEnabled);
        fxStrip.style.opacity = engine.fxEnabled ? '1' : '0.5';
        btnFxToggle.style.background = engine.fxEnabled ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)';
    });
}
if (fxReverb) {
    fxReverb.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (val < 0.05) { val = 0; e.target.value = 0; }
        engine.updateEffects({ reverb: val });
        valReverb.textContent = Math.round(val * 100) + '%';
        e.target.classList.toggle('is-default', val === 0);
    });
}
if (fxDelay) {
    fxDelay.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        engine.updateEffects({ delay: val });
        valDelay.textContent = val + 'ms';
        e.target.classList.toggle('is-default', val === 250);
    });
}
if (fxDistort) {
    fxDistort.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (val < 0.05) { val = 0; e.target.value = 0; }
        engine.updateEffects({ distort: val });
        valDistort.textContent = Math.round(val * 100) + '%';
        e.target.classList.toggle('is-default', val === 0);
    });
}

if (fxSmartComp) {
    fxSmartComp.addEventListener('change', (e) => {
        engine.updateEffects({ smartCompEnabled: e.target.checked });
        saveSettings();
    });
}
if (fxEqLow) {
    fxEqLow.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (Math.abs(val) < 1.5) { val = 0; e.target.value = 0; }
        engine.updateEffects({ eqLow: val });
        valEqLow.textContent = val + 'dB';
        e.target.classList.toggle('is-default', val === 0);
    });
}
if (fxEqMid) {
    fxEqMid.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (Math.abs(val) < 1.5) { val = 0; e.target.value = 0; }
        engine.updateEffects({ eqMid: val });
        valEqMid.textContent = val + 'dB';
        e.target.classList.toggle('is-default', val === 0);
    });
}
if (fxEqHigh) {
    fxEqHigh.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if (Math.abs(val) < 1.5) { val = 0; e.target.value = 0; }
        engine.updateEffects({ eqHigh: val });
        valEqHigh.textContent = val + 'dB';
        e.target.classList.toggle('is-default', val === 0);
    });
}

// Bootstrap
init();
