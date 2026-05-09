/**
 * app.js
 * Main UI logic and event bindings for Sample Chopper V4.
 */

const engine = new AudioEngine();

// DOM Elements
const workspace = document.getElementById('workspace');
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
const btnPlayAll = document.getElementById('btn-play-all');
const btnStopAll = document.getElementById('btn-stop-all');

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

const btnRandRhythmic = document.getElementById('btn-rand-rhythmic');
const btnRandMelodic = document.getElementById('btn-rand-melodic');
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
    'Pendulum': document.getElementById('btn-algo-pedalum')
};
const btnRerollSlices = document.getElementById('btn-reroll-slices');
const btnSavePattern = document.getElementById('btn-save-pattern');
const eucSteps = document.getElementById('euclidean-steps');
const eucPulses = document.getElementById('euclidean-pulses');
const btnGenEuc = document.getElementById('btn-generate-euclidean');
const kickLevel = document.getElementById('kick-level');
const valKick = document.getElementById('val-kick');

const btnSeqPlay = document.getElementById('btn-seq-play');
const btnSeqStop = document.getElementById('btn-seq-stop');
const seqGrid = document.getElementById('seq-grid');

const btnExportSeq = document.getElementById('btn-export-seq');
const btnExportZip = document.getElementById('btn-export-zip');
const filenameDisplay = document.getElementById('filename-display');
const midiStatus = document.getElementById('midi-status');
const autoKeyDisplay = document.getElementById('auto-key-display');
const detectedKeyValue = document.getElementById('detected-key-value');

const fxStrip = document.getElementById('effects-strip');
const btnFxToggle = document.getElementById('btn-fx-toggle');
const fxReverb = document.getElementById('fx-reverb');
const fxDelay = document.getElementById('fx-delay');
const fxDistort = document.getElementById('fx-distort');
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
const seqToneOnly = document.getElementById('seq-tone-only');
const algoLenSelect = document.getElementById('algo-len');

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
    'seq-syncopation': 0,
    'seq-note-repeat': 0,
    'seq-micro-timing': 0,
    'seq-probability': 100,
    'seq-swing': 0,
    'kick-level': fromLogPercent(0.3),
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
            return;
        }
        
        const percent = currentBufferTime / totalDur;
        playheadEl.style.left = `${percent * 100}%`;
        playheadAnimId = requestAnimationFrame(anim);
    }
    
    if (playheadAnimId) cancelAnimationFrame(playheadAnimId);
    anim();
}

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
    localStorage.clear();
    indexedDB.deleteDatabase('SplinchedDB');
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
            processAudio();
        } catch(e) {
            console.error("Error loading saved audio", e);
        } finally {
            hideLoading();
        }
    }



    // Sync audio engine sequencer with UI grid
    engine.onStepPlay = (stepNumber) => {
        document.querySelectorAll('.seq-step').forEach(el => el.classList.remove('playing'));
        const stepEl = document.getElementById(`seq-step-${stepNumber}`);
        if (stepEl) stepEl.classList.add('playing');
    };
}

function populatePatterns(preserveSelection = false) {
    const prevValue = patternSelect.value;
    patternSelect.innerHTML = '';
    
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
        } else if (pat.type === 'rhythmic') {
            rhythmicGroup.appendChild(opt);
        } else {
            melodicGroup.appendChild(opt);
        }
    });

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
                    midiStatus.innerHTML = '<i class="fas fa-plug"></i> MIDI Connected';
                } else {
                    midiStatus.classList.remove('connected');
                    midiStatus.title = "MIDI Device Disconnected";
                    midiStatus.innerHTML = '<i class="fas fa-plug"></i> Connect MIDI';
                }
            }
        );
    });
    // Upload & Drag Drop
    audioUploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
    });
    document.addEventListener('dragover', (e) => { e.preventDefault(); uploadOverlay.classList.add('drag-over'); });
    document.addEventListener('dragleave', (e) => { e.preventDefault(); uploadOverlay.classList.remove('drag-over'); });
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadOverlay.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
    });

    // Recording
    btnRecord.addEventListener('click', startRecording);
    btnStopRecord.addEventListener('click', stopRecording);

    // Playback
    let mainPlaybackSource = null;

    btnPlayAll.addEventListener('click', () => {
        if(engine.ctx.state === 'suspended') engine.ctx.resume();
        if (mainPlaybackSource) {
            try { mainPlaybackSource.stop(); } catch(e) {}
        }
        mainPlaybackSource = engine.ctx.createBufferSource();
        mainPlaybackSource.buffer = engine.buffer;
        mainPlaybackSource.connect(engine.globalGain);
        mainPlaybackSource.start(0);
        animatePlayhead(engine.ctx.currentTime, engine.buffer.duration, 0, 1.0);
    });
    btnStopAll.addEventListener('click', () => {
        engine.stopSequencer();
        engine.stopAllNodes();
        if (mainPlaybackSource) {
            try { mainPlaybackSource.stop(); } catch(e) {}
            mainPlaybackSource = null;
        }
        if (playheadAnimId) { cancelAnimationFrame(playheadAnimId); playheadAnimId = null; }
        if (playheadEl) playheadEl.style.display = 'none';
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
    seqToneOnly.addEventListener('change', (e) => {
        engine.toneOnly = e.target.checked;
        saveSettings();
    });

    btnRandRhythmic.addEventListener('click', () => {
        const rhythmics = SequencerPatterns.filter(p => p.type === 'rhythmic');
        if (rhythmics.length === 0) return;
        const rand = rhythmics[Math.floor(Math.random() * rhythmics.length)];
        patternSelect.value = rand.id;
        patternSelect.dispatchEvent(new Event('change'));
    });
    
    btnRandMelodic.addEventListener('click', () => {
        const melodics = SequencerPatterns.filter(p => p.type === 'melodic');
        if (melodics.length === 0) return;
        const rand = melodics[Math.floor(Math.random() * melodics.length)];
        patternSelect.value = rand.id;
        patternSelect.dispatchEvent(new Event('change'));
    });

    Object.keys(algoButtons).forEach(strategy => {
        algoButtons[strategy].addEventListener('click', () => generateAlgorithmicPattern(strategy));
    });

    function generateAlgorithmicPattern(strategy) {
        if (!engine.buffer || engine.slices.length === 0) return;
        
        const len = parseInt(algoLenSelect.value) || 32;
        const validNotes = ScaleQuantizer.getValidMidiNotes(engine.musicalKey, engine.musicalMode);
        
        let steps = [];
        const density = engine.seqDensity || 0.5;

        // Helper to find the slice closest to a target scale index
        const findBestSlice = (targetIdx) => {
            const targetMidi = validNotes[targetIdx];
            let bestSliceId = 0;
            let minDiff = Infinity;
            
            engine.slices.forEach((slice, idx) => {
                if (slice.pitch && slice.pitch.midi > 0) {
                    const diff = Math.abs(slice.pitch.midi - targetMidi);
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestSliceId = idx;
                    }
                }
            });
            return bestSliceId;
        };

        // Helper to get melodic offset for a given currentIdx and slice
        const getOffset = (currentIdx, sliceId) => {
            const slice = engine.slices[sliceId];
            if (slice && slice.pitch && slice.pitch.midi > 0) {
                const sliceBaseMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, engine.musicalKey, engine.musicalMode);
                const sliceBaseIdx = validNotes.indexOf(sliceBaseMidi);
                if (sliceBaseIdx !== -1) return currentIdx - sliceBaseIdx;
            }
            return 0;
        };

        if (strategy === 'Brownian') {
            let currentIdx = Math.floor(validNotes.length / 2) - 7; 
            let lastLeap = 0; 
            for (let i = 0; i < len; i++) {
                if (Math.random() < density) {
                    let interval = (Math.abs(lastLeap) >= 3) ? (lastLeap > 0 ? -1 - Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 2)) : (Math.random() < 0.6 ? Math.floor(Math.random() * 5) - 2 : (Math.random() > 0.5 ? 3 : -3));
                    if (Math.abs(interval) >= 3) lastLeap = interval; else lastLeap = 0;
                    currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx + interval));
                    const center = Math.floor(validNotes.length / 2) - 7;
                    if (Math.abs(currentIdx - center) > 7 && Math.random() > 0.7) currentIdx += (currentIdx > center ? -2 : 2);
                    
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Intervallic') {
            let currentIdx = Math.floor(validNotes.length / 2) - 7;
            for (let i = 0; i < len; i++) {
                if (Math.random() < density) {
                    const scaleJump = [1, 2, 4, 7][Math.floor(Math.random() * 4)] * (Math.random() > 0.5 ? 1 : -1);
                    currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx + scaleJump));
                    
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Euclidean') {
            const pulses = Math.max(1, Math.floor(len * density));
            const rhythmicPattern = SequencerPatterns.generateEuclidean(len, pulses).steps;
            const arpeggio = [0, 2, 4, 7, 9, 12]; 
            let arpIdx = 0;
            const rootIdx = Math.floor(validNotes.length / 2) - 14;
            for (let i = 0; i < len; i++) {
                if (rhythmicPattern[i].active) {
                    const currentIdx = rootIdx + arpeggio[arpIdx % arpeggio.length];
                    arpIdx++;
                    
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Harmonic') {
            const chordTones = [0, 2, 4]; 
            const rootIdx = Math.floor(validNotes.length / 2) - 14;
            for (let i = 0; i < len; i++) {
                const isPulse = (i % 8 === 0 || i % 8 === 3 || i % 8 === 6);
                if (isPulse && (Math.random() < density * 1.5)) {
                    const currentIdx = rootIdx + chordTones[Math.floor(Math.random() * chordTones.length)] + (Math.floor(i / 8) * 2);
                    
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Markov') {
            let currentIdx = Math.floor(validNotes.length / 2) - 7;
            let lastDir = 1;
            for (let i = 0; i < len; i++) {
                if (Math.random() < density) {
                    const stayDir = Math.random() < 0.7;
                    const dir = stayDir ? lastDir : -lastDir;
                    const amount = [1, 1, 2, 3][Math.floor(Math.random() * 4)];
                    currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx + (dir * amount)));
                    lastDir = dir;
                    
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Stochastic') {
            for (let i = 0; i < len; i++) {
                if (Math.random() < density * 1.2) {
                    const currentIdx = Math.floor(Math.random() * validNotes.length);
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Mirror') {
            let halfSteps = [];
            let currentIdx = Math.floor(validNotes.length / 2) - 7;
            for (let i = 0; i < len / 2; i++) {
                if (Math.random() < density) {
                    currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx + Math.floor(Math.random() * 5) - 2));
                    halfSteps.push({ active: true, idx: currentIdx });
                } else halfSteps.push({ active: false });
            }
            for (let i = 0; i < len; i++) {
                const isSecondHalf = i >= len / 2;
                const source = isSecondHalf ? halfSteps[len - 1 - i] : halfSteps[i];
                if (source.active) {
                    const sliceId = findBestSlice(source.idx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(source.idx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Pedal') {
            const rootIdx = Math.floor(validNotes.length / 2) - 14;
            let currentIdx = rootIdx + 7;
            for (let i = 0; i < len; i++) {
                const isPedal = i % 2 === 0;
                if (Math.random() < density * 1.2) {
                    const targetIdx = isPedal ? rootIdx : (currentIdx = Math.max(0, Math.min(validNotes.length - 1, currentIdx + Math.floor(Math.random() * 3) - 1)));
                    const sliceId = findBestSlice(targetIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(targetIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Bitwise') {
            const rootIdx = Math.floor(validNotes.length / 2) - 14;
            for (let i = 0; i < len; i++) {
                const isActive = ((i & (i >> 2)) % 3 === 0) && (Math.random() < density * 1.5);
                if (isActive) {
                    const currentIdx = rootIdx + ((i ^ (i >> 3)) % 12);
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Cellular') {
            const rootIdx = Math.floor(validNotes.length / 2) - 14;
            let row = new Array(len).fill(0);
            row[Math.floor(len / 2)] = 1;
            const nextRow = (r) => {
                let nr = new Array(len).fill(0);
                for (let j = 0; j < len; j++) {
                    const left = r[(j - 1 + len) % len];
                    const self = r[j];
                    const right = r[(j + 1) % len];
                    const rule = (left << 2) | (self << 1) | right;
                    if ([1, 2, 3, 4].includes(rule)) nr[j] = 1; // Simplified Rule 30-ish
                }
                return nr;
            };
            for (let i = 0; i < len; i++) {
                if (row[i] && Math.random() < density * 1.2) {
                    const currentIdx = rootIdx + (i % 14);
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
                row = nextRow(row);
            }
        } else if (strategy === 'Fibonacci') {
            const rootIdx = Math.floor(validNotes.length / 2) - 7;
            let a = 1, b = 1;
            for (let i = 0; i < len; i++) {
                const isActive = Math.random() < density;
                if (isActive) {
                    const currentIdx = rootIdx + (b % 12);
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
                let temp = a + b; a = b; b = temp;
            }
        } else if (strategy === 'Anchor') {
            const rootIdx = Math.floor(validNotes.length / 2) - 14;
            for (let i = 0; i < len; i++) {
                if (Math.random() < density) {
                    const currentIdx = rootIdx + (Math.random() < 0.8 ? 0 : (Math.random() < 0.5 ? 7 : 12));
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        } else if (strategy === 'Acid') {
            const rootIdx = Math.floor(validNotes.length / 2) - 14;
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
            const rootIdx = Math.floor(validNotes.length / 2) - 14;
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
        } else if (strategy === 'Pendulum') {
            const rootIdx = Math.floor(validNotes.length / 2) - 7;
            for (let i = 0; i < len; i++) {
                if (Math.random() < density) {
                    const currentIdx = rootIdx + Math.round(Math.sin(i * 0.5) * 7);
                    const sliceId = findBestSlice(currentIdx);
                    steps.push({ step: i, active: true, sliceId, melodicOffset: getOffset(currentIdx, sliceId) });
                } else steps.push({ step: i, active: false });
            }
        }
        
        const newPat = {
            id: 'algo_' + Date.now(),
            name: strategy + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}),
            type: 'melodic',
            length: len,
            steps: steps,
            isCustom: true
        };
        
        SequencerPatterns.push(newPat);
        saveCustomPatterns();
        populatePatterns();
        patternSelect.value = newPat.id;
        engine.seqPattern = newPat;
        renderSequencerGrid();
        saveSettings();
    }

    btnRerollSlices.addEventListener('click', () => {
        const pat = SequencerPatterns.find(p => p.id == patternSelect.value);
        if (!pat) return;
        pat.steps.forEach(s => {
            s.sliceId = Math.floor(Math.random() * 256);
        });
        if (pat.isCustom) saveCustomPatterns();
        
        renderSequencerGrid();
        
        document.querySelectorAll('.seq-step').forEach((el, index) => {
            const stepData = pat.steps[index];
            if (stepData && stepData.active) {
                el.classList.add('rolled');
                setTimeout(() => el.classList.remove('rolled'), 400);
            }
        });
    });

    btnGenEuc.addEventListener('click', () => {
        const steps = parseInt(eucSteps.value);
        const pulses = parseInt(eucPulses.value);
        const newPat = SequencerPatterns.generateEuclidean(steps, pulses);
        SequencerPatterns.push(newPat);
        
        saveCustomPatterns();
        populatePatterns();
        
        patternSelect.value = newPat.id;
        patternSelect.dispatchEvent(new Event('change'));
    });

    btnSavePattern.addEventListener('click', () => {
        const patId = patternSelect.value;
        const currentPat = SequencerPatterns.find(p => p.id == patId);
        if (!currentPat) return;

        // Clone the steps deeply
        const clonedSteps = currentPat.steps.map(step => ({ ...step }));

        const newPat = {
            id: 'saved_' + Date.now(),
            name: new Date().toLocaleString(),
            type: currentPat.type,
            length: currentPat.length,
            isCustom: true,
            isSavedSequence: true,
            steps: clonedSteps
        };

        SequencerPatterns.push(newPat);
        saveCustomPatterns();
        populatePatterns(true);
        patternSelect.value = newPat.id;
        patternSelect.dispatchEvent(new Event('change'));
    });

    btnSeqPlay.addEventListener('click', () => {
        const pat = SequencerPatterns.find(p => p.id == patternSelect.value);
        engine.startSequencer(pat, parseInt(bpmInput.value));
    });
    btnSeqStop.addEventListener('click', () => {
        engine.stopSequencer();
        document.querySelectorAll('.seq-step').forEach(el => el.classList.remove('playing'));
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
    btnExportSeq.addEventListener('click', exportSequence);
    btnExportZip.addEventListener('click', exportZip);
    // Demo File
    const btnLoadDemo = document.getElementById('btn-load-demo');
    if (btnLoadDemo) {
        btnLoadDemo.addEventListener('click', async (e) => {
            e.stopPropagation();
            showLoading('Downloading Demo', 'Fetching professional sample pack...');
            try {
                if (filenameDisplay) filenameDisplay.textContent = 'The-Call-of-the-Polar-Star (Demo).wav';
                const response = await fetch('https://s3.amazonaws.com/citizen-dj-assets.labs.loc.gov/audio/samplepacks/loc-fma/The-Call-of-the-Polar-Star_fma-115766_002_00-00-31.wav');
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

// --- Audio Loading & Processing ---

async function loadAndProcessArrayBuffer(arrayBuffer) {
    try {
        await saveAudioToDB(arrayBuffer); // Save before decoding, which detaches the buffer
        showLoading('Decoding Audio', 'Analyzing waveform and transients...');
        await engine.loadAudio(arrayBuffer.slice(0)); 
        uploadOverlay.classList.add('hidden');
        workspace.classList.remove('hidden');
        engine.setMusicalConfig(keySelect.value, modeSelect.value, octaveSelect.value);
        handleResize();
        // Delay to ensure workspace layout is computed
        await new Promise(resolve => setTimeout(resolve, 100));
        await processAudio();
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

    const columns = Math.min(pattern.length, 16);
    seqGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    seqGrid.innerHTML = '';

    const maskedPattern = engine.getMaskedPattern();

    for (let i = 0; i < pattern.length; i++) {
        const stepEl = document.createElement('div');
        stepEl.className = 'seq-step';
        stepEl.id = `seq-step-${i}`;
        
        // Preserve playing state if active
        if (engine.seqIsPlaying && engine.seqCurrentStep === i) {
            stepEl.classList.add('playing');
        }
        
        const baseStepData = pattern.steps[i];
        const stepData = maskedPattern && maskedPattern.length > i ? maskedPattern[i] : baseStepData;
        
        let sliceInfoStr = '';
        if (engine.slices && engine.slices.length > 0) {
            const sliceIdLookup = (stepData && stepData.sliceId !== undefined) ? stepData.sliceId : i;
            const sliceId = sliceIdLookup % engine.slices.length;
            const slice = engine.slices[sliceId];
            if (slice) {
                const noteName = (slice.pitch && slice.pitch.noteName) ? slice.pitch.noteName : '--';
                sliceInfoStr = `S${sliceId + 1} ${noteName}`;
            }
        }
        
        stepEl.innerHTML = `
            <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 2px; pointer-events: none;">${i + 1}</div>
            <div class="step-slice-info" draggable="true" style="font-size: 0.5rem; color: var(--accent-secondary); font-weight: bold; cursor: grab;">${sliceInfoStr}</div>
        `;
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
        
        const infoDiv = stepEl.querySelector('.step-slice-info');
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
    }
    
    // Update waveform highlights to reflect active sequencer steps
    if (typeof drawWaveform === 'function') {
        drawWaveform();
    }
}

function renderPads() {
    padsContainer.innerHTML = '';
    keyMap = {};
    
    for (let index = 0; index < 16; index++) {
        let sliceId = engine.padMapping[index];
        if (sliceId === undefined || sliceId >= engine.slices.length) {
            sliceId = index % Math.max(1, engine.slices.length);
        }
        const slice = engine.slices[sliceId];
        if (!slice) continue;

        const keyChar = index < KEYS.length ? KEYS[index] : '';
        if (keyChar) keyMap[keyChar] = index;

        const pad = document.createElement('div');
        pad.className = 'pad';
        pad.id = `pad-${index}`;
        if (selectedPadId === index) pad.style.borderColor = 'var(--accent-secondary)';
        
        const pitchText = slice.pitch ? slice.pitch.noteName : '--';

        pad.innerHTML = `
            ${keyChar ? `<span class="pad-key">${keyChar}</span>` : ''}
            <span class="pad-pitch">${pitchText}</span>
            <span class="pad-number">${index + 1}</span>
        `;

        pad.addEventListener('mousedown', () => triggerPad(index));
        pad.addEventListener('mouseup', () => pad.classList.remove('active'));
        pad.addEventListener('mouseleave', () => pad.classList.remove('active'));

        // Drag and Drop for Pads
        pad.draggable = true;
        pad.addEventListener('dragstart', (e) => {
            const sliceId = engine.padMapping[index];
            if (sliceId !== undefined) {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'slice', id: sliceId }));
                const dragDiv = document.createElement('div');
                dragDiv.textContent = `Slice ${sliceId + 1}`;
                dragDiv.style.cssText = "position:absolute; top:-1000px; padding:8px 12px; background:#6366f1; color:white; border-radius:6px;";
                document.body.appendChild(dragDiv);
                e.dataTransfer.setDragImage(dragDiv, 0, 0);
                setTimeout(() => document.body.removeChild(dragDiv), 0);
            }
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
                    engine.padMapping[index] = data.id;
                    renderPads();
                    engine.playPad(data.id);
                }
            } catch(err){}
        });

        padsContainer.appendChild(pad);
    }
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

async function exportSequence() {
    if (!engine.buffer || engine.slices.length === 0) return;
    
    const patId = patternSelect.value;
    const pattern = SequencerPatterns.find(p => p.id == patId);
    
    showLoading('Rendering WAV', 'Generating high-quality sequence export...');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Temporarily set engine sequence config
    engine.seqPattern = pattern;
    engine.seqBpm = parseInt(bpmInput.value);

    try {
        const renderedBuffer = await engine.renderSequenceToBuffer();
        if (renderedBuffer) {
            const blob = WavEncoder.encode(renderedBuffer);
            downloadBlob(blob, `sequence-${pattern.name.replace(/\s+/g, '-').toLowerCase()}.wav`);
        }
    } catch(err) {
        alert("Error rendering sequence: " + err);
    } finally {
        hideLoading();
    }
}

async function exportZip() {
    if (!window.JSZip) {
        alert("JSZip library not loaded.");
        return;
    }
    if (!engine.buffer || engine.slices.length === 0) return;

    showLoading('Creating ZIP', 'Encoding slices and packaging files...');
    await new Promise(resolve => setTimeout(resolve, 50));

    const zip = new JSZip();

    engine.slices.forEach((slice, i) => {
        const blob = WavEncoder.encode(engine.buffer, slice.start, slice.end);
        zip.file(`slice-${i + 1}_${slice.pitch.noteName}.wav`, blob);
    });

    try {
        const content = await zip.generateAsync({type:"blob"});
        downloadBlob(content, "sample-chopper-slices.zip");
    } catch(err) {
        alert("Error generating ZIP: " + err);
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
        toneOnly: seqToneOnly.checked
    };
    localStorage.setItem('splinchedSettings', JSON.stringify(settings));
}

function loadCustomPatterns() {
    const data = localStorage.getItem('splinchedCustomPatterns');
    if (data) {
        try {
            const arr = JSON.parse(data);
            arr.forEach(p => SequencerPatterns.push(p));
        } catch(e) {}
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
            seqSyncopation.value = settings.syncopation !== undefined ? settings.syncopation : '0';
            
            if (settings.noteRepeat !== undefined) seqNoteRepeat.value = fromLogPercent(settings.noteRepeat);
            if (settings.microTiming !== undefined) seqMicroTiming.value = fromLogPercent(settings.microTiming);
            if (settings.probability !== undefined) seqProbability.value = fromLogPercent(settings.probability);
            if (settings.swing !== undefined) seqSwing.value = fromLogPercent(settings.swing);
            if (settings.kick !== undefined) kickDrum.checked = settings.kick;
            if (settings.kickLevel !== undefined) kickLevel.value = fromLogPercent(settings.kickLevel);
            else kickLevel.value = fromLogPercent(0.3);
            if (settings.toneOnly !== undefined) seqToneOnly.checked = settings.toneOnly;
            
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
            // Update UI styles after loading
            Object.keys(SLIDER_DEFAULTS).forEach(id => {
                const el = document.getElementById(id);
                if (el) updateSliderUI(el);
            });
            
            engine.setMusicalConfig(keySelect.value, modeSelect.value, octaveSelect.value);
            engine.globalChoke = globalChokeCheckbox.checked;
            engine.kickEnabled = kickDrum.checked;
            engine.toneOnly = seqToneOnly.checked;
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
        let val = parseFloat(e.target.value);
        if (val < 0.05) { val = 0; e.target.value = 0; }
        engine.updateEffects({ delay: val });
        valDelay.textContent = Math.round(val * 100) + '%';
        e.target.classList.toggle('is-default', val === 0);
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
