import { MusicPlayerService } from '../../shared/services/music-player.service';
import { PublishControlsComponent } from '../publish-controls/publish-controls';
import { CommunityService } from '../../shared/services/community.service';
import { DemoLibraryComponent } from '../demo-library/demo-library';
import type { Visualizer } from 'butterchurn';
import { Component, computed, ElementRef, inject, input, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Track } from '../../shared/models/track.model';
import { TrackStyleService } from '../../shared/services/track-style.service';
import { TrackService } from '../../shared/services/track.service';

@Component({
  selector: 'app-tracks-page',
  imports: [PublishControlsComponent, DemoLibraryComponent, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent implements OnInit, OnDestroy {
  private static readonly maxFileSize = 25 * 1024 * 1024;
  private static readonly allowedTypes = new Set([
    'video/mp4','video/webm','image/png','image/jpeg','image/webp','audio/webm', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
  ]);
  private readonly service = inject(TrackService);
  private readonly persistent = inject(MusicPlayerService);
  private readonly community = inject(CommunityService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private butterchurn?: Visualizer;
  private butterchurnLoading?: Promise<void>;
  private presets: Record<string, object> = {};
  private destroyed = false;
  readonly presetNames = signal<string[]>([]);
  readonly selectedPreset = signal('');
  readonly fullscreen = signal(false);
  readonly visualizerPanel = viewChild<ElementRef<HTMLElement>>('visualizerPanel');
  readonly butterchurnCanvas = viewChild<ElementRef<HTMLCanvasElement>>('butterchurnCanvas');
  private readonly onFullscreenChange = (): void => {
    this.fullscreen.set(document.fullscreenElement === this.visualizerPanel()?.nativeElement);
  };
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private mediaSource?: MediaElementAudioSourceNode;
  private stereoPanner?: StereoPannerNode;
  private animationFrameId?: number;
  private metronomeTimer?: ReturnType<typeof setInterval>;

  readonly styles = inject(TrackStyleService);
  readonly uploadStyle = new FormControl('Non classé', { nonNullable: true });
  readonly styleFilter = signal('');
  readonly tracks = signal<Track[]>([]);
  readonly section = input<'library' | 'player' | 'studio'>('library');
  readonly searchQuery = signal('');
  readonly sortOptions = [
    { value: 'newest', label: 'Date d’ajout : plus récentes' },
    { value: 'oldest', label: 'Date d’ajout : plus anciennes' },
    { value: 'title-asc', label: 'Titre : A → Z' },
    { value: 'title-desc', label: 'Titre : Z → A' },
    { value: 'size-asc', label: 'Taille : plus petites' },
    { value: 'size-desc', label: 'Taille : plus grandes' },
    { value: 'filename', label: 'Nom du fichier : A → Z' },
  ] as const;
  readonly sortOrder = signal<string>('newest');
  private readonly titleCollator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  readonly filteredTracks = computed(() => {
    const query = this.normalize(this.searchQuery());
    const tracks = this.tracks().filter(track =>
      (!query || this.normalize(track.title).includes(query)) &&
      (!this.styleFilter() || this.styles.get(track.id) === this.styleFilter()));
    const order = this.sortOrder();
    return tracks.sort((a, b) => {
      const titleOrder = this.titleCollator.compare(a.title, b.title);
      switch (order) {
        case 'title-asc': return titleOrder;
        case 'title-desc': return -titleOrder;
        case 'size-asc': return a.size - b.size || titleOrder;
        case 'size-desc': return b.size - a.size || titleOrder;
        case 'filename': return this.titleCollator.compare(a.originalName, b.originalName) || titleOrder;
        case 'oldest': return Date.parse(a.createdAt) - Date.parse(b.createdAt) || titleOrder;
        default: return Date.parse(b.createdAt) - Date.parse(a.createdAt) || titleOrder;
      }
    });
  });
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly uploadError = signal('');
  readonly uploadSuccess = signal('');
  readonly deletingId = signal<string | null>(null);
  readonly error = signal('');
  readonly success = signal('');
  readonly audioUrl = signal('');
  readonly playingTitle = signal('');
  readonly playingTrack=signal<Track|null>(null);
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly isPlaying = signal(false);
  readonly volume = signal(1);
  readonly muted = signal(false);
  readonly playbackRate = signal(1);
  readonly loopEnabled = signal(false);
  readonly regionStart = signal(0);
  readonly regionEnd = signal(0);
  readonly waveformError = signal('');
  readonly visualizerMode = signal<'butterchurn' | 'bars' | 'mirror' | 'wave' | 'circle'>('butterchurn');
  readonly bpm = signal(120);
  readonly detectedBpm = signal<number | null>(null);
  readonly bpmAnalysis = signal('');
  readonly metronomeEnabled = signal(false);
  readonly beatGridEnabled = signal(true);
  readonly beatsPerMeasure = signal(4);
  readonly loopMeasures = signal(4);
  readonly pan = signal(0);
  readonly markers = signal<Array<{ id: number; time: number; label: string }>>([]);
  readonly markerLabel = signal('');
  readonly automationEnabled = signal(false);
  readonly automationPoints = signal<Array<{ time: number; volume: number; pan: number }>>([]);
  readonly title = new FormControl('', { nonNullable: true });
  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly audioPlayer = viewChild<ElementRef<HTMLAudioElement>>('audioPlayer');
  readonly waveform = viewChild<ElementRef<HTMLCanvasElement>>('waveform');
  file?: File;

  constructor() {
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.load();
  }

  ngOnInit(): void {
    if (this.section() === 'library') return;
    const saved = sessionStorage.getItem('gpc_selected_track');
    if (saved) {
      try {
        const track: unknown = JSON.parse(saved);
        if (track && typeof track === 'object' && 'id' in track && typeof track.id === 'string' && 'title' in track && typeof track.title === 'string') this.play(track as Track);
      } catch (error) { console.error('[Lecteur] Sélection locale invalide', error); }
    }
  }

  openWorkspace(track: Track, section: 'player' | 'studio'): void {
    if(section==='player'&&(track.mimeType.startsWith('image/')||track.mimeType.startsWith('video/'))){this.persistent.play(track);return;}
    sessionStorage.setItem('gpc_selected_track', JSON.stringify(track));
    void this.router.navigate([section, track.id]);
  }

  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.uploadError.set('');
    this.uploadSuccess.set('');
    if (!file) {
      this.file = undefined;
      return;
    }
    if (!TracksPageComponent.allowedTypes.has(file.type)) {
      this.file = undefined;
      input.value = '';
      this.uploadError.set('Format refusé. Choisissez un audio MP3, WAV, OGG, M4A ou WebM, une vidéo MP4/WebM ou une image PNG/JPEG/WebP.');
      return;
    }
    if (file.size > TracksPageComponent.maxFileSize) {
      this.file = undefined;
      input.value = '';
      this.uploadError.set('Le fichier dépasse la taille maximale de 25 Mo.');
      return;
    }
    this.file = file;
    console.debug('[TracksPage] Fichier sélectionné', this.file?.name);
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.list(this.page()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
        for(const track of response.items)if(track.style)this.styles.set(track.id,track.style);
        this.pages.set(response.pages);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[TracksPage] Chargement impossible', error);
        this.error.set('Impossible de charger les pistes.');
        this.loading.set(false);
      },
    });
  }

  go(page: number): void {
    if (page < 1 || page > this.pages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  search(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  changeSort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (this.sortOptions.some((option) => option.value === value)) this.sortOrder.set(value);
  }

  changeStyleFilter(event: Event): void {
    this.styleFilter.set((event.target as HTMLSelectElement).value);
  }

  classify(track: Track, event: Event): void {
    const style=(event.target as HTMLSelectElement).value;
    this.community.updateTrack(track.id,{style}).subscribe({next:updated=>{this.styles.set(track.id,style);this.updatePublication(updated);},error:error=>{console.error('[Pistes] Style non sauvegardé',error);this.error.set('Impossible de sauvegarder le style dans votre compte.');}});
  }

  updatePublication(track:Track):void {this.tracks.update(items=>items.map(item=>item.id===track.id?track:item));}

  clearSearch(): void {
    this.searchQuery.set('');
  }

  upload(): void {
    if (!this.file || this.uploading()) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadError.set('');
    this.uploadSuccess.set('');
    const style = this.uploadStyle.value;
    this.service.upload(this.file, this.title.value || this.file.name, {style:this.uploadStyle.value}).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round(100 * event.loaded / event.total));
        }
        if (event.type === HttpEventType.Response) {
          console.debug('[TracksPage] Piste envoyée', event.body?.id);
          if (event.body) this.styles.set(event.body.id, style);
          this.title.setValue('');
          this.file = undefined;
          const input = this.fileInput();
          if (input) input.nativeElement.value = '';
          this.uploading.set(false);
          this.uploadProgress.set(100);
          this.uploadSuccess.set('Piste importée avec succès.');
          this.page.set(1);
          this.load();
        }
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Envoi impossible', error);
        this.uploadError.set(error.error?.message ?? 'Impossible d’importer la piste.');
        this.uploading.set(false);
        this.uploadProgress.set(0);
      },
    });
  }

  play(track: Track): void {
    this.error.set('');
    this.waveformError.set('');
    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé', track.id);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
        this.playingTitle.set(track.title);
        this.playingTrack.set(track);
        this.currentTime.set(0);
        this.duration.set(0);
        this.isPlaying.set(false);
        this.regionStart.set(0);
        this.regionEnd.set(0);
        this.markers.set([]);
        this.automationPoints.set([]);
        void this.detectBpm(blob);
      },
      error: (error) => {
        console.error('[TracksPage] Lecture impossible', error);
        this.error.set(`Impossible de lire « ${track.title} ».`);
      },
    });
  }

  togglePlayback(): void {
    const audio = this.audioPlayer()?.nativeElement;
    if (!audio) return;
    if (audio.paused) {
      if (this.regionEnd() > this.regionStart() && audio.currentTime >= this.regionEnd()) {
        audio.currentTime = this.regionStart();
      }
      void audio.play();
    } else {
      audio.pause();
    }
  }

  stopPlayback(): void {
    const audio = this.audioPlayer()?.nativeElement;
    if (!audio) return;
    audio.pause();
    this.isPlaying.set(false);
    audio.currentTime = this.regionStart();
    this.currentTime.set(audio.currentTime);
  }

  onLoadedMetadata(): void {
    const audio = this.audioPlayer()?.nativeElement;
    if (!audio || !Number.isFinite(audio.duration)) return;
    this.duration.set(audio.duration);
    this.regionEnd.set(audio.duration);
    audio.volume = this.volume();
    audio.muted = this.muted();
    audio.playbackRate = this.playbackRate();
    audio.preservesPitch = true;
  }

  onPlay(): void {
    this.isPlaying.set(true);
    void this.startVisualizer();
  }

  onPause(): void {
    // MilkDrop keeps evolving on silence while the audio transport is paused.
    this.isPlaying.set(false);
  }

  onTimeUpdate(): void {
    const audio = this.audioPlayer()?.nativeElement;
    if (!audio) return;
    const end = this.regionEnd();
    if (end > this.regionStart() && audio.currentTime >= end) {
      audio.pause();
      this.isPlaying.set(false);
      audio.currentTime = this.regionStart();
      if (this.loopEnabled()) {
        this.isPlaying.set(true);
        void audio.play();
      }
    }
    this.currentTime.set(audio.currentTime);
    if (this.automationEnabled()) this.applyAutomation(audio.currentTime);
  }

  seek(event: Event): void {
    this.seekTo(Number((event.target as HTMLInputElement).value));
  }

  seekFromWaveform(event: MouseEvent): void {
    const canvas = this.waveform()?.nativeElement;
    if (!canvas || !this.duration()) return;
    const bounds = canvas.getBoundingClientRect();
    this.seekTo(((event.clientX - bounds.left) / bounds.width) * this.duration());
  }

  changeVolume(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.volume.set(value);
    this.muted.set(value === 0);
    const audio = this.audioPlayer()?.nativeElement;
    if (audio) {
      audio.volume = value;
      audio.muted = value === 0;
    }
  }

  toggleMute(): void {
    this.muted.update((muted) => !muted);
    const audio = this.audioPlayer()?.nativeElement;
    if (audio) audio.muted = this.muted();
  }

  changePlaybackRate(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.playbackRate.set(value);
    const audio = this.audioPlayer()?.nativeElement;
    if (audio) {
      audio.preservesPitch = true;
      audio.playbackRate = value;
    }
  }

  toggleLoop(): void {
    this.loopEnabled.update((enabled) => !enabled);
  }

  changeVisualizerMode(event: Event): void {
    const mode = (event.target as HTMLSelectElement).value;
    if (mode === 'butterchurn' || mode === 'bars' || mode === 'mirror' || mode === 'wave' || mode === 'circle') {
      this.visualizerMode.set(mode);
      if (this.audioContext) void this.startVisualizer();
    }
  }

  changePreset(event: Event): void {
    this.loadPreset((event.target as HTMLSelectElement).value);
  }

  nextPreset(): void {
    const names = this.presetNames();
    if (!names.length) return;
    this.loadPreset(names[(names.indexOf(this.selectedPreset()) + 1) % names.length]);
  }

  private loadPreset(name: string): void {
    if (!this.presets[name] || !this.butterchurn) return;
    try {
      this.butterchurn.loadPreset(this.presets[name], 1.5);
      this.selectedPreset.set(name);
    } catch (error) {
      console.error('[Butterchurn] Preset indisponible', error);
      this.waveformError.set('Ce preset ne peut pas être affiché. Essayez un autre preset.');
    }
  }

  async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await this.visualizerPanel()?.nativeElement.requestFullscreen();
    } catch (error) {
      console.error('[Butterchurn] Plein écran indisponible', error);
      this.waveformError.set('Le plein écran est indisponible dans ce navigateur.');
    }
  }

  private async initializeButterchurn(): Promise<void> {
    if (this.butterchurn) return;
    if (this.butterchurnLoading) return this.butterchurnLoading;
    this.butterchurnLoading = (async () => {
      const [engine, collection] = await Promise.all([import('butterchurn'), import('butterchurn-presets')]);
      const canvas = this.butterchurnCanvas()?.nativeElement;
      if (this.destroyed || !canvas || !this.audioContext || !this.stereoPanner) return;
      const exportedEngine = engine.default;
      const factory = 'default' in exportedEngine ? exportedEngine.default : exportedEngine;
      const visualizer = factory.createVisualizer(this.audioContext, canvas, { width: 800, height: 450, pixelRatio: 1 });
      this.butterchurn = visualizer;
      visualizer.connectAudio(this.stereoPanner);
      this.presets = collection.default.getPresets();
      const names = Object.keys(this.presets).sort((a, b) => a.localeCompare(b));
      this.presetNames.set(names);
      if (names.length) this.loadPreset(this.selectedPreset() || names[0]);
    })();
    try { await this.butterchurnLoading; }
    finally { this.butterchurnLoading = undefined; }
  }

  changeBpm(event: Event): void {
    const value = Math.max(40, Math.min(240, Number((event.target as HTMLInputElement).value)));
    this.bpm.set(value);
    if (this.metronomeEnabled()) this.restartMetronome();
  }

  useDetectedBpm(): void {
    const detected = this.detectedBpm();
    if (detected) this.bpm.set(detected);
  }

  toggleMetronome(): void {
    this.metronomeEnabled.update((enabled) => !enabled);
    if (this.metronomeEnabled()) this.restartMetronome();
    else this.stopMetronome();
  }

  toggleBeatGrid(): void {
    this.beatGridEnabled.update((enabled) => !enabled);
  }

  snapToBeat(): void {
    const beatDuration = 60 / this.bpm();
    this.seekTo(Math.round(this.currentTime() / beatDuration) * beatDuration);
  }

  createMeasureLoop(): void {
    const beatDuration = 60 / this.bpm();
    const measureDuration = beatDuration * this.beatsPerMeasure();
    const start = Math.floor(this.currentTime() / measureDuration) * measureDuration;
    const end = Math.min(this.duration(), start + measureDuration * this.loopMeasures());
    this.regionStart.set(start);
    this.regionEnd.set(end);
    this.loopEnabled.set(true);
    this.seekTo(start);
  }

  changeBeatsPerMeasure(event: Event): void {
    this.beatsPerMeasure.set(Number((event.target as HTMLSelectElement).value));
  }

  changeLoopMeasures(event: Event): void {
    this.loopMeasures.set(Number((event.target as HTMLSelectElement).value));
  }

  changePan(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.pan.set(value);
    if (this.stereoPanner) this.stereoPanner.pan.value = value;
  }

  updateMarkerLabel(event: Event): void {
    this.markerLabel.set((event.target as HTMLInputElement).value);
  }

  addMarker(): void {
    const label = this.markerLabel().trim() || `Repère ${this.markers().length + 1}`;
    this.markers.update((markers) => [...markers, {
      id: Date.now(), time: this.currentTime(), label,
    }].sort((a, b) => a.time - b.time));
    this.markerLabel.set('');
  }

  goToMarker(time: number): void {
    this.seekTo(time);
  }

  removeMarker(id: number): void {
    this.markers.update((markers) => markers.filter((marker) => marker.id !== id));
  }

  toggleAutomation(): void {
    this.automationEnabled.update((enabled) => !enabled);
  }

  addAutomationPoint(): void {
    const point = { time: this.currentTime(), volume: this.volume(), pan: this.pan() };
    this.automationPoints.update((points) => [
      ...points.filter((item) => Math.abs(item.time - point.time) > 0.05), point,
    ].sort((a, b) => a.time - b.time));
  }

  clearAutomation(): void {
    this.automationPoints.set([]);
  }

  changeRegionStart(event: Event): void {
    const value = Math.min(Number((event.target as HTMLInputElement).value), this.regionEnd());
    this.regionStart.set(value);
    if (this.currentTime() < value) this.seekTo(value);
  }

  changeRegionEnd(event: Event): void {
    const value = Math.max(Number((event.target as HTMLInputElement).value), this.regionStart());
    this.regionEnd.set(value);
    if (this.currentTime() > value) this.seekTo(value);
  }

  formatTime(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  }

  remove(track: Track): void {
    if (this.deletingId() || !confirm(`Supprimer « ${track.title} » ?`)) return;
    this.deletingId.set(track.id);
    this.error.set('');
    this.success.set('');
    this.service.delete(track.id).subscribe({
      next: () => {
        this.success.set('Piste supprimée.');
        this.deletingId.set(null);
        this.snackBar.open('Piste supprimée avec succès.', 'Fermer', { duration: 4000 });
        if (this.tracks().length === 1 && this.page() > 1) this.page.update((page) => page - 1);
        this.load();
      },
      error: (error: { status?: number; error?: { message?: string } }) => {
        console.error('[TracksPage] Suppression impossible', error);
        const message = error.status === 404
          ? 'Cette piste n’existe plus ou ne vous appartient pas.'
          : (error.error?.message ?? 'Impossible de supprimer la piste.');
        this.error.set(message);
        this.deletingId.set(null);
        this.snackBar.open(message, 'Fermer', { duration: 6000 });
      },
    });
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} Ko`
      : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('fr');
  }

  private seekTo(seconds: number): void {
    const audio = this.audioPlayer()?.nativeElement;
    const value = Math.max(0, Math.min(seconds, this.duration()));
    if (audio) audio.currentTime = value;
    this.currentTime.set(value);
  }

  private async startVisualizer(): Promise<void> {
    try {
      const audio = this.audioPlayer()?.nativeElement;
      if (!audio) return;
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.82;
        this.mediaSource = this.audioContext.createMediaElementSource(audio);
        this.stereoPanner = this.audioContext.createStereoPanner();
        this.stereoPanner.pan.value = this.pan();
        this.mediaSource.connect(this.stereoPanner);
        this.stereoPanner.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }
      if (this.audioContext.state === 'suspended') await this.audioContext.resume();
      if (this.visualizerMode() === 'butterchurn') await this.initializeButterchurn();
      if (this.destroyed) return;
      this.waveformError.set('');
      this.stopVisualizer();
      this.drawVisualizer();
    } catch (error) {
      console.error('[TracksPage] Visualiseur indisponible', error);
      this.stopVisualizer();
      this.waveformError.set('Impossible de démarrer Butterchurn. Vérifiez que WebGL 2 et l’accélération graphique sont disponibles, puis relancez la lecture.');
    }
  }

  private drawVisualizer(): void {
    if (this.destroyed) return;
    if (this.visualizerMode() === 'butterchurn' && this.butterchurn) {
      const canvas = this.butterchurnCanvas()?.nativeElement;
      if (!canvas) return;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      try {
        if (canvas.width !== width || canvas.height !== height) {
          // Butterchurn resizes its textures, but not the output canvas.
          // Keep the drawing buffer and viewport in the same pixel coordinates.
          canvas.width = width;
          canvas.height = height;
          this.butterchurn.setRendererSize(width, height);
        }
        this.butterchurn.render();
      } catch (error) {
        console.error('[Butterchurn] Rendu impossible', error);
        this.waveformError.set('Rendu Butterchurn indisponible. Choisissez un autre preset ou modèle.');
        return;
      }
      this.animationFrameId = requestAnimationFrame(() => this.drawVisualizer());
      return;
    }
    const canvas = this.waveform()?.nativeElement;
    const analyser = this.analyser;
    if (!canvas || !analyser) return;
    const ratio = devicePixelRatio || 1;
    const width = Math.max(600, Math.floor(canvas.clientWidth * ratio));
    const height = Math.floor(180 * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    const values = new Uint8Array(analyser.frequencyBinCount);
    const waveform = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(values);
    analyser.getByteTimeDomainData(waveform);
    context.fillStyle = 'rgba(4, 18, 16, 0.28)';
    context.fillRect(0, 0, width, height);

    const mode = this.visualizerMode();
    if (mode === 'wave') this.drawWaveModel(context, waveform, width, height);
    else if (mode === 'circle') this.drawCircleModel(context, values, width, height);
    else this.drawBarModel(context, values, width, height, mode === 'mirror');

    if (this.section() === 'studio' && this.beatGridEnabled()) this.drawBeatGrid(context, width, height);

    this.animationFrameId = requestAnimationFrame(() => this.drawVisualizer());
  }

  private drawBarModel(
    context: CanvasRenderingContext2D,
    values: Uint8Array,
    width: number,
    height: number,
    mirrored: boolean,
  ): void {
    const count = 72;
    const gap = 3 * (devicePixelRatio || 1);
    const barWidth = width / count - gap;
    for (let index = 0; index < count; index += 1) {
      const intensity = values[Math.floor(index * values.length / count)] / 255;
      const barHeight = Math.max(3, intensity * height * (mirrored ? 0.45 : 0.88));
      const hue = 155 + intensity * 125 + index * 0.8;
      context.fillStyle = `hsl(${hue} 88% ${48 + intensity * 18}%)`;
      const x = index * (barWidth + gap);
      const y = mirrored ? height / 2 - barHeight : height - barHeight;
      context.fillRect(x, y, barWidth, barHeight);
      if (mirrored) context.fillRect(x, height / 2, barWidth, barHeight);
    }
  }

  private drawWaveModel(
    context: CanvasRenderingContext2D,
    values: Uint8Array,
    width: number,
    height: number,
  ): void {
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#38f9d7');
    gradient.addColorStop(0.5, '#7c5cff');
    gradient.addColorStop(1, '#ff4fa3');
    context.strokeStyle = gradient;
    context.lineWidth = 4 * (devicePixelRatio || 1);
    context.shadowBlur = 16 * (devicePixelRatio || 1);
    context.shadowColor = '#49c69d';
    context.beginPath();
    values.forEach((value, index) => {
      const x = index / (values.length - 1) * width;
      const y = value / 255 * height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.shadowBlur = 0;
  }

  private drawCircleModel(
    context: CanvasRenderingContext2D,
    values: Uint8Array,
    width: number,
    height: number,
  ): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.19;
    const count = 96;
    context.lineWidth = 3 * (devicePixelRatio || 1);
    for (let index = 0; index < count; index += 1) {
      const intensity = values[Math.floor(index * values.length / count)] / 255;
      const angle = index / count * Math.PI * 2 - Math.PI / 2;
      const length = 8 + intensity * radius * 1.5;
      context.strokeStyle = `hsl(${index / count * 300 + 150} 90% ${52 + intensity * 18}%)`;
      context.beginPath();
      context.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      context.lineTo(centerX + Math.cos(angle) * (radius + length), centerY + Math.sin(angle) * (radius + length));
      context.stroke();
    }
  }

  private stopVisualizer(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private drawBeatGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.duration() || !this.bpm()) return;
    const beatDuration = 60 / this.bpm();
    const totalBeats = Math.ceil(this.duration() / beatDuration);
    for (let beat = 0; beat <= totalBeats; beat += 1) {
      const x = beat * beatDuration / this.duration() * width;
      const isMeasure = beat % this.beatsPerMeasure() === 0;
      context.strokeStyle = isMeasure ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.13)';
      context.lineWidth = isMeasure ? 2 : 1;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
  }

  private async detectBpm(blob: Blob): Promise<void> {
    this.bpmAnalysis.set('Analyse du tempo…');
    try {
      const context = new AudioContext();
      const buffer = await context.decodeAudioData(await blob.arrayBuffer());
      await context.close();
      const samples = buffer.getChannelData(0);
      const windowSize = 1024;
      const energies: number[] = [];
      for (let offset = 0; offset < samples.length; offset += windowSize) {
        let energy = 0;
        for (let index = offset; index < Math.min(offset + windowSize, samples.length); index += 1) {
          energy += Math.abs(samples[index]);
        }
        energies.push(energy / windowSize);
      }
      const average = energies.reduce((sum, value) => sum + value, 0) / energies.length;
      const peaks: number[] = [];
      const minimumGap = Math.floor(buffer.sampleRate * 0.22 / windowSize);
      energies.forEach((energy, index) => {
        if (energy > average * 1.55 && (!peaks.length || index - peaks.at(-1)! > minimumGap)) peaks.push(index);
      });
      const candidates = new Map<number, number>();
      for (let index = 1; index < peaks.length; index += 1) {
        const seconds = (peaks[index] - peaks[index - 1]) * windowSize / buffer.sampleRate;
        if (!seconds) continue;
        let candidate = 60 / seconds;
        while (candidate < 70) candidate *= 2;
        while (candidate > 180) candidate /= 2;
        const rounded = Math.round(candidate);
        candidates.set(rounded, (candidates.get(rounded) ?? 0) + 1);
      }
      const detected = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (!detected) throw new Error('Tempo non détecté');
      this.detectedBpm.set(detected);
      this.bpm.set(detected);
      this.bpmAnalysis.set(`Tempo estimé : ${detected} BPM`);
    } catch (error) {
      console.error('[TracksPage] Détection BPM impossible', error);
      this.detectedBpm.set(null);
      this.bpmAnalysis.set('Tempo non détecté automatiquement. Réglez-le manuellement.');
    }
  }

  private restartMetronome(): void {
    this.stopMetronome();
    this.playMetronomeClick();
    this.metronomeTimer = setInterval(() => this.playMetronomeClick(), 60000 / this.bpm());
  }

  private playMetronomeClick(): void {
    const context = this.audioContext;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 1000;
    gain.gain.setValueAtTime(0.16, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.05);
  }

  private stopMetronome(): void {
    if (this.metronomeTimer) clearInterval(this.metronomeTimer);
    this.metronomeTimer = undefined;
  }

  private applyAutomation(time: number): void {
    const points = this.automationPoints();
    if (!points.length) return;
    const nextIndex = points.findIndex((point) => point.time >= time);
    const next = nextIndex < 0 ? points.at(-1)! : points[nextIndex];
    const previous = nextIndex <= 0 ? points[0] : points[nextIndex - 1];
    const range = next.time - previous.time;
    const ratio = range > 0 ? (time - previous.time) / range : 0;
    const volume = previous.volume + (next.volume - previous.volume) * ratio;
    const pan = previous.pan + (next.pan - previous.pan) * ratio;
    this.volume.set(volume);
    this.pan.set(pan);
    const audio = this.audioPlayer()?.nativeElement;
    if (audio) audio.volume = volume;
    if (this.stereoPanner) this.stereoPanner.pan.value = pan;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    if (this.stereoPanner) this.butterchurn?.disconnectAudio(this.stereoPanner);
    this.stopVisualizer();
    this.stopMetronome();
    void this.audioContext?.close();
    const url = this.audioUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
