import { Injectable } from '@angular/core';
import { DemoTrack } from '../models/demo-track.model';
import catalog from '../models/demo-tracks.json';

@Injectable({ providedIn: 'root' })
export class DemoTrackService {
  readonly tracks: readonly DemoTrack[] = catalog;
  find(id: string): DemoTrack | undefined { return this.tracks.find(track => track.id === id); }
}
