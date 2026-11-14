import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { TrackStyleService } from './track-style.service';

describe('Per-account styles', () => {
  afterEach(() => { localStorage.removeItem('gpc_token'); localStorage.removeItem('gpc_account_track_styles'); });
  it('isolates manually assigned styles between accounts and validates restored styles', () => {
    localStorage.removeItem('gpc_account_track_styles');
    localStorage.setItem('gpc_token', 'account-a');
    const service = TestBed.inject(TrackStyleService);
    service.set('manual-1', 'House'); expect(service.get('manual-1')).toBe('House');
    localStorage.setItem('gpc_token', 'account-b'); expect(service.get('manual-1')).toBe('Non classé');
    service.restore({ 'manual-1': 'Reggae', bad: '<script>' });
    expect(service.get('manual-1')).toBe('Reggae'); expect(service.get('bad')).toBe('Non classé');
    localStorage.setItem('gpc_token', 'account-a'); expect(service.get('manual-1')).toBe('House');
    expect(service.get('demo-house')).toBe('House');
  });
});
