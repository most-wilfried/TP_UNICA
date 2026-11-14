import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, expect, it, vi } from 'vitest';
import { DjAudioService } from '../../shared/services/dj-audio.service';
import { MixAccountComponent } from './mix-account';

describe('Account mix snapshots', () => {
  it('saves settings with the existing projects API and restores a valid snapshot', async () => {
    await TestBed.configureTestingModule({ imports: [MixAccountComponent], providers: [provideRouter([]),DjAudioService, provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const fixture = TestBed.createComponent(MixAccountComponent);
    fixture.componentRef.setInput('tracks', { A: null, B: null }); fixture.detectChanges();
    const component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    component.engine.eq('A', 'bass', 4); component.save();
    const request = http.expectOne('/api/projects');
    expect(request.request.method).toBe('POST');
    const snapshot = request.request.body.settings.effects;
    expect(snapshot.decks.A.settings.bass).toBe(4);
    expect(snapshot).not.toHaveProperty('token'); expect(snapshot).not.toHaveProperty('microphone');
    const project = { id: 'saved', name: 'Mon mix', settings: { effects: snapshot }, artist: '', genre: '', tags: [], coverImageUrl: '', updatedAt: '' };
    request.flush(project);
    const emit = vi.spyOn(component.restore, 'emit'); component.load(project);
    expect(emit).toHaveBeenCalledWith(snapshot);
    component.load({ ...project, settings: { effects: { studioVersion: 1 } } });
    expect(component.error()).toContain('incompatible');
    http.verify(); fixture.destroy();
  });
});
