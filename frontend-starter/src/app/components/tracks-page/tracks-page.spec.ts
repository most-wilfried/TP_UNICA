import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Track } from '../../shared/models/track.model';
import { Page } from '../../shared/models/page.model';
import { TrackService } from '../../shared/services/track.service';
import { TracksPageComponent } from './tracks-page';

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

  afterEach(() => vi.restoreAllMocks());

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
