export function createAudio() {
  let context = null;
  let master = null;

  function wake() {
    if (!context) {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return null;
      context = new AudioEngine();
      master = context.createGain();
      master.gain.value = 0.34;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function note(frequency, duration, wave, volume, pan) {
    const engine = wake();
    if (!engine) return;
    const oscillator = engine.createOscillator();
    const gain = engine.createGain();
    const panner = engine.createStereoPanner ? engine.createStereoPanner() : null;
    const start = engine.currentTime;
    oscillator.type = wave || 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan || 0));
      gain.connect(panner);
      panner.connect(master);
    } else {
      gain.connect(master);
    }
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }

  return {
    begin() { wake(); },
    playerStep() { note(108, 0.12, 'triangle', 0.08, 0); },
    guardStep(direction) { note(82, 0.15, 'sine', 0.11, direction); },
    echo() { note(620, 0.58, 'sine', 0.2, 0); note(930, 0.42, 'triangle', 0.06, 0); },
    warning() { note(178, 0.42, 'sawtooth', 0.1, 0); },
    page() { note(480, 0.52, 'sine', 0.15, 0); note(720, 0.74, 'triangle', 0.08, 0.15); },
    clear() { note(392, 0.52, 'sine', 0.16, 0); note(587, 0.68, 'sine', 0.12, 0); note(784, 0.94, 'triangle', 0.09, 0); },
  };
}
