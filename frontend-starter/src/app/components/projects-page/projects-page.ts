import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MixProject } from '../../shared/models/mix-project.model';
import { ProjectService } from '../../shared/services/project.service';

@Component({
  imports: [ReactiveFormsModule],
  template: `
    <section class="card">
      <p class="eyebrow">PROJETS</p><h1>Mes projets de mixage</h1>
      <div class="marker-form"><input [formControl]="name" placeholder="Nom du projet" />
        <button type="button" (click)="create()" [disabled]="!name.value.trim()">Créer</button></div>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @for (project of projects(); track project.id) {
        <article class="track"><div><b>{{ project.name }}</b><small>{{ project.artist || 'Artiste non renseigné' }} · {{ project.genre || 'Genre non renseigné' }}</small></div>
          <button class="danger" type="button" (click)="remove(project)">Supprimer</button></article>
      } @empty { <p>Aucun projet enregistré.</p> }
    </section>`,
})
export class ProjectsPageComponent {
  private readonly service = inject(ProjectService);
  readonly projects = signal<MixProject[]>([]);
  readonly error = signal('');
  readonly name = new FormControl('', { nonNullable: true });
  constructor() { this.load(); }
  load() { this.service.list().subscribe({ next: (items) => this.projects.set(items), error: () => this.error.set('Impossible de charger les projets.') }); }
  create() { this.service.create(this.name.value.trim()).subscribe({ next: () => { this.name.setValue(''); this.load(); }, error: () => this.error.set('Création impossible.') }); }
  remove(project: MixProject) { if (confirm(`Supprimer « ${project.name} » ?`)) this.service.delete(project.id).subscribe({ next: () => this.load(), error: () => this.error.set('Suppression impossible.') }); }
}
