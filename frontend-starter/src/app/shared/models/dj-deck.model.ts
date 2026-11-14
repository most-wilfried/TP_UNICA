export interface DjDeckState {
  title: string;
  duration: number;
  position: number;
  playing: boolean;
  loading: boolean;
  scratching: boolean;
  rate: number;
  volume: number;
  loop: boolean;
  semitones: number;
  bpm: number;
  cues: Array<number | null>;
  bass: number;
  mid: number;
  treble: number;
}
