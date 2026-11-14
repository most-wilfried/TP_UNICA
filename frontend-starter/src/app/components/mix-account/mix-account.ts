import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MixProject } from '../../shared/models/mix-project.model';
import { StudioSnapshot } from '../../shared/models/studio-snapshot.model';
import { Track } from '../../shared/models/track.model';
import { DjAudioService } from '../../shared/services/dj-audio.service';
import { ProjectService } from '../../shared/services/project.service';
import { TrackStyleService } from '../../shared/services/track-style.service';

@Component({ selector: 'app-mix-account', imports: [ReactiveFormsModule], templateUrl: './mix-account.html', styleUrl: './mix-account.css' })
export class MixAccountComponent implements OnInit {
  private readonly route=inject(ActivatedRoute);
  ngOnInit(){const selected=this.route.snapshot.queryParamMap.get('project');if(selected)this.projects.list().subscribe({next:items=>{const item=items.find(project=>project.id===selected);if(item)this.load(item);else this.error.set('Brouillon inaccessible.');},error:error=>{console.error('[Brouillon] Reprise impossible',error);this.error.set('Impossible de reprendre ce brouillon.');}});}
  private readonly projects = inject(ProjectService);
  readonly engine = inject(DjAudioService);
  private readonly styles = inject(TrackStyleService);
  readonly tracks = input.required<Record<'A' | 'B', Track | null>>();
  readonly restore = output<StudioSnapshot>();
  readonly name = new FormControl('Mon mix', { nonNullable: true });
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly saved = signal<MixProject[]>([]);

  save(): void {
    if (this.busy() || !this.name.value.trim()) return;
    const snapshot: StudioSnapshot = {
      studioVersion: 1,
      decks: { A: { track: this.tracks().A, settings: this.engine.decks().A }, B: { track: this.tracks().B, settings: this.engine.decks().B } },
      master: this.engine.master(), crossfade: this.engine.crossfade(), styles: this.styles.snapshot(),
    };
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.projects.create(this.name.value.trim().slice(0, 120), snapshot).subscribe({
      next: project => { this.saved.update(items => [project, ...items]); this.busy.set(false); this.message.set('Réglages et styles sauvegardés dans votre compte.'); },
      error: error => { console.error('[Studio] Sauvegarde impossible', error); this.error.set('Impossible de sauvegarder le mix dans votre compte.'); this.busy.set(false); },
    });
  }

  list(): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.projects.list().subscribe({
      next: items => { this.saved.set(items.filter(item => this.isSnapshot(item.settings?.effects))); this.busy.set(false); },
      error: error => { console.error('[Studio] Chargement des sauvegardes impossible', error); this.error.set('Impossible de charger vos sauvegardes.'); this.busy.set(false); },
    });
  }

  load(project: MixProject): void {
    const snapshot = project.settings?.effects;
    if (!this.isSnapshot(snapshot)) { this.error.set('Sauvegarde incompatible.'); return; }
    this.restore.emit(snapshot);
    this.message.set('Réglages restaurés ; les pistes sont rechargées sans lecture automatique.');
  }

  private isSnapshot(value: unknown): value is StudioSnapshot {
    if (!value || typeof value !== 'object' || !('studioVersion' in value) || value.studioVersion !== 1) return false;
    if (!('decks' in value) || !value.decks || typeof value.decks !== 'object') return false;
    return ['A', 'B'].every(id => {
      const deck = (value.decks as Record<string, unknown>)[id];
      return deck && typeof deck === 'object' && 'settings' in deck && !!deck.settings && typeof deck.settings === 'object';
    });
  }
}
