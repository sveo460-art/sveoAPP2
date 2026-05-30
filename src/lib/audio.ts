export class CallAudioHelper {
  private ctx: AudioContext | null = null;
  private timer: any = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio Context not supported", e);
      }
    }
  }

  playDialTone() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const playCycle = () => {
      if (!this.ctx) return;
      try {
        this.osc1 = this.ctx.createOscillator();
        this.osc2 = this.ctx.createOscillator();
        this.gain = this.ctx.createGain();

        this.osc1.type = 'sine';
        this.osc1.frequency.setValueAtTime(440, this.ctx.currentTime);
        this.osc2.type = 'sine';
        this.osc2.frequency.setValueAtTime(480, this.ctx.currentTime);

        this.gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        this.gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 1.8);

        this.osc1.connect(this.gain);
        this.osc2.connect(this.gain);
        this.gain.connect(this.ctx.destination);

        this.osc1.start();
        this.osc2.start();

        this.timer = setTimeout(() => {
          this.stopOscillators();
          this.timer = setTimeout(playCycle, 2000);
        }, 1800);
      } catch (e) {
        console.error(e);
      }
    };

    playCycle();
  }

  playRingtone() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    const playCycle = () => {
      if (!this.ctx) return;
      try {
        this.osc1 = this.ctx.createOscillator();
        this.osc2 = this.ctx.createOscillator();
        this.gain = this.ctx.createGain();

        this.osc1.type = 'sine';
        this.osc1.frequency.setValueAtTime(400, this.ctx.currentTime);
        this.osc2.type = 'sine';
        this.osc2.frequency.setValueAtTime(450, this.ctx.currentTime);

        this.gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        this.gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 1.2);

        this.osc1.connect(this.gain);
        this.osc2.connect(this.gain);
        this.gain.connect(this.ctx.destination);

        this.osc1.start();
        this.osc2.start();

        this.timer = setTimeout(() => {
          this.stopOscillators();
          this.timer = setTimeout(playCycle, 1500);
        }, 1200);
      } catch (e) {
        console.error(e);
      }
    };

    playCycle();
  }

  playBusyTone() {
    this.stop();
    this.init();
    if (!this.ctx) return;

    let count = 0;
    const playCycle = () => {
      if (count > 6 || !this.ctx) {
        this.stop();
        return;
      }
      try {
        this.osc1 = this.ctx.createOscillator();
        this.gain = this.ctx.createGain();

        this.osc1.type = 'sine';
        this.osc1.frequency.setValueAtTime(425, this.ctx.currentTime);

        this.gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        this.gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.23);

        this.osc1.connect(this.gain);
        this.gain.connect(this.ctx.destination);

        this.osc1.start();

        count++;
        this.timer = setTimeout(() => {
          this.stopOscillators();
          this.timer = setTimeout(playCycle, 250);
        }, 250);
      } catch (e) {
        console.error(e);
      }
    };

    playCycle();
  }

  playBeep() {
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      g.gain.setValueAtTime(0.05, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      setTimeout(() => {
        try { osc.stop(); } catch(e){}
      }, 150);
    } catch (e) {}
  }

  private stopOscillators() {
    try {
      if (this.osc1) { this.osc1.stop(); this.osc1 = null; }
      if (this.osc2) { this.osc2.stop(); this.osc2 = null; }
    } catch(e){}
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.stopOscillators();
    if (this.gain) {
      try { this.gain.disconnect(); } catch(e){}
      this.gain = null;
    }
  }
}
