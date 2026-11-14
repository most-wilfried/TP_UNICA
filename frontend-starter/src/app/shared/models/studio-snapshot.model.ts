import { DjDeckState } from './dj-deck.model';
import { Track } from './track.model';

export interface StudioSnapshot {
  studioVersion: 1;
  decks: Record<'A' | 'B', { track: Track | null; settings: DjDeckState }>;
  master: number;
  crossfade: number;
  styles: Record<string, string>;
}
