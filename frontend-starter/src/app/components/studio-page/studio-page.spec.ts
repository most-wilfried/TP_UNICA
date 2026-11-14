import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrackService } from '../../shared/services/track.service';
import { StudioPageComponent } from './studio-page';

const visualizer = vi.hoisted(() => ({
  createVisualizer: vi.fn(), connectAudio: vi.fn(), disconnectAudio: vi.fn(),
  loadPreset: vi.fn(), setRendererSize: vi.fn(), render: vi.fn(),
}));
vi.mock('butterchurn', () => ({ default: { default: { createVisualizer: visualizer.createVisualizer } } }));
vi.mock('butterchurn-presets', () => ({ default: { getPresets: () => ({ Aurora: {}, Nebula: {} }) } }));

const track = { id: 'dj-test', title: 'House session', originalName: 'house.mp3', mimeType: 'audio/mpeg', size: 1024, createdAt: '2026-10-12' };

describe('Studio mixing workspace', () => {
  afterEach(() => { sessionStorage.removeItem('gpc_selected_track'); localStorage.removeItem('gpc_track_styles'); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });
  it('renders both decks, loads the selected deck and filters by musical style', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    sessionStorage.removeItem('gpc_selected_track');
    const service = { list: vi.fn(() => of({ items: [track], page: 1, pages: 1 })), audio: vi.fn(() => of(new Blob())) };
    await TestBed.configureTestingModule({ imports: [StudioPageComponent], providers: [provideHttpClient(),provideRouter([]), { provide: TrackService, useValue: service }] }).compileComponents();
    const fixture = TestBed.createComponent(StudioPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const decode = vi.spyOn(component.engine, 'load').mockResolvedValue();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('app-dj-deck').length).toBe(2);
    expect(element.querySelector('[aria-label="Table de mixage"]')).toBeTruthy();
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('.actions button')];
    buttons[1].click();
    expect(service.audio).toHaveBeenCalledWith(track.id);
    expect(decode).toHaveBeenCalledWith('B', expect.any(Blob), track.title);
    component.styles.set(track.id, 'House');
    component.genre.set('Jazz'); fixture.detectChanges();
    expect(element.querySelector('.track')).toBeNull();
    component.genre.set('House'); fixture.detectChanges();
    expect(element.querySelector('.track')?.textContent).toContain('House session');
    fixture.destroy();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });
  it('offers player visualizer models and changes MilkDrop presets behind the decks', async () => {
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1; }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    sessionStorage.removeItem('gpc_selected_track');
    visualizer.createVisualizer.mockReturnValue(visualizer);
    await TestBed.configureTestingModule({
      imports: [StudioPageComponent],
      providers: [provideHttpClient(),provideRouter([]), { provide: TrackService, useValue: { list: () => of({ items: [], page: 1, pages: 1 }) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(StudioPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const node = {} as GainNode;
    vi.spyOn(component.engine, 'visualizerAudio').mockReturnValue({ context: {} as AudioContext, output: node });
    const element: HTMLElement = fixture.nativeElement;
    const canvas = element.querySelector('.milkdrop-background') as HTMLCanvasElement;
    Object.defineProperty(canvas, 'clientWidth', { value: 1440 });
    Object.defineProperty(canvas, 'clientHeight', { value: 900 });
    frame?.(0);
    const renderFrame = frame;
    await vi.waitFor(() => expect(component.presetNames()).toEqual(['Aurora', 'Nebula']));
    renderFrame?.(16);
    fixture.detectChanges();
    expect(visualizer.connectAudio).toHaveBeenCalledWith(node);
    expect(visualizer.setRendererSize).toHaveBeenCalledWith(1440, 900);
    expect(visualizer.render).toHaveBeenCalled();
    const model = element.querySelector('.background-controls select') as HTMLSelectElement;
    expect([...model.options].map(option => option.value)).toEqual(['butterchurn', 'bars', 'mirror', 'wave', 'circle']);
    component.nextPreset();
    expect(component.selectedPreset()).toBe('Nebula');
    expect(visualizer.loadPreset).toHaveBeenLastCalledWith({}, 1.5);
    const preset = element.querySelector('.preset-picker select') as HTMLSelectElement;
    preset.value = 'Aurora'; preset.dispatchEvent(new Event('change'));
    expect(component.selectedPreset()).toBe('Aurora');
    model.value = 'wave'; model.dispatchEvent(new Event('change')); fixture.detectChanges();
    expect(canvas.hidden).toBe(true);
    expect((element.querySelector('canvas:not(.milkdrop-background)') as HTMLCanvasElement).hidden).toBe(false);
    fixture.destroy();
    expect(visualizer.disconnectAudio).toHaveBeenCalledWith(node);
  });

});
