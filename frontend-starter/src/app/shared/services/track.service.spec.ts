import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrackService } from './track.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('TrackService', () => {
  let service: TrackService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TrackService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('transmet page et limit lors du chargement des pistes', () => {
    service.list(3, 10).subscribe();

    const request = http.expectOne((candidate) => candidate.url === '/api/tracks');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('limit')).toBe('10');
    request.flush({ items: [], page: 3, limit: 10, total: 0, pages: 1 });
  });

  it('envoie la suppression avec DELETE /api/tracks/:id', () => {
    service.delete('track-42').subscribe();

    const request = http.expectOne('/api/tracks/track-42');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('recherche dans toute la bibliothèque personnelle avant pagination', () => {
    service.list(1,20,' House ').subscribe();
    const request=http.expectOne(candidate=>candidate.url==='/api/tracks');
    expect(request.request.params.get('q')).toBe('House');
    request.flush({items:[],page:1,limit:20,total:0,pages:1});
  });

  it('construit un multipart et demande les événements de progression', () => {
    const file = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });
    service.upload(file, 'Mon morceau').subscribe();

    const request = http.expectOne('/api/tracks');
    expect(request.request.method).toBe('POST');
    expect(request.request.reportProgress).toBe(true);
    expect(request.request.body.get('audio')).toBe(file);
    expect(request.request.body.get('title')).toBe('Mon morceau');
    request.flush({
      id: '1', title: 'Mon morceau', originalName: 'test.mp3', mimeType: 'audio/mpeg',
      size: 5, createdAt: '2026-01-01',
    });
  });
  it('loads bundled demo audio from a local asset instead of the API', () => {
    const blob = new Blob(['demo'], { type: 'audio/wav' });
    let received: Blob | undefined;
    service.audio('demo-house').subscribe(value => { received = value; });
    const request = http.expectOne('/audio/demos/house.wav');
    expect(request.request.responseType).toBe('blob');
    request.flush(blob);
    expect(received).toBe(blob);
  });

  it('preserves authenticated API loading for uploaded tracks', () => {
    service.audio('track-42').subscribe();
    const request = http.expectOne('/api/tracks/track-42/audio');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob());
  });

});
