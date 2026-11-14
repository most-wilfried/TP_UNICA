import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Page } from '../models/page.model';
import { DemoTrackService } from './demo-track.service';
import { Track } from '../models/track.model';

/** Encapsulates all HTTP operations for backing tracks. */
@Injectable({ providedIn: 'root' })
export class TrackService {
  private readonly http = inject(HttpClient);
  private readonly demos = inject(DemoTrackService);

  list(page = 1, limit = 5, q = ''): Observable<Page<Track>> {
    return this.http.get<Page<Track>>('/api/tracks', {
      params: { page, limit, ...(q.trim()?{q:q.trim()}: {}) },
    });
  }

  upload(file: File, title: string, metadata: {style?:string;kind?:string;parentId?:string;parentIds?:string;duration?:string} = {}): Observable<HttpEvent<Track>> {
    const body = new FormData();
    body.append('audio', file);
    body.append('title', title);
    for(const [key,value] of Object.entries(metadata))if(value)body.append(key,value);
    return this.http.post<Track>('/api/tracks', body, {
      observe: 'events',
      reportProgress: true,
    });
  }

  audio(id: string): Observable<Blob> {
    const demo = this.demos.find(id);
    return this.http.get(demo?.url ?? `/api/tracks/${encodeURIComponent(id)}/audio`, {
      responseType: 'blob',
    });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`/api/tracks/${encodeURIComponent(id)}`);
  }
}
