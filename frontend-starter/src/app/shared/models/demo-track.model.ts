import { Track } from './track.model';

export interface DemoTrack extends Track {
  style: string;
  bpm: number;
  url: string;
  duration: number;
}
