import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DjAudioService } from './dj-audio.service';

const dsp = vi.hoisted(() => ({ register: vi.fn(async () => undefined), nodes: [] as Array<{ playbackRate: {value: number}; pitchSemitones: {value: number; setTargetAtTime: ReturnType<typeof vi.fn>}; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; port: { close: ReturnType<typeof vi.fn> } }> }));
vi.mock('@soundtouchjs/audio-worklet', () => ({ SoundTouchNode: class {
  static register = dsp.register;
  playbackRate = { value: 1 };
  pitchSemitones = { value: 0, setTargetAtTime: vi.fn() };
  connect = vi.fn(); disconnect = vi.fn(); port = { close: vi.fn() };
  constructor() { dsp.nodes.push(this); }
} }));

const buffers = () => {
  const samples = new Float32Array([1, 2, 3, 4]);
  return { numberOfChannels: 1, length: 4, sampleRate: 1, duration: 4, getChannelData: () => samples, copyToChannel: vi.fn() };
};

describe('DJ audio transport', () => {
  let engine: DjAudioService;
  let context: { currentTime: number; sources: ReturnType<typeof source>[]; gains: ReturnType<typeof gain>[]; filters: ReturnType<typeof filter>[]; decodeAudioData: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  const source = () => ({ buffer: null, playbackRate: { value: 1 }, loop: false, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null });
  const gain = () => ({ gain: { setTargetAtTime: vi.fn() }, connect: vi.fn() });

  const filter = () => ({ type: '', frequency: { value: 0 }, Q: { value: 0 }, gain: { setTargetAtTime: vi.fn() }, connect: vi.fn() });

  beforeEach(() => {
    dsp.nodes.length = 0; dsp.register.mockClear();
    vi.stubGlobal('AudioContext', class {
      currentTime = 0;
      destination = {};
      sources: ReturnType<typeof source>[] = [];
      gains: ReturnType<typeof gain>[] = [];
      filters: ReturnType<typeof filter>[] = [];
      decodeAudioData = vi.fn(async () => buffers());
      close = vi.fn(async () => undefined);
      constructor() { context = this; }
      createGain() { const node = gain(); this.gains.push(node); return node; }
      createBiquadFilter() { const node = filter(); this.filters.push(node); return node; }
      createAnalyser() { return { fftSize: 256, frequencyBinCount: 128, connect: vi.fn(), getByteFrequencyData: vi.fn() }; }
      createBuffer() { return buffers(); }
      createBufferSource() { const node = source(); this.sources.push(node); return node; }
      resume() { return Promise.resolve(); }
    });
    engine = new DjAudioService();
  });
  afterEach(() => { engine.destroy(); vi.unstubAllGlobals(); });
  const blob = { arrayBuffer: async () => new ArrayBuffer(4) } as Blob;

  it('plays two decks independently and stops only the selected transport', async () => {
    await engine.load('A', blob, 'Alpha'); await engine.load('B', blob, 'Beta');
    await engine.toggle('A'); await engine.toggle('B');
    context.currentTime = 1; engine.tick();
    expect(engine.decks().A.position).toBe(1); expect(engine.decks().B.position).toBe(1);
    engine.stop('A');
    expect(engine.decks().A.playing).toBe(false); expect(engine.decks().A.position).toBe(0);
    expect(engine.decks().B.playing).toBe(true);
    expect(context.sources[1].stop).not.toHaveBeenCalled();
  });

  it('crossfades to either deck with equal power in the center', async () => {
    await engine.load('A', blob, 'Alpha');
    const last = (index: number) => context.gains[index].gain.setTargetAtTime.mock.lastCall?.[0];
    expect(last(1)).toBeCloseTo(Math.SQRT1_2); expect(last(2)).toBeCloseTo(Math.SQRT1_2);
    engine.mix(-1); expect(last(1)).toBe(1); expect(last(2)).toBe(0);
    engine.mix(1); expect(last(1)).toBeCloseTo(0); expect(last(2)).toBe(1);
  });

  it('scratches backwards with a reversed buffer and resumes the previous playback', async () => {
    await engine.load('A', blob, 'Alpha'); await engine.toggle('A');
    context.currentTime = 2;
    const resume = engine.beginScratch('A');
    engine.scratch('A', -0.5);
    expect(engine.decks().A.position).toBe(1.5);
    expect(context.sources[1].buffer).not.toBe(context.sources[0].buffer);
    expect(context.sources[1].start).toHaveBeenCalledWith(0, 2.5, 0.16);
    engine.endScratch('A', resume);
    expect(engine.decks().A.playing).toBe(true);
    expect(context.sources[2].start).toHaveBeenCalledWith(0, 1.5);
  });

  it('keeps a paused deck paused after scratching and clamps seeking', async () => {
    await engine.load('A', blob, 'Alpha');
    engine.seek('A', 20); expect(engine.decks().A.position).toBe(4);
    engine.seek('A', -20); expect(engine.decks().A.position).toBe(0);
    const resume = engine.beginScratch('A'); engine.scratch('A', 0.2); engine.endScratch('A', resume);
    expect(engine.decks().A.playing).toBe(false);
  });

  it('preserves transport position across pitch changes and wraps loops', async () => {
    await engine.load('A', blob, 'Alpha'); await engine.toggle('A');
    context.currentTime = 1; engine.rate('A', 1.25);
    context.currentTime = 2; engine.tick(); expect(engine.decks().A.position).toBe(2.25);
    engine.loop('A'); context.currentTime = 4; engine.tick();
    expect(engine.decks().A.position).toBeCloseTo(0.75);
  });
  it('routes normal playback and scratches through each deck equalizer', async () => {
    engine.eq('A', 'bass', 6);
    await engine.load('A', blob, 'Alpha'); await engine.toggle('A');
    expect(context.filters.map(node => node.type)).toEqual(['lowshelf', 'peaking', 'highshelf', 'lowshelf', 'peaking', 'highshelf']);
    expect(context.sources[0].connect).toHaveBeenCalledWith(context.filters[0]);
    expect(context.filters[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(6, 0, 0.02);
    engine.eq('A', 'mid', -12); engine.eq('A', 'treble', 99);
    expect(engine.decks().A.treble).toBe(12);
    expect(context.filters[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(-12, 0, 0.02);
    engine.beginScratch('A'); engine.scratch('A', 0.2);
    expect(context.sources[1].connect).toHaveBeenCalledWith(context.filters[0]);
    engine.resetTone('A');
    expect(engine.decks().A.bass).toBe(0); expect(engine.decks().A.mid).toBe(0);
  });

  it('transposes by semitones without jumping the playback position', async () => {
    await engine.load('A', blob, 'Alpha'); await engine.toggle('A');
    context.currentTime = 1; engine.transpose('A', 12);
    expect(engine.decks().A.position).toBe(1);
    expect(context.sources[0].playbackRate.value).toBe(1);
    context.currentTime = 2; engine.tick(); expect(engine.decks().A.position).toBe(2);
    engine.transpose('A', 0);
    expect(context.sources[0].playbackRate.value).toBe(1);
  });

  it('applies independent pitch in the worklet while keeping source speed unchanged', async () => {
    await engine.load('A', blob, 'Alpha');
    Object.assign(context, { audioWorklet: {} });
    await engine.load('A', blob, 'Alpha');
    await engine.toggle('A');
    context.currentTime = 1; engine.transpose('A', 5);
    expect(dsp.register).toHaveBeenCalled();
    expect(dsp.nodes[0].pitchSemitones.setTargetAtTime).toHaveBeenLastCalledWith(5, 1, 0.02);
    expect(context.sources[0].playbackRate.value).toBe(1);
    expect(context.sources[0].connect).toHaveBeenCalledWith(dsp.nodes[0]);
    engine.pause('A'); expect(dsp.nodes[0].port.close).toHaveBeenCalled();
  });

  it('syncs BPM and remembers, jumps to, and removes Hot Cues', async () => {
    await engine.load('A', blob, 'Alpha'); await engine.load('B', blob, 'Beta');
    engine.setBpm('A', 100); engine.setBpm('B', 120); engine.sync('A');
    expect(engine.decks().A.rate).toBe(1.2);
    engine.seek('A', 2); engine.cue('A', 0); engine.seek('A', 3); engine.cue('A', 0);
    expect(engine.decks().A.position).toBe(2);
    engine.clearCue('A', 0); expect(engine.decks().A.cues[0]).toBeNull();
  });

  it('does not let an obsolete decoder clear the loading state of a new selection', async () => {
    const first = engine.load('A', blob, 'Obsolete');
    engine.prepareLoad('A');
    await first;
    expect(engine.decks().A.title).toBe('');
    expect(engine.decks().A.loading).toBe(true);
    await engine.load('A', blob, 'Latest');
    expect(engine.decks().A.title).toBe('Latest');
    expect(engine.decks().A.loading).toBe(false);
  });

});
