import { Component, computed, inject, input, output, signal } from '@angular/core';
import { DemoTrack } from '../../shared/models/demo-track.model';
import { DemoTrackService } from '../../shared/services/demo-track.service';

@Component({ selector: 'app-demo-library', templateUrl: './demo-library.html', styleUrl: './demo-library.css' })
export class DemoLibraryComponent {
  readonly demos = inject(DemoTrackService);
  readonly mixing = input(false);
  readonly busyA = input(false);
  readonly busyB = input(false);
  readonly chooseDeck = output<{ track: DemoTrack; deck: 'A' | 'B' }>();
  readonly listen = output<DemoTrack>();
  readonly mix = output<DemoTrack>();
  readonly selectedStyle = signal('');
  readonly styles = [...new Set(this.demos.tracks.map(track => track.style))];
  readonly filtered = computed(() => this.demos.tracks.filter(track => !this.selectedStyle() || track.style === this.selectedStyle()));
}
