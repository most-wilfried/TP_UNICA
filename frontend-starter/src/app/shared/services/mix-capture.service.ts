import { inject, Injectable, OnDestroy, signal } from '@angular/core';
import { DjAudioService } from './dj-audio.service';

export interface SavedMix { url: string; name: string; seconds: number; blob: Blob; parentIds:string[]; }

@Injectable()
export class MixCaptureService implements OnDestroy {
  private readonly engine = inject(DjAudioService);
  readonly microphoneActive = signal(false);
  readonly microphonePending = signal(false);
  readonly microphoneVolume = signal(0.8);
  readonly microphoneMuted = signal(false);
  readonly recording = signal(false);
  readonly recordPending = signal(false);
  readonly seconds = signal(0);
  readonly recordings = signal<SavedMix[]>([]);
  readonly error = signal('');
  readonly remixSources=signal<string[]>([]);
  readonly recordingSupported = typeof MediaRecorder !== 'undefined';
  private stream?: MediaStream;
  private microphone?: MediaStreamAudioSourceNode;
  private microphoneGain?: GainNode;
  private recorder?: MediaRecorder;
  private destination?: MediaStreamAudioDestinationNode;
  private recordingOutput?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private startedAt = 0;
  private microphoneRevision = 0;
  private disposed = false;

  async enableMicrophone(): Promise<void> {
    if (this.microphoneActive() || this.microphonePending() || this.disposed) return;
    this.error.set('');
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error.set('Le micro est indisponible. Ouvrez le studio sur localhost ou en HTTPS.');
      return;
    }
    this.microphonePending.set(true);
    const revision = ++this.microphoneRevision;
    let stream: MediaStream | undefined;
    try {
      const audio = await this.engine.activateAudio();
      if (this.disposed || revision !== this.microphoneRevision) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (this.disposed || revision !== this.microphoneRevision) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.microphone = audio.context.createMediaStreamSource(stream);
      this.microphoneGain = audio.context.createGain();
      this.microphoneGain.gain.value = this.microphoneMuted() ? 0 : this.microphoneVolume();
      this.microphone.connect(this.microphoneGain);
      this.microphoneGain.connect(audio.output);
      this.microphoneActive.set(true);
      for (const track of stream.getAudioTracks()) {
        track.onended = () => { this.disableMicrophone(); if (!this.disposed) this.error.set('Le micro a été déconnecté. Réactivez-le pour continuer.'); };
      }
    } catch (error) {
      stream?.getTracks().forEach(track => track.stop());
      if (revision === this.microphoneRevision) this.releaseMicrophone();
      console.error('[DJ] Microphone indisponible', error);
      if (!this.disposed && revision === this.microphoneRevision) {
        const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
        this.error.set(name === 'NotAllowedError' ? 'Accès au micro refusé. Autorisez-le dans les réglages du navigateur.' : name === 'NotFoundError' ? 'Aucun microphone détecté.' : 'Impossible d’activer le microphone. Vérifiez son branchement et son accès.');
      }
    } finally { if (revision === this.microphoneRevision) this.microphonePending.set(false); }
  }

  disableMicrophone(): void {
    ++this.microphoneRevision;
    this.microphonePending.set(false);
    this.releaseMicrophone();
  }

  private releaseMicrophone(): void {
    this.microphone?.disconnect();
    this.microphoneGain?.disconnect();
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    this.stream = undefined;
    this.microphone = undefined;
    this.microphoneGain = undefined;
    this.microphoneActive.set(false);
  }

  setMicrophoneVolume(value: number): void {
    this.microphoneVolume.set(Math.max(0, Math.min(1, value)));
    this.applyMicrophoneGain();
  }
  muteMicrophone(): void { this.microphoneMuted.update(value => !value); this.applyMicrophoneGain(); }
  private applyMicrophoneGain(): void {
    const audio = this.engine.visualizerAudio();
    if (audio && this.microphoneGain) this.microphoneGain.gain.setTargetAtTime(this.microphoneMuted() ? 0 : this.microphoneVolume(), audio.context.currentTime, 0.02);
  }

  async startRecording(): Promise<void> {
    if (this.recording() || this.recordPending() || this.disposed) return;
    this.error.set('');
    if (!this.recordingSupported) { this.error.set('Ce navigateur ne permet pas d’enregistrer le mix.'); return; }
    this.recordPending.set(true);
    try {
      const audio = await this.engine.activateAudio();
      if (this.disposed) return;
      const destination = audio.context.createMediaStreamDestination();
      this.destination = destination;
      this.recordingOutput = audio.output;
      audio.output.connect(destination);
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
      this.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = event => {
        console.error('[DJ] Erreur d’enregistrement', event);
        if (!this.disposed) this.error.set('L’enregistrement a été interrompu. Vérifiez le fichier obtenu avant de continuer.');
        this.stopRecording();
      };
      recorder.onstop = () => {
        this.updateRecordingTime();
        const seconds = this.seconds();
        this.releaseRecording();
        if (this.disposed) return;
        if (!chunks.length) { this.error.set('Aucun son n’a pu être enregistré.'); return; }
        const type = recorder.mimeType || chunks[0].type || 'audio/webm';
        const blob = new Blob(chunks, { type });
        const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        const name = `mix-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
        this.recordings.update(items => [{ url: URL.createObjectURL(blob), name, seconds, blob, parentIds:[...this.remixSources()] }, ...items]);
      };
      recorder.start(1000);
      this.startedAt = performance.now();
      this.seconds.set(0);
      this.remixSources.set([]);
      this.recording.set(true);
      this.recordPending.set(false);
      this.timer = setInterval(() => this.updateRecordingTime(), 250);
    } catch (error) {
      console.error('[DJ] Enregistrement indisponible', error);
      this.releaseRecording();
      if (!this.disposed) this.error.set('Impossible de démarrer l’enregistrement dans ce navigateur.');
    } finally { if (!this.recording()) this.recordPending.set(false); }
  }

  private updateRecordingTime(): void {
    if (this.recording()) this.seconds.set(Math.floor((performance.now() - this.startedAt) / 1000));
  }

  stopRecording(): void {
    if (!this.recorder || this.recorder.state === 'inactive') return;
    this.updateRecordingTime();
    this.recording.set(false);
    this.recordPending.set(true);
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.recorder.stop();
  }

  private releaseRecording(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (this.recordingOutput && this.destination) this.recordingOutput.disconnect(this.destination);
    this.destination?.stream.getTracks().forEach(track => track.stop());
    this.destination = undefined;
    this.recordingOutput = undefined;
    this.recorder = undefined;
    this.recording.set(false);
    this.recordPending.set(false);
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.disableMicrophone();
    this.stopRecording();
    this.releaseRecording();
    this.recordings().forEach(item => URL.revokeObjectURL(item.url));
  }
}
