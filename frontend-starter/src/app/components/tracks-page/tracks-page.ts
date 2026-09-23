import { Component, inject, OnDestroy, signal } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';

@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent implements OnDestroy {
  private static readonly maxFileSize = 25 * 1024 * 1024;
  private static readonly allowedTypes = new Set([
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
  ]);
  private readonly service = inject(TrackService);

  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly deletingId = signal<string | null>(null);
  readonly error = signal('');
  readonly success = signal('');
  readonly audioUrl = signal('');
  readonly playingTitle = signal('');
  readonly title = new FormControl('', { nonNullable: true });
  file?: File;

  constructor() {
    this.load();
  }

  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.error.set('');
    if (!file) {
      this.file = undefined;
      return;
    }
    if (!TracksPageComponent.allowedTypes.has(file.type)) {
      this.file = undefined;
      input.value = '';
      this.error.set('Format refusé. Choisissez un fichier MP3, WAV, OGG ou M4A.');
      return;
    }
    if (file.size > TracksPageComponent.maxFileSize) {
      this.file = undefined;
      input.value = '';
      this.error.set('Le fichier dépasse la taille maximale de 25 Mo.');
      return;
    }
    this.file = file;
    console.debug('[TracksPage] Fichier sélectionné', this.file?.name);
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.service.list(this.page()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
        this.pages.set(response.pages);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[TracksPage] Chargement impossible', error);
        this.error.set('Impossible de charger les pistes.');
        this.loading.set(false);
      },
    });
  }

  go(page: number): void {
    if (page < 1 || page > this.pages() || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  upload(): void {
    if (!this.file || this.uploading()) return;

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.error.set('');
    this.success.set('');
    this.service.upload(this.file, this.title.value || this.file.name).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress.set(Math.round(100 * event.loaded / event.total));
        }
        if (event.type === HttpEventType.Response) {
          console.debug('[TracksPage] Piste envoyée', event.body?.id);
          this.title.setValue('');
          this.file = undefined;
          this.uploading.set(false);
          this.uploadProgress.set(100);
          this.success.set('Piste importée avec succès.');
          this.page.set(1);
          this.load();
        }
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Envoi impossible', error);
        this.error.set(error.error?.message ?? 'Impossible d’importer la piste.');
        this.uploading.set(false);
        this.uploadProgress.set(0);
      },
    });
  }

  play(track: Track): void {
    this.error.set('');
    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Audio chargé', track.id);
        const previousUrl = this.audioUrl();
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        this.audioUrl.set(URL.createObjectURL(blob));
        this.playingTitle.set(track.title);
      },
      error: (error) => {
        console.error('[TracksPage] Lecture impossible', error);
        this.error.set(`Impossible de lire « ${track.title} ».`);
      },
    });
  }

  remove(track: Track): void {
    if (this.deletingId() || !confirm(`Supprimer « ${track.title} » ?`)) return;
    this.deletingId.set(track.id);
    this.error.set('');
    this.success.set('');
    this.service.delete(track.id).subscribe({
      next: () => {
        this.success.set('Piste supprimée.');
        this.deletingId.set(null);
        if (this.tracks().length === 1 && this.page() > 1) this.page.update((page) => page - 1);
        this.load();
      },
      error: (error: { status?: number; error?: { message?: string } }) => {
        console.error('[TracksPage] Suppression impossible', error);
        this.error.set(error.status === 404
          ? 'Cette piste n’existe plus ou ne vous appartient pas.'
          : (error.error?.message ?? 'Impossible de supprimer la piste.'));
        this.deletingId.set(null);
      },
    });
  }

  formatSize(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.ceil(bytes / 1024)} Ko`
      : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  ngOnDestroy(): void {
    const url = this.audioUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
