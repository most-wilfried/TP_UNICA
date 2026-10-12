import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Track } from '../../shared/models/track.model';
import { Page } from '../../shared/models/page.model';
import { TrackService } from '../../shared/services/track.service';
import { TracksPageComponent } from './tracks-page';

const engineMock = vi.hoisted(() => ({
  createVisualizer: vi.fn(),
  connectAudio: vi.fn(), disconnectAudio: vi.fn(), loadPreset: vi.fn(),
  render: vi.fn(), setRendererSize: vi.fn(),
}));
// The published CommonJS package wraps the engine in an additional default export.
vi.mock('butterchurn', () => ({ default: { default: { createVisualizer: engineMock.createVisualizer } } }));
vi.mock('butterchurn-presets', () => ({ default: { getPresets: () => ({ Aurora: {}, Nebula: {} }) } }));

const emptyPage: Page<Track> = { items: [], page: 1, limit: 5, total: 0, pages: 1 };
const track: Track = {
  id: 'track-42',
  title: 'Blues en la',
  originalName: 'blues.mp3',
  mimeType: 'audio/mpeg',
  size: 1024,
  createdAt: '2026-01-01',
};

describe('TracksPageComponent', () => {
  let fixture: ComponentFixture<TracksPageComponent>;
  let component: TracksPageComponent;
  let service: {
    list: ReturnType<typeof vi.fn>;
    upload: ReturnType<typeof vi.fn>;
    audio: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      list: vi.fn(() => of(emptyPage)),
      upload: vi.fn(),
      audio: vi.fn(),
      delete: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [TracksPageComponent],
      providers: [
        { provide: TrackService, useValue: service },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

  function createComponent(): void {
    fixture = TestBed.createComponent(TracksPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('affiche une erreur après un échec HTTP de chargement', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    service.list.mockReturnValue(throwError(() => ({ status: 500 })));

    createComponent();

    expect(component.error()).toBe('Impossible de charger les pistes.');
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Impossible de charger les pistes.');
  });

  it('charge le véritable format d’export Butterchurn et applique les presets sans barres', async () => {
    const node = { connect: vi.fn(), pan: { value: 0 } };
    vi.stubGlobal('AudioContext', class {
      state = 'running'; destination = node;
      createAnalyser() { return node; }
      createMediaElementSource() { return node; }
      createStereoPanner() { return node; }
      close() { return Promise.resolve(); }
    });
    let nextFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback;
      return 1;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    engineMock.createVisualizer.mockReturnValue(engineMock);
    createComponent();
    fixture.componentRef.setInput('section', 'player');
    component.audioUrl.set('blob:test');
    fixture.detectChanges();
    const canvas = fixture.nativeElement.querySelector('.butterchurn-canvas') as HTMLCanvasElement;
    Object.defineProperty(canvas, 'clientWidth', { value: 960, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 540, configurable: true });
    vi.stubGlobal('devicePixelRatio', 2);
    component.onPlay();
    await vi.waitFor(() => expect(engineMock.render).toHaveBeenCalled());
    const renderFrame = nextFrame;
    expect(engineMock.connectAudio).toHaveBeenCalledWith(node);
    expect(component.presetNames()).toEqual(['Aurora', 'Nebula']);
    expect(component.selectedPreset()).toBe('Aurora');
    component.nextPreset();
    expect(component.selectedPreset()).toBe('Nebula');
    expect(engineMock.loadPreset).toHaveBeenLastCalledWith({}, 1.5);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.waveform').hidden).toBe(true);
    expect(fixture.nativeElement.querySelector('option[value="bars"]')).toBeNull();
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(engineMock.setRendererSize).toHaveBeenLastCalledWith(1920, 1080);
    const beforePause = engineMock.render.mock.calls.length;
    component.onPause();
    renderFrame?.(16);
    expect(engineMock.render.mock.calls.length).toBe(beforePause + 1);
    Object.defineProperty(canvas, 'clientWidth', { value: 1200 });
    nextFrame?.(32);
    expect(canvas.width).toBe(2400);
    expect(engineMock.setRendererSize).toHaveBeenLastCalledWith(2400, 1080);
    component.audioUrl.set('');
    fixture.destroy();
    expect(engineMock.disconnectAudio).toHaveBeenCalledWith(node);
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('demande le plein écran avec le menu de presets et gère un refus', async () => {
    createComponent();
    component.audioUrl.set('blob:test');
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('.visualizer-panel');
    panel.requestFullscreen = vi.fn(() => Promise.resolve());
    await component.toggleFullscreen();
    expect(panel.requestFullscreen).toHaveBeenCalledOnce();
    expect(panel.querySelector('.preset-picker')).toBeTruthy();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    panel.requestFullscreen.mockRejectedValue(new Error('Refus'));
    await component.toggleFullscreen();
    expect(component.waveformError()).toContain('plein écran');
    component.audioUrl.set('');
  });

  it('change de modèle et conserve le choix après une pause', () => {
    createComponent();
    expect(component.visualizerMode()).toBe('butterchurn');
    component.changeVisualizerMode({ target: { value: 'wave' } } as unknown as Event);
    component.onPause();
    expect(component.visualizerMode()).toBe('wave');
    component.changeVisualizerMode({ target: { value: 'butterchurn' } } as unknown as Event);
    expect(component.visualizerMode()).toBe('butterchurn');
  });

  it('trie par titre, taille et date sans modifier les pistes reçues', () => {
    createComponent();
    const tracks = [
      { ...track, id: 'z', title: 'Zulu', size: 100, createdAt: '2026-01-03' },
      { ...track, id: 'e', title: 'Été', size: 300, createdAt: '2026-01-01' },
      { ...track, id: 'a', title: 'alpha', size: 200, createdAt: '2026-01-02' },
    ];
    component.tracks.set(tracks);
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#track-sort');
    select.value = 'title-asc';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.filteredTracks().map((item) => item.id)).toEqual(['a', 'e', 'z']);
    expect([...fixture.nativeElement.querySelectorAll('.track b')].map((node: HTMLElement) => node.textContent))
      .toEqual(['alpha', 'Été', 'Zulu']);
    component.sortOrder.set('size-desc');
    expect(component.filteredTracks().map((item) => item.id)).toEqual(['e', 'a', 'z']);
    component.sortOrder.set('oldest');
    expect(component.filteredTracks().map((item) => item.id)).toEqual(['e', 'a', 'z']);
    component.searchQuery.set('ete');
    expect(component.filteredTracks().map((item) => item.id)).toEqual(['e']);
    expect(tracks.map((item) => item.id)).toEqual(['z', 'e', 'a']);
  });

  it('supprime une piste avec DELETE puis recharge la liste', () => {
    service.delete.mockReturnValue(of(undefined));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    createComponent();

    component.tracks.set([track]);
    component.remove(track);

    expect(service.delete).toHaveBeenCalledWith('track-42');
    expect(service.list).toHaveBeenCalledTimes(2);
    expect(component.success()).toBe('Piste supprimée.');
    expect(component.deletingId()).toBeNull();
  });

  it('met à jour la progression de l’upload et traite une erreur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const events = new Subject<HttpEvent<Track>>();
    service.upload.mockReturnValue(events as Observable<HttpEvent<Track>>);
    createComponent();
    component.file = new File(['audio'], 'blues.mp3', { type: 'audio/mpeg' });

    component.upload();
    events.next({ type: HttpEventType.UploadProgress, loaded: 5, total: 10 });

    expect(component.uploading()).toBe(true);
    expect(component.uploadProgress()).toBe(50);

    events.error({ error: { message: 'Upload refusé' } });

    expect(component.uploading()).toBe(false);
    expect(component.uploadProgress()).toBe(0);
    expect(component.uploadError()).toBe('Upload refusé');
  });
});
