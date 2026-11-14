import { TestBed } from '@angular/core/testing';
import { provideRouter,Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { DiscoveryPageComponent } from './discovery-page';
import { CommunityService } from '../../shared/services/community.service';
import { AuthService } from '../../shared/services/auth.service';
import { MusicPlayerService } from '../../shared/services/music-player.service';
const track={id:'abcdef123456abcdef123456',title:'Une vibe publique',originalName:'test.wav',mimeType:'audio/wav',size:100,createdAt:'2026-10-14',author:'Alice',style:'House',visibility:'public' as const};
describe('Public discovery and deferred actions',()=>{
 afterEach(()=>{sessionStorage.removeItem('most_vibe_pending_action');sessionStorage.removeItem('gpc_selected_track');sessionStorage.removeItem('most_vibe_remix_source');});
 it('allows public listening and resumes a favorite after login',async()=>{
  const api={discover:vi.fn(()=>of({items:[track],page:1,pages:1})),collections:vi.fn(()=>of([])),reaction:vi.fn(()=>of({}))};
  const auth={token:signal<string|null>(null)};const player={play:vi.fn()};
  await TestBed.configureTestingModule({imports:[DiscoveryPageComponent],providers:[provideRouter([]),{provide:CommunityService,useValue:api},{provide:AuthService,useValue:auth},{provide:MusicPlayerService,useValue:player}]}).compileComponents();
  const router=TestBed.inject(Router);const navigate=vi.spyOn(router,'navigate').mockResolvedValue(true);
  const fixture=TestBed.createComponent(DiscoveryPageComponent);fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Une vibe publique');
  fixture.componentInstance.player.play(track);expect(player.play).toHaveBeenCalledWith(track);
  fixture.componentInstance.react(track,'favorite');expect(api.reaction).not.toHaveBeenCalled();expect(navigate).toHaveBeenCalledWith(['/login'],{queryParams:{returnTo:'/explore'}});
  fixture.destroy();auth.token.set('test');const next=TestBed.createComponent(DiscoveryPageComponent);next.detectChanges();
  expect(api.reaction).toHaveBeenCalledWith(track.id,'favorite');expect(sessionStorage.getItem('most_vibe_pending_action')).toBeNull();next.destroy();
 });
 it('resumes a remix after login using the current server permissions',async()=>{
  const remixable={...track,remixAllowed:true};
  const api={discover:vi.fn(()=>of({items:[remixable],page:1,pages:1})),collections:vi.fn(()=>of([])),detail:vi.fn(()=>of(remixable))};
  const auth={token:signal<string|null>(null)};
  await TestBed.configureTestingModule({imports:[DiscoveryPageComponent],providers:[provideRouter([]),{provide:CommunityService,useValue:api},{provide:AuthService,useValue:auth},{provide:MusicPlayerService,useValue:{play:vi.fn()}}]}).compileComponents();
  const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  const guest=TestBed.createComponent(DiscoveryPageComponent);guest.detectChanges();guest.componentInstance.remix(remixable);
  expect(navigate).toHaveBeenCalledWith(['/login'],{queryParams:{returnTo:'/explore'}});guest.destroy();
  auth.token.set('test');const member=TestBed.createComponent(DiscoveryPageComponent);member.detectChanges();
  expect(api.detail).toHaveBeenCalledWith(track.id);expect(navigate).toHaveBeenCalledWith(['/studio',track.id]);
  expect(JSON.parse(sessionStorage.getItem('gpc_selected_track')||'null')).toEqual(remixable);member.destroy();
 });
 it('stops a deferred remix when the owner has withdrawn permission',async()=>{
  sessionStorage.setItem('most_vibe_pending_action',JSON.stringify({id:track.id,kind:'remix'}));
  const api={discover:vi.fn(()=>of({items:[track],page:1,pages:1})),collections:vi.fn(()=>of([])),detail:vi.fn(()=>of({...track,remixAllowed:false}))};
  await TestBed.configureTestingModule({imports:[DiscoveryPageComponent],providers:[provideRouter([]),{provide:CommunityService,useValue:api},{provide:AuthService,useValue:{token:signal('test')}},{provide:MusicPlayerService,useValue:{play:vi.fn()}}]}).compileComponents();
  const navigate=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);
  const fixture=TestBed.createComponent(DiscoveryPageComponent);fixture.detectChanges();
  expect(navigate).not.toHaveBeenCalled();expect(fixture.componentInstance.error()).toContain('n’autorise plus');fixture.destroy();
 });
});
