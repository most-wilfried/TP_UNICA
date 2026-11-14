import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppComponent } from './app';
import { AuthService } from '../../shared/services/auth.service';
import { CommunityService } from '../../shared/services/community.service';
import { MusicPlayerService } from '../../shared/services/music-player.service';

describe('Account changes in the application shell',()=>{
  afterEach(()=>{TestBed.resetTestingModule();localStorage.clear();});
  it('clears private counters and ignores notifications belonging to an earlier session',async()=>{
    const auth={token:signal<string|null>('alice-session'),currentUser:signal(null),profile:vi.fn(()=>of({}))};
    const requests:Subject<{messages:number;unread:number}>[]=[];
    const community={notifications:vi.fn(()=>{const request=new Subject<{messages:number;unread:number}>();requests.push(request);return request;})};
    const player={current:signal(null),close:vi.fn(),pause:vi.fn()};
    await TestBed.configureTestingModule({imports:[AppComponent],providers:[provideRouter([]),{provide:AuthService,useValue:auth},{provide:CommunityService,useValue:community},{provide:MusicPlayerService,useValue:player}]}).compileComponents();
    const fixture=TestBed.createComponent(AppComponent);fixture.detectChanges();
    requests[0].next({messages:3,unread:5});expect(fixture.componentInstance.unread()).toBe(3);
    auth.token.set(null);fixture.detectChanges();
    expect(fixture.componentInstance.unread()).toBe(0);expect(fixture.componentInstance.notificationUnread()).toBe(0);
    requests[0].next({messages:9,unread:9});expect(fixture.componentInstance.unread()).toBe(0);
    auth.token.set('bob-session');fixture.detectChanges();requests[1].next({messages:1,unread:2});
    requests[0].next({messages:99,unread:99});
    expect(fixture.componentInstance.unread()).toBe(1);expect(fixture.componentInstance.notificationUnread()).toBe(2);
    expect(player.close).toHaveBeenCalled();fixture.destroy();
  });
});
