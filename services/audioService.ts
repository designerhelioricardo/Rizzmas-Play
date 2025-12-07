
// Frequencies for notes
const NOTES: Record<string, number> = {
  'REST': 0,
  'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77,
  'C6': 1046.50
};

type Note = { note: string; dur: number };
type Song = { tempo: number; melody: Note[] };

// Songs Data
const SONGS: Record<string, Song> = {
  'MENU': {
    tempo: 150,
    melody: [
      {note:'C5', dur:4}, {note:'G4', dur:4}, {note:'E4', dur:4}, {note:'A4', dur:4}, 
      {note:'B4', dur:4}, {note:'G4', dur:4}, {note:'C5', dur:8}
    ]
  },
  'RUNNER': { // Jingle Bells
    tempo: 180,
    melody: [
      {note:'E5', dur:2}, {note:'E5', dur:2}, {note:'E5', dur:4},
      {note:'E5', dur:2}, {note:'E5', dur:2}, {note:'E5', dur:4},
      {note:'E5', dur:2}, {note:'G5', dur:2}, {note:'C5', dur:3}, {note:'D5', dur:1}, 
      {note:'E5', dur:8},
      {note:'F5', dur:2}, {note:'F5', dur:2}, {note:'F5', dur:3}, {note:'F5', dur:1},
      {note:'F5', dur:2}, {note:'E5', dur:2}, {note:'E5', dur:2}, {note:'E5', dur:1}, {note:'E5', dur:1},
      {note:'E5', dur:2}, {note:'D5', dur:2}, {note:'D5', dur:2}, {note:'E5', dur:2},
      {note:'D5', dur:4}, {note:'G5', dur:4}
    ]
  },
  'SHOOTER': { // God Rest Ye Merry Gentlemen (Minor/Action)
    tempo: 160,
    melody: [
      {note:'A4', dur:4}, {note:'A4', dur:4}, {note:'E4', dur:4}, {note:'E4', dur:4},
      {note:'F4', dur:4}, {note:'E4', dur:4}, {note:'D4', dur:4}, {note:'C4', dur:4},
      {note:'B3', dur:4}, {note:'A3', dur:4}, {note:'G3', dur:4}, {note:'A3', dur:4},
      {note:'C4', dur:4}, {note:'D4', dur:4}, {note:'E4', dur:4}, {note:'F4', dur:4}
    ]
  },
  'CATCHER': { // Deck The Halls
    tempo: 200,
    melody: [
      {note:'G5', dur:3}, {note:'F#5', dur:1}, {note:'E5', dur:2}, {note:'D5', dur:2},
      {note:'C5', dur:2}, {note:'D5', dur:2}, {note:'E5', dur:2}, {note:'C5', dur:2},
      {note:'D5', dur:1}, {note:'E5', dur:1}, {note:'F5', dur:1}, {note:'D5', dur:1}, {note:'E5', dur:2}, {note:'C5', dur:2},
      {note:'D5', dur:1}, {note:'E5', dur:1}, {note:'F5', dur:1}, {note:'D5', dur:1}, {note:'E5', dur:2}, {note:'C5', dur:2}
    ]
  },
  'BOUNCE': { // Dance of Sugar Plum Fairy
    tempo: 140,
    melody: [
      {note:'E5', dur:2}, {note:'REST', dur:2}, {note:'G5', dur:2}, {note:'REST', dur:2},
      {note:'B5', dur:2}, {note:'REST', dur:2}, {note:'G5', dur:2}, {note:'REST', dur:2},
      {note:'E5', dur:2}, {note:'REST', dur:2}, {note:'B4', dur:2}, {note:'REST', dur:2},
      {note:'E5', dur:4}, {note:'REST', dur:4}
    ]
  }
};

class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmOscillator: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private nextNoteTime: number = 0;
  private currentNoteIndex: number = 0;
  private currentSong: string | null = null;
  private timerID: number | null = null;

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
      // Cancel all sounds
      if (this.ctx) this.ctx.suspend();
    } else {
      if (this.ctx) this.ctx.resume();
      if (this.currentSong) this.playBGM(this.currentSong);
    }
    return this.isMuted;
  }

  getMuteState() {
    return this.isMuted;
  }

  // --- BGM Sequencer ---

  playBGM(songName: string) {
    if (this.isMuted || !this.ctx) return;
    
    // If already playing this song, do nothing
    if (this.currentSong === songName && this.timerID) return;

    this.stopBGM();
    this.currentSong = songName;
    this.currentNoteIndex = 0;
    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
  }

  stopBGM() {
    if (this.timerID) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (this.bgmOscillator) {
      try { this.bgmOscillator.stop(); } catch(e){}
      this.bgmOscillator = null;
    }
  }

  private scheduler() {
    if (!this.ctx || !this.currentSong) return;
    
    // Lookahead: Schedule notes for next 100ms
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
      this.playNextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), 25);
  }

  private playNextNote() {
    if (!this.ctx || !this.currentSong) return;
    
    const song = SONGS[this.currentSong];
    const note = song.melody[this.currentNoteIndex];
    
    // Calculate duration
    const secondsPerBeat = 60.0 / song.tempo;
    const duration = note.dur * 0.25 * secondsPerBeat; // assuming 1/4 note base

    if (note.note !== 'REST') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.type = 'square'; // 8-bit NES vibe
      osc.frequency.value = NOTES[note.note];
      
      // ADSR Envelope for BGM
      gain.gain.setValueAtTime(0.05, this.nextNoteTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.nextNoteTime + duration - 0.05);
      
      osc.start(this.nextNoteTime);
      osc.stop(this.nextNoteTime + duration);
    }

    this.nextNoteTime += duration;
    this.currentNoteIndex++;
    if (this.currentNoteIndex >= song.melody.length) {
      this.currentNoteIndex = 0; // Loop
    }
  }

  // --- SFX Synthesizer ---

  playSFX(type: 'click' | 'jump' | 'coin' | 'shoot' | 'explosion' | 'hit' | 'swing' | 'bounce' | 'powerup' | 'gameover') {
    if (this.isMuted || !this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (type) {
      case 'click':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t); osc.stop(t + 0.05);
        break;

      case 'jump':
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.linearRampToValueAtTime(300, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        osc.start(t); osc.stop(t + 0.1);
        break;

      case 'coin':
      case 'powerup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(1800, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        
        // Echo effect for powerup
        if (type === 'powerup') {
          const osc2 = this.ctx.createOscillator();
          const gain2 = this.ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(this.ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1200, t + 0.1);
          osc2.frequency.linearRampToValueAtTime(2400, t + 0.4);
          gain2.gain.setValueAtTime(0.1, t + 0.1);
          gain2.gain.linearRampToValueAtTime(0, t + 0.4);
          osc2.start(t+0.1); osc2.stop(t+0.4);
        }
        
        osc.start(t); osc.stop(t + 0.3);
        break;

      case 'shoot':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.15);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
        break;

      case 'explosion':
      case 'hit':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.3);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
        break;

      case 'swing':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(100, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t); osc.stop(t + 0.2);
        break;

      case 'bounce':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.linearRampToValueAtTime(400, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.start(t); osc.stop(t + 0.1);
        break;
      
      case 'gameover':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.linearRampToValueAtTime(50, t + 1.0);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 1.0);
        osc.start(t); osc.stop(t + 1.0);
        break;
    }
  }
}

export const audioService = new AudioService();
