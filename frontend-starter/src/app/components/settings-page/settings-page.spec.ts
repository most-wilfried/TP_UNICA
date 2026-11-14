import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsPageComponent } from './settings-page';
import { CommunityService } from '../../shared/services/community.service';
import { AuthService } from '../../shared/services/auth.service';
import { User } from '../../shared/models/user.model';

describe('Settings responses after account changes',()=>{
  const user=(id:string):User=>({id,name:id,email:id+'@example.test',createdAt:'2026-10-14'});
  afterEach(()=>{TestBed.resetTestingModule();vi.restoreAllMocks();});
  it('does not overwrite the current account with a previous settings response',()=>{
    const response=new Subject<User>();const auth={token:signal('old'),currentUser:signal(user('old'))};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:auth},{provide:CommunityService,useValue:{settings:()=>response}}]});
    const component=TestBed.runInInjectionContext(()=>new SettingsPageComponent());
    component.name.setValue('Old account');component.save();auth.token.set('new');auth.currentUser.set(user('new'));response.next(user('old'));
    expect(auth.currentUser()?.id).toBe('new');
  });
  it('does not log out a new account when deletion of the earlier account finishes',()=>{
    vi.spyOn(window,'confirm').mockReturnValue(true);const response=new Subject<void>();
    const auth={token:signal('old'),logout:vi.fn()};
    TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:auth},{provide:CommunityService,useValue:{deleteAccount:()=>response}}]});
    const component=TestBed.runInInjectionContext(()=>new SettingsPageComponent());
    component.password.setValue('local-test');component.delete();auth.token.set('new');response.next();
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
