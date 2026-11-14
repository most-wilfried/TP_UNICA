import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MessagesPageComponent } from './messages-page';
import { CommunityService } from '../../shared/services/community.service';
import { TrackService } from '../../shared/services/track.service';
import { AuthService } from '../../shared/services/auth.service';
import { MusicPlayerService } from '../../shared/services/music-player.service';
import { Friendship } from '../../shared/models/community.model';

describe('Conversation changes and drafts',()=>{
  afterEach(()=>TestBed.resetTestingModule());
  it('keeps drafts with the intended recipient and preserves text written during a pending send',async()=>{
    const alice:Friendship={id:'relation-a',status:'accepted',incoming:false,user:{id:'alice',name:'Alice'}};
    const bob:Friendship={id:'relation-b',status:'accepted',incoming:false,user:{id:'bob',name:'Bob'}};
    const pending=new Subject<unknown>();
    const api={friends:vi.fn(()=>of([alice,bob])),messages:vi.fn(()=>of([])),send:vi.fn(()=>pending)};
    await TestBed.configureTestingModule({imports:[MessagesPageComponent],providers:[provideRouter([]),{provide:CommunityService,useValue:api},{provide:TrackService,useValue:{}},{provide:AuthService,useValue:{currentUser:signal({id:'me'})}},{provide:MusicPlayerService,useValue:{play:vi.fn()}}]}).compileComponents();
    const fixture=TestBed.createComponent(MessagesPageComponent);fixture.detectChanges();const component=fixture.componentInstance;
    component.open(alice);component.text.setValue('Message pour Alice');component.open(bob);
    expect(component.text.value).toBe('');component.text.setValue('Message pour Bob');component.send();
    expect(api.send).toHaveBeenCalledWith('bob','Message pour Bob',undefined);
    component.text.setValue('Prochain message');pending.next({});expect(component.text.value).toBe('Prochain message');
    fixture.destroy();
  });
});
