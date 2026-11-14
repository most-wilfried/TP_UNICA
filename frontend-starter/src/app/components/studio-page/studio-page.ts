import { MixAccountComponent } from '../mix-account/mix-account';
import { StudioSnapshot } from '../../shared/models/studio-snapshot.model';
import { DjDeckState } from '../../shared/models/dj-deck.model';
import { DemoTrackService } from '../../shared/services/demo-track.service';
import { DemoLibraryComponent } from '../demo-library/demo-library';
import type { Visualizer } from 'butterchurn';
import { Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MixCaptureComponent } from '../mix-capture/mix-capture';
import { DjDeckComponent } from '../dj-deck/dj-deck';
import { TrackService } from '../../shared/services/track.service';
import { TrackStyleService } from '../../shared/services/track-style.service';
import { DjAudioService } from '../../shared/services/dj-audio.service';
import { Track } from '../../shared/models/track.model';

@Component({ imports: [MixAccountComponent, DemoLibraryComponent, DjDeckComponent, MixCaptureComponent, RouterLink], providers: [DjAudioService], templateUrl: './studio-page.html', styleUrl: './studio-page.css' })
export class StudioPageComponent implements OnInit, OnDestroy {
  readonly selectedTracks = signal<Record<'A' | 'B', Track | null>>({ A: null, B: null });
  private readonly demos = inject(DemoTrackService);
  private restoreSettings: Partial<Record<'A' | 'B', DjDeckState>> = {};
  readonly engine = inject(DjAudioService);
  readonly styles = inject(TrackStyleService);
  private readonly service = inject(TrackService);
  readonly tracks = signal<Track[]>([]);
  readonly query = signal('');
  readonly genre = signal('');
  readonly error = signal('');
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly background = signal(true);
  readonly visualizerMode = signal('butterchurn');
  readonly presetNames = signal<string[]>([]);
  readonly selectedPreset = signal('');
  readonly visualizerError = signal('');
  readonly butterchurnCanvas = viewChild<ElementRef<HTMLCanvasElement>>('butterchurnCanvas');
  private butterchurn?: Visualizer;
  private butterchurnLoading = false;
  private butterchurnFailed = false;
  private presets: Record<string, object> = {};
  readonly studioPanel = viewChild<ElementRef<HTMLElement>>('studioPanel');
  private energy = 0;
  private readonly reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('backdrop');
  readonly filtered = computed(() => this.tracks().filter(track => (!this.genre() || this.styles.get(track.id) === this.genre()) && track.title.toLocaleLowerCase('fr').includes(this.query().toLocaleLowerCase('fr'))));
  private frame = 0;
  private disposed = false;
  private readonly subscriptions = new Subscription();
  private readonly requests: Partial<Record<'A' | 'B', Subscription>> = {};
  private readonly revisions = { A: 0, B: 0 };
  ngOnInit(): void {
    this.load();
    try {
      const saved = sessionStorage.getItem('gpc_selected_track');
      if (saved) this.assign(JSON.parse(saved) as Track, 'A');
    } catch (error) { console.error('[DJ] Sélection précédente invalide', error); }
    this.frame = requestAnimationFrame(() => this.draw());
  }
  load(page = this.page()): void {
    this.loading.set(true);
    this.subscriptions.add(this.service.list(page).subscribe({
      next: result => { this.tracks.set(result.items); this.page.set(result.page); this.pages.set(Math.max(1, result.pages)); this.loading.set(false); },
      error: error => { console.error('[DJ] Bibliothèque indisponible', error); this.error.set('Impossible de charger la bibliothèque.'); this.loading.set(false); },
    }));
  }
  assign(track: Track, id: 'A' | 'B', restored?: DjDeckState): void {
    this.restoreSettings[id] = restored;
    this.requests[id]?.unsubscribe();
    const revision = ++this.revisions[id];
    this.engine.prepareLoad(id);
    this.error.set('');
    this.requests[id] = this.service.audio(track.id).subscribe({
      next: blob => { void this.decode(track, id, blob, revision); },
      error: error => { console.error('[DJ] Audio indisponible', error); this.engine.patch(id, { loading: false }); this.error.set(`Impossible de charger « ${track.title} » sur ${id}.`); },
    });
  }
  private async decode(track: Track, id: 'A' | 'B', blob: Blob, revision: number): Promise<void> {
    try {
      await this.engine.load(id, blob, track.title);
      if (this.disposed || revision !== this.revisions[id]) return;
      this.selectedTracks.update(tracks => ({ ...tracks, [id]: track }));
      const demoBpm = this.demos.find(track.id)?.bpm;
      if (demoBpm) this.engine.setBpm(id, demoBpm);
      const settings = this.restoreSettings[id];
      if (settings) { this.applySettings(id, settings); delete this.restoreSettings[id]; }
    }
    catch (error) { console.error('[DJ] Décodage impossible', error); if (!this.disposed && revision === this.revisions[id]) this.error.set('Format audio illisible par ce navigateur.'); }
  }
  restoreMix(snapshot: StudioSnapshot): void {
    this.engine.setMaster(this.bound(snapshot.master, 0, 1, .8));
    this.engine.mix(this.bound(snapshot.crossfade, -1, 1, 0));
    if (snapshot.styles && typeof snapshot.styles === 'object') this.styles.restore(snapshot.styles);
    for (const id of ['A', 'B'] as const) {
      const saved = snapshot.decks[id];
      const track = saved.track;
      this.engine.stop(id);
      if (track && typeof track.id === 'string' && /^[a-zA-Z0-9-]+$/.test(track.id) && typeof track.title === 'string') {
        this.assign(track, id, saved.settings);
      } else { this.requests[id]?.unsubscribe(); this.engine.clear(id); this.selectedTracks.update(tracks => ({ ...tracks, [id]: null })); this.applySettings(id, saved.settings); }
    }
  }
  private bound(value: unknown, min: number, max: number, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }
  private applySettings(id: 'A' | 'B', state: DjDeckState): void {
    this.engine.rate(id, this.bound(state.rate, .5, 2, 1));
    this.engine.volume(id, this.bound(state.volume, 0, 1, 1));
    this.engine.setBpm(id, this.bound(state.bpm, 40, 240, 120));
    this.engine.transpose(id, this.bound(state.semitones, -12, 12, 0));
    for (const band of ['bass', 'mid', 'treble'] as const) this.engine.eq(id, band, this.bound(state[band], -24, 12, 0));
    const duration = this.engine.decks()[id].duration;
    const cues = Array.from({length:4}, (_, i) => typeof state.cues?.[i] === 'number' ? this.bound(state.cues[i], 0, duration, 0) : null);
    this.engine.patch(id, { loop: state.loop === true, cues });
    this.engine.seek(id, this.bound(state.position, 0, duration, 0));
  }
  value(event: Event): string { return (event.target as HTMLInputElement).value; }
  changeVisualizerMode(event: Event): void {
    const mode = this.value(event);
    if (['butterchurn', 'bars', 'mirror', 'wave', 'circle'].includes(mode)) {
      this.visualizerMode.set(mode);
      this.visualizerError.set('');
      this.butterchurnFailed = false;
    }
  }

  changePreset(event: Event): void { this.loadPreset(this.value(event)); }

  nextPreset(): void {
    const names = this.presetNames();
    if (names.length) this.loadPreset(names[(names.indexOf(this.selectedPreset()) + 1) % names.length]);
  }

  private loadPreset(name: string): void {
    if (!this.butterchurn || !this.presets[name]) return;
    try {
      this.butterchurn.loadPreset(this.presets[name], 1.5);
      this.selectedPreset.set(name);
      this.visualizerError.set('');
      this.butterchurnFailed = false;
    } catch (error) {
      console.error('[DJ] Preset indisponible', error);
      this.visualizerError.set('Ce preset ne peut pas être affiché. Choisissez-en un autre.');
    }
  }

  private async initializeButterchurn(): Promise<void> {
    const audio = this.engine.visualizerAudio();
    const canvas = this.butterchurnCanvas()?.nativeElement;
    if (this.butterchurn || this.butterchurnLoading || this.butterchurnFailed || !audio || !canvas) return;
    this.butterchurnLoading = true;
    try {
      const [engine, collection] = await Promise.all([import('butterchurn'), import('butterchurn-presets')]);
      if (this.disposed) return;
      const exportedEngine = engine.default;
      const factory = 'default' in exportedEngine ? exportedEngine.default : exportedEngine;
      const visualizer = factory.createVisualizer(audio.context, canvas, { width: 800, height: 450, pixelRatio: 1 });
      // Both decks and the crossfader feed the same master output.
      this.butterchurn = visualizer;
      visualizer.connectAudio(audio.output);
      this.presets = collection.default.getPresets();
      const names = Object.keys(this.presets).sort((a, b) => a.localeCompare(b));
      this.presetNames.set(names);
      if (names.length) this.loadPreset(this.selectedPreset() || names[0]);
    } catch (error) {
      console.error('[DJ] Butterchurn indisponible', error);
      this.butterchurnFailed = true;
      this.visualizerError.set('Butterchurn est indisponible. Choisissez un autre modèle de fond.');
    } finally { this.butterchurnLoading = false; }
  }

  private renderButterchurn(): void {
    if (!this.butterchurn) { void this.initializeButterchurn(); return; }
    if (this.butterchurnFailed) return;
    const canvas = this.butterchurnCanvas()?.nativeElement;
    if (!canvas) return;
    // Cap resolution for a smooth full-page background, even on large displays.
    const scale = Math.min(1, 1600 / Math.max(canvas.clientWidth, canvas.clientHeight, 1));
    const width = Math.max(1, Math.floor(canvas.clientWidth * scale));
    const height = Math.max(1, Math.floor(canvas.clientHeight * scale));
    try {
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        this.butterchurn.setRendererSize(width, height);
      }
      this.butterchurn.render();
    } catch (error) {
      console.error('[DJ] Rendu Butterchurn impossible', error);
      this.butterchurnFailed = true;
      this.visualizerError.set('Rendu indisponible. Essayez un autre preset ou modèle.');
    }
  }

  private draw(): void {
    if (this.disposed) return;
    this.engine.tick();
    const canvas = this.canvas()?.nativeElement;
    const panel = this.studioPanel()?.nativeElement;
    const values = this.engine.spectrum();
    // The analyser measures the actual mixed output, including master volume.
    const average = values.reduce((sum, value) => sum + value, 0) / values.length / 255;
    this.energy += (average - this.energy) * 0.12;
    const intensity = this.background() && !this.reducedMotion ? this.energy : 0;
    const hue = 195 + intensity * 140;
    panel?.style.setProperty('--music-color', `hsl(${hue} 85% var(--dj-music-lightness))`);
    panel?.style.setProperty('--music-glow', `hsl(${hue} 90% 60% / ${intensity * 0.65})`);
    panel?.style.setProperty('--music-level', String(intensity));
    const animated = this.background() && !this.reducedMotion;
    if (animated && this.visualizerMode() === 'butterchurn') this.renderButterchurn();
    const context = canvas && animated && this.visualizerMode() !== 'butterchurn' ? canvas.getContext('2d') : null;
    if (canvas && context) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.clearRect(0, 0, width, height);
      const radius = Math.max(width, height) * (0.55 + intensity * 0.3);
      for (const side of [0.2, 0.8]) {
        const glow = context.createRadialGradient(width * side, height * 0.4, 0, width * side, height * 0.4, radius);
        glow.addColorStop(0, `hsla(${side < 0.5 ? hue : hue + 65}, 85%, 55%, ${0.1 + intensity * 0.55})`);
        glow.addColorStop(1, 'transparent');
        context.fillStyle = glow;
        context.fillRect(0, 0, width, height);
      }
      const mode = this.visualizerMode();
      if (mode === 'wave') {
        const wave = this.engine.waveform();
        context.strokeStyle = `hsl(${hue} 90% 65%)`;
        context.lineWidth = 4;
        context.beginPath();
        wave.forEach((value, index) => {
          const x = index / (wave.length - 1) * width;
          const y = value / 255 * height;
          if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
        });
        context.stroke();
      } else if (mode === 'circle') {
        const radius = Math.min(width, height) * 0.2;
        context.lineWidth = 4;
        for (let i = 0; i < 96; i++) {
          const angle = i / 96 * Math.PI * 2;
          const length = 10 + values[i % values.length] / 255 * radius;
          context.strokeStyle = `hsl(${hue + i * 2} 90% 65%)`;
          context.beginPath();
          context.moveTo(width / 2 + Math.cos(angle) * radius, height / 2 + Math.sin(angle) * radius);
          context.lineTo(width / 2 + Math.cos(angle) * (radius + length), height / 2 + Math.sin(angle) * (radius + length));
          context.stroke();
        }
      } else {
        const mirrored = mode === 'mirror';
        const barWidth = width / 64;
        for (let i = 0; i < 64; i++) {
          const size = values[i] / 255 * height * (mirrored ? 0.45 : 0.85);
          context.fillStyle = `hsla(${hue + i}, 85%, 65%, 0.45)`;
          context.fillRect(i * barWidth, mirrored ? height / 2 - size : height - size, Math.max(1, barWidth - 4), size);
          if (mirrored) context.fillRect(i * barWidth, height / 2, Math.max(1, barWidth - 4), size);
        }
      }
    }
    this.frame = requestAnimationFrame(() => this.draw());
  }
  ngOnDestroy(): void { this.disposed = true; cancelAnimationFrame(this.frame); this.subscriptions.unsubscribe(); this.requests.A?.unsubscribe(); this.requests.B?.unsubscribe(); const audio = this.engine.visualizerAudio(); if (audio) this.butterchurn?.disconnectAudio(audio.output); this.engine.destroy(); }
}
