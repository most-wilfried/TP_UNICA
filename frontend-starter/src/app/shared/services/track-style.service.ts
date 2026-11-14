import { inject, Injectable, signal } from '@angular/core';

import { DemoTrackService } from './demo-track.service';

@Injectable({ providedIn: 'root' })
export class TrackStyleService {
  private readonly demos = inject(DemoTrackService);
  readonly styles = ['Non classé', 'Afrobeat', 'Amapiano', 'Blues', 'Classique', 'Électro', 'Hip-hop', 'House', 'Jazz', 'Pop', 'Reggae', 'Rock', 'Zouk', 'Autre'];
  private readonly storageKey = 'gpc_account_track_styles';
  private readonly assignments = signal<Record<string, Record<string, string>>>(this.read());

  get(id: string): string { return this.assignments()[this.scope()]?.[id] ?? this.demos.find(id)?.style ?? 'Non classé'; }

  set(id: string, style: string): void {
    if (!this.styles.includes(style)) return;
    this.assignments.update(values => ({ ...values, [this.scope()]: { ...values[this.scope()], [id]: style } }));
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.assignments())); }
    catch (error) { console.error('[Styles] Enregistrement local impossible', error); }
  }

  color(id: string): string {
    const colors: Record<string, string> = { House: '#007FFF', 'Hip-hop': '#7865C4', Afrobeat: '#007BC7', Amapiano: '#946BCC', Reggae: '#537BD1', Blues: '#416DCB', Jazz: '#7C6DC0', Rock: '#5B6BC8', Pop: '#946BCC', 'Électro': '#007FFF', Zouk: '#7865C4', Classique: '#7865C4' };
    return colors[this.get(id)] ?? 'var(--dj-accent-a)';
  }
  snapshot(): Record<string, string> { return { ...this.assignments()[this.scope()] }; }
  restore(values: Record<string, string>): void {
    for (const [id, style] of Object.entries(values)) if (typeof id === 'string' && id.length <= 120) this.set(id, style);
  }
  private scope(): string {
    const token = localStorage.getItem('gpc_token') ?? '';
    try {
      const payload: unknown = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload && typeof payload === 'object' && 'sub' in payload && typeof payload.sub === 'string') return payload.sub;
    } catch { /* An opaque token uses an isolated local cache, never authorization. */ }
    let hash = 2166136261;
    for (const character of token) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return token ? `session-${hash >>> 0}` : 'anonymous';
  }
  private read(): Record<string, Record<string, string>> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored && localStorage.getItem('gpc_token')) {
        const legacy: unknown = JSON.parse(localStorage.getItem('gpc_track_styles') ?? '{}');
        if (legacy && typeof legacy === 'object' && !Array.isArray(legacy)) {
          const clean = Object.fromEntries(Object.entries(legacy).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && this.styles.includes(entry[1])));
          const migrated = { [this.scope()]: clean };
          localStorage.setItem(this.storageKey, JSON.stringify(migrated));
          return migrated;
        }
      }
      const value: unknown = JSON.parse(stored ?? '{}');
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return Object.fromEntries(Object.entries(value).filter(([, styles]) => styles && typeof styles === 'object' && !Array.isArray(styles)).map(([id, styles]) => [id, Object.fromEntries(Object.entries(styles as Record<string, unknown>).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && this.styles.includes(entry[1])))]));
    } catch (error) { console.error('[Styles] Lecture locale impossible', error); return {}; }
  }
}
