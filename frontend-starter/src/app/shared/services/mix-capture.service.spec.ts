import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DjAudioService } from './dj-audio.service';
import { MixCaptureService } from './mix-capture.service';

describe('Mix capture and microphone', () => {
  const makeGain = () => ({ gain: { value: 1, setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() });
  let service: MixCaptureService;
  let output: ReturnType<typeof makeGain>;
  let microphoneGain: ReturnType<typeof makeGain>;
  let microphone: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };
  let track: { stop: ReturnType<typeof vi.fn>; onended: (() => void) | null };
  let stream: { getTracks: () => typeof track[]; getAudioTracks: () => typeof track[] };
  let getUserMedia: ReturnType<typeof vi.fn>;
  let recorder: { state: string; mimeType: string; ondataavailable?: (event: { data: Blob }) => void; onstop?: () => void; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> };
  let context: { currentTime: number; createGain: ReturnType<typeof vi.fn>; createMediaStreamSource: ReturnType<typeof vi.fn>; createMediaStreamDestination: ReturnType<typeof vi.fn> };
  let destinationTrack: { stop: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    output = makeGain(); microphoneGain = makeGain();
    microphone = { connect: vi.fn(), disconnect: vi.fn() };
    track = { stop: vi.fn(), onended: null };
    stream = { getTracks: () => [track], getAudioTracks: () => [track] };
    destinationTrack = { stop: vi.fn() };
    context = { currentTime: 2, createGain: vi.fn(() => microphoneGain), createMediaStreamSource: vi.fn(() => microphone), createMediaStreamDestination: vi.fn(() => ({ stream: { getTracks: () => [destinationTrack] } })) };
    getUserMedia = vi.fn(async () => stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    vi.stubGlobal('MediaRecorder', class {
      static isTypeSupported(type: string) { return type === 'audio/webm;codecs=opus'; }
      state = 'inactive'; mimeType = 'audio/webm;codecs=opus';
      ondataavailable?: (event: { data: Blob }) => void;
      onstop?: () => void;
      constructor() { recorder = this; }
      start = vi.fn(() => { this.state = 'recording'; });
      stop = vi.fn(() => {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob(['mix-audio'], { type: this.mimeType }) });
        this.onstop?.();
      });
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recording');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers: [MixCaptureService, { provide: DjAudioService, useValue: { activateAudio: async () => ({ context, output }), visualizerAudio: () => ({ context, output }) } }] });
    service = TestBed.inject(MixCaptureService);
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'mediaDevices'); });

  it('adds live microphone audio to the master, mutes it, and releases the device', async () => {
    await service.enableMicrophone();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
    expect(microphone.connect).toHaveBeenCalledWith(microphoneGain);
    expect(microphoneGain.connect).toHaveBeenCalledWith(output);
    expect(service.microphoneActive()).toBe(true);
    service.muteMicrophone(); expect(microphoneGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 2, 0.02);
    service.muteMicrophone(); service.setMicrophoneVolume(0.4);
    expect(microphoneGain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.4, 2, 0.02);
    service.disableMicrophone(); expect(track.stop).toHaveBeenCalled(); expect(microphone.disconnect).toHaveBeenCalled();
    expect(service.microphoneActive()).toBe(false);
  });

  it('stops a stream returned after the pending microphone request is cancelled', async () => {
    let resolve!: (value: typeof stream) => void;
    getUserMedia.mockReturnValue(new Promise<typeof stream>(done => { resolve = done; }));
    const pending = service.enableMicrophone();
    await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    service.disableMicrophone(); resolve(stream); await pending;
    expect(track.stop).toHaveBeenCalled(); expect(service.microphoneActive()).toBe(false);
    expect(context.createMediaStreamSource).not.toHaveBeenCalled();
  });

  it('reports denied permissions without leaving the microphone active', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getUserMedia.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    await service.enableMicrophone();
    expect(service.error()).toContain('refusé'); expect(service.microphonePending()).toBe(false);
    expect(service.microphoneActive()).toBe(false);
  });

  it('records the master output and keeps each finished take downloadable', async () => {
    await service.enableMicrophone();
    await service.startRecording();
    expect(output.connect).toHaveBeenCalledWith(context.createMediaStreamDestination.mock.results[0].value);
    expect(recorder.start).toHaveBeenCalledWith(1000); expect(service.recording()).toBe(true);
    service.stopRecording();
    expect(service.recording()).toBe(false); expect(service.recordPending()).toBe(false);
    expect(service.recordings()[0].name).toMatch(/^mix-.*\.webm$/);
    expect(service.recordings()[0].url).toBe('blob:recording');
    expect(service.microphoneActive()).toBe(true);
    expect(output.disconnect).toHaveBeenCalled(); expect(destinationTrack.stop).toHaveBeenCalled();
    await service.startRecording(); service.stopRecording(); expect(service.recordings().length).toBe(2);
    service.ngOnDestroy(); expect(track.stop).toHaveBeenCalled(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:recording');
  });

  it('finalizes an active recorder and stops the microphone on studio teardown', async () => {
    await service.enableMicrophone(); await service.startRecording();
    service.ngOnDestroy();
    expect(recorder.stop).toHaveBeenCalled(); expect(track.stop).toHaveBeenCalled();
    expect(service.recordings()).toEqual([]); expect(service.recording()).toBe(false);
  });
});
