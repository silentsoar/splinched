/**
 * sequencer-patterns.js
 * Generates 128 built-in sequencer patterns (64 Rhythmic, 64 Melodic).
 */

const SequencerPatterns = (function() {
    const patterns = [];
    return patterns;
})();

// Euclidean algorithm using bucket distribution
SequencerPatterns.generateEuclidean = function(steps, pulses) {
    if (pulses > steps) pulses = steps;
    const pattern = [];
    let bucket = 0;
    
    for (let i = 0; i < steps; i++) {
        bucket += pulses;
        if (bucket >= steps) {
            bucket -= steps;
            pattern.push(1);
        } else {
            pattern.push(0);
        }
    }
    
    const seqSteps = [];
    pattern.forEach((val, index) => {
        seqSteps.push({ step: index, active: val === 1, sliceId: index });
    });
    
    const id = "euc_" + Date.now().toString(); // unique ID
    return {
        id: id,
        name: `Euc (${pulses}/${steps})`,
        type: 'rhythmic',
        length: steps,
        steps: seqSteps,
        isCustom: true // marker
    };
};
