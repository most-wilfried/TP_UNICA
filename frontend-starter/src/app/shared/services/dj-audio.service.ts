import type { SoundTouchNode } from '@soundtouchjs/audio-worklet';
import { Injectable, signal } from '@angular/core';
import { DjDeckState } from '../models/dj-deck.model';

type DeckId = 'A' | 'B';
interface Transport {
  buffer?: AudioBuffer;
  reverse?: AudioBuffer;
  source?: AudioBufferSourceNode;
  gain?: GainNode;
  pitch?: SoundTouchNode;
  bass?: BiquadFilterNode;
  mid?: BiquadFilterNode;
  treble?: BiquadFilterNode;
  anchor: number;
  started: number;
  revision: number;
}
const initial = (): DjDeckState => ({ title: '', duration: 0, position: 0, playing: false, loading: false, scratching: false, rate: 1, volume: 1, loop: false, semitones: 0, bpm: 120, cues: [null, null, null, null], bass: 0, mid: 0, treble: 0 });

@Injectable()
export class DjAudioService {
  readonly decks = signal<Record<DeckId, DjDeckState>>({ A: initial(), B: initial() });
  readonly crossfade = signal(0);
  readonly master = signal(0.8);
  readonly dspReady = signal(false);
  readonly dspError = signal('');
  private pitchLoading?: Promise<void>;
  private pitchFactory?: typeof SoundTouchNode;
  private context?: AudioContext;
  private output?: GainNode;
  private analyser?: AnalyserNode;
  private readonly transports: Record<DeckId, Transport> = { A: { anchor: 0, started: 0, revision: 0 }, B: { anchor: 0, started: 0, revision: 0 } };
  private disposed = false;

  patch(id: DeckId, values: Partial<DjDeckState>): void {
    this.decks.update(decks => ({ ...decks, [id]: { ...decks[id], ...values } }));
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
      this.output = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 256;
      this.output.connect(this.analyser);
      this.analyser.connect(this.context.destination);
      for (const id of ['A', 'B'] as const) {
        const transport = this.transports[id];
        transport.gain = this.context.createGain();
        transport.bass = this.context.createBiquadFilter();
        transport.bass.type = 'lowshelf';
        transport.bass.frequency.value = 250;
        transport.mid = this.context.createBiquadFilter();
        transport.mid.type = 'peaking';
        transport.mid.frequency.value = 1000;
        transport.mid.Q.value = 0.8;
        transport.treble = this.context.createBiquadFilter();
        transport.treble.type = 'highshelf';
        transport.treble.frequency.value = 4000;
        transport.bass.connect(transport.mid);
        transport.mid.connect(transport.treble);
        transport.treble.connect(transport.gain);
        transport.gain.connect(this.output);
        this.applyEq(id);
      }
      this.applyGains();
    }
    return this.context;
  }

  prepareLoad(id: DeckId): void {
    ++this.transports[id].revision;
    this.stop(id);
    this.patch(id, { loading: true });
  }

  async load(id: DeckId, blob: Blob, title: string): Promise<void> {
    const transport = this.transports[id];
    const revision = ++transport.revision;
    this.stop(id);
    this.patch(id, { loading: true });
    try {
      const context = this.ensureContext();
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());
      await this.initializePitch();
      if (this.disposed || transport.revision !== revision) return;
      const reverse = context.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        reverse.copyToChannel(buffer.getChannelData(channel).slice().reverse(), channel);
      }
      transport.buffer = buffer;
      transport.reverse = reverse;
      transport.anchor = 0;
      this.patch(id, { title, duration: buffer.duration, position: 0, loading: false, playing: false, bpm: this.estimateBpm(buffer), cues: [null, null, null, null] });
    } catch (error) {
      if (transport.revision === revision) this.patch(id, { loading: false });
      throw error;
    }
  }

  async toggle(id: DeckId): Promise<void> {
    if (this.decks()[id].playing) { this.pause(id); return; }
    const context = this.ensureContext();
    await context.resume();
    if (this.disposed || this.decks()[id].loading || this.decks()[id].scratching) return;
    if (this.decks()[id].position >= this.decks()[id].duration) this.seek(id, 0);
    this.start(id);
  }

  private silence(id: DeckId): void {
    const transport = this.transports[id];
    if (transport.source) { transport.source.onended = null; transport.source.stop(); transport.source.disconnect(); transport.source = undefined; }
    transport.pitch?.disconnect(); transport.pitch?.port.close(); transport.pitch = undefined;
  }

  private start(id: DeckId): void {
    const transport = this.transports[id];
    const state = this.decks()[id];
    if (!transport.buffer || !this.context || state.position >= state.duration) {
      this.patch(id, { playing: false });
      return;
    }
    this.silence(id);
    const source = this.context.createBufferSource();
    source.buffer = transport.buffer;
    source.playbackRate.value = this.effectiveRate(id);
    source.loop = state.loop;
    if (this.pitchFactory && this.context) {
      transport.pitch?.disconnect();
      transport.pitch?.port.close();
      transport.pitch = new this.pitchFactory({ context: this.context });
      transport.pitch.playbackRate.value = state.rate;
      transport.pitch.pitchSemitones.value = state.semitones;
      transport.pitch.connect(transport.bass!);
      source.connect(transport.pitch);
    } else source.connect(transport.bass!);
    transport.anchor = state.position;
    transport.started = this.context.currentTime;
    transport.source = source;
    source.onended = () => { this.patch(id, { playing: false, position: state.duration }); transport.source = undefined; source.disconnect(); };
    source.start(0, state.position);
    this.patch(id, { playing: true });
  }

  tick(): void {
    for (const id of ['A', 'B'] as const) {
      const state = this.decks()[id];
      if (!state.playing || !this.context) continue;
      const transport = this.transports[id];
      const elapsed = transport.anchor + (this.context.currentTime - transport.started) * this.effectiveRate(id);
      this.patch(id, { position: state.loop ? elapsed % state.duration : Math.min(elapsed, state.duration) });
    }
  }

  pause(id: DeckId): void { this.tick(); this.silence(id); this.patch(id, { playing: false }); }
  clear(id: DeckId): void { this.stop(id); const transport = this.transports[id]; ++transport.revision; transport.buffer = undefined; transport.reverse = undefined; this.patch(id, initial()); }
  stop(id: DeckId): void { this.silence(id); this.patch(id, { playing: false, position: 0, scratching: false }); }
  seek(id: DeckId, position: number): void {
    const playing = this.decks()[id].playing;
    this.silence(id);
    this.patch(id, { position: Math.max(0, Math.min(position, this.decks()[id].duration)) });
    if (playing) this.start(id);
  }
  rate(id: DeckId, rate: number): void { this.tick(); const playing = this.decks()[id].playing; this.patch(id, { rate }); if (playing) this.start(id); }
  private async initializePitch(): Promise<void> {
    if (this.pitchFactory || !this.context?.audioWorklet) return;
    if (this.pitchLoading) return this.pitchLoading;
    const context = this.context;
    this.pitchLoading = (async () => {
      try {
        const { SoundTouchNode } = await import('@soundtouchjs/audio-worklet');
        await SoundTouchNode.register(context, '/audio/worklets/soundtouch-processor.js');
        if (this.disposed) return;
        this.pitchFactory = SoundTouchNode;
        this.dspReady.set(true);
      } catch (error) {
        console.error('[DJ] Transposition indépendante indisponible', error);
        this.dspError.set('Transposition indisponible dans ce navigateur. La lecture reste disponible.');
      }
    })();
    await this.pitchLoading;
  }

  private estimateBpm(buffer: AudioBuffer): number {
    const samples = buffer.getChannelData(0);
    const step = Math.max(1, Math.round(buffer.sampleRate / 100));
    const count = Math.min(6000, Math.floor(samples.length / step));
    if (count < 200) return 120;
    const envelope = new Float32Array(count);
    for (let i = 1; i < count; i++) {
      let energy = 0;
      for (let j = 0; j < step; j++) energy += Math.abs(samples[i * step + j]);
      envelope[i] = energy / step;
    }
    const flux = envelope.map((value, i) => Math.max(0, value - (envelope[i - 1] ?? 0)));
    let best = 0, bestLag = 50;
    for (let lag = 33; lag <= 100; lag++) {
      let correlation = 0;
      for (let i = lag; i < count; i++) correlation += flux[i] * flux[i - lag];
      if (correlation > best) { best = correlation; bestLag = lag; }
    }
    return Math.round(6000 / bestLag);
  }

  setBpm(id: DeckId, bpm: number): void {
    if (Number.isFinite(bpm)) this.patch(id, { bpm: Math.max(40, Math.min(240, bpm)) });
  }

  sync(id: DeckId): void {
    const other = id === 'A' ? 'B' : 'A';
    this.rate(id, Math.max(0.5, Math.min(2, this.decks()[other].bpm * this.decks()[other].rate / this.decks()[id].bpm)));
  }

  cue(id: DeckId, slot: number): void {
    const state = this.decks()[id];
    if (slot < 0 || slot > 3 || !state.title) return;
    const saved = state.cues[slot];
    if (saved !== null) this.seek(id, saved);
    else {
      this.tick();
      const cues = [...this.decks()[id].cues]; cues[slot] = this.decks()[id].position;
      this.patch(id, { cues });
    }
  }

  clearCue(id: DeckId, slot: number): void {
    const cues = [...this.decks()[id].cues]; cues[slot] = null; this.patch(id, { cues });
  }

  private effectiveRate(id: DeckId): number {
    const state = this.decks()[id];
    return state.rate;
  }

  transpose(id: DeckId, semitones: number): void {
    if (!Number.isFinite(semitones)) return;
    this.tick();
    this.patch(id, { semitones: Math.round(Math.max(-12, Math.min(12, semitones))) });
    const pitch = this.transports[id].pitch;
    if (pitch) pitch.pitchSemitones.setTargetAtTime(this.decks()[id].semitones, this.context!.currentTime, 0.02);
  }

  eq(id: DeckId, band: 'bass' | 'mid' | 'treble', db: number): void {
    if (!Number.isFinite(db)) return;
    this.patch(id, { [band]: Math.max(-24, Math.min(12, db)) });
    this.applyEq(id);
  }

  resetTone(id: DeckId): void {
    this.transpose(id, 0);
    this.patch(id, { bass: 0, mid: 0, treble: 0 });
    this.applyEq(id);
  }

  private applyEq(id: DeckId): void {
    if (!this.context) return;
    for (const band of ['bass', 'mid', 'treble'] as const) {
      this.transports[id][band]?.gain.setTargetAtTime(this.decks()[id][band], this.context.currentTime, 0.02);
    }
  }

  async activateAudio(): Promise<{ context: AudioContext; output: GainNode }> {
    if (this.disposed) throw new Error('Le studio est fermé.');
    const context = this.ensureContext();
    await context.resume();
    if (this.disposed) throw new Error('Le studio est fermé.');
    return { context, output: this.output! };
  }

  loop(id: DeckId): void { this.patch(id, { loop: !this.decks()[id].loop }); const source = this.transports[id].source; if (source) source.loop = this.decks()[id].loop; }
  volume(id: DeckId, volume: number): void { this.patch(id, { volume }); this.applyGains(); }
  mix(value: number): void { this.crossfade.set(value); this.applyGains(); }
  setMaster(value: number): void { this.master.set(value); this.applyGains(); }
  private applyGains(): void {
    const angle = (this.crossfade() + 1) * Math.PI / 4;
    for (const id of ['A', 'B'] as const) {
      const gain = this.transports[id].gain;
      if (gain && this.context) gain.gain.setTargetAtTime(this.decks()[id].volume * (id === 'A' ? Math.cos(angle) : Math.sin(angle)), this.context.currentTime, 0.015);
    }
    if (this.output && this.context) this.output.gain.setTargetAtTime(this.master(), this.context.currentTime, 0.015);
  }

  beginScratch(id: DeckId): boolean {
    const resume = this.decks()[id].playing;
    this.pause(id);
    this.patch(id, { scratching: true });
    void this.context?.resume().catch(error => console.error('[DJ] Activation audio impossible', error));
    return resume;
  }

  scratch(id: DeckId, delta: number): void {
    const transport = this.transports[id];
    const state = this.decks()[id];
    if (!this.context || !transport.buffer || !transport.reverse || Math.abs(delta) < 0.001) return;
    this.silence(id);
    const position = Math.max(0, Math.min(state.duration, state.position + delta));
    this.patch(id, { position });
    const source = this.context.createBufferSource();
    source.buffer = delta < 0 ? transport.reverse : transport.buffer;
    const offset = delta < 0 ? state.duration - position : position;
    if (offset >= state.duration) return;
    source.playbackRate.value = Math.max(0.25, Math.min(4, Math.abs(delta) / 0.04));
    source.connect(transport.bass!);
    transport.source = source;
    source.onended = () => { if (transport.source === source) transport.source = undefined; source.disconnect(); };
    source.start(0, offset, Math.min(0.16, state.duration - offset));
  }

  endScratch(id: DeckId, resume: boolean): void {
    this.silence(id);
    this.patch(id, { scratching: false });
    if (resume) this.start(id);
  }

  visualizerAudio(): { context: AudioContext; output: GainNode } | null {
    return this.context && this.output ? { context: this.context, output: this.output } : null;
  }

  waveform(): Uint8Array {
    const values = new Uint8Array(this.analyser?.frequencyBinCount ?? 128);
    if (this.analyser) this.analyser.getByteTimeDomainData(values);
    else values.fill(128);
    return values;
  }

  spectrum(): Uint8Array {
    const values = new Uint8Array(this.analyser?.frequencyBinCount ?? 128);
    this.analyser?.getByteFrequencyData(values);
    return values;
  }
  destroy(): void { this.disposed = true; this.stop('A'); this.stop('B'); void this.context?.close(); }
}
