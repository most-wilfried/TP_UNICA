import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envoie les identifiants à POST /api/auth/login et mémorise la session', () => {
    service.login('test@example.com', 'motdepasse').subscribe();

    const request = http.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'test@example.com',
      password: 'motdepasse',
    });
    request.flush({
      token: 'jwt-test',
      user: { id: '1', name: 'Test', email: 'test@example.com', createdAt: '2026-01-01' },
    });

    expect(service.token()).toBe('jwt-test');
    expect(service.currentUser()?.name).toBe('Test');
  });

  it('ignore un ancien profil reçu après une déconnexion',()=>{
    service.token.set('ancienne-session');service.profile().subscribe();
    const request=http.expectOne('/api/users/me');service.logout();
    request.flush({id:'1',name:'Ancien compte',email:'ancien@example.test',createdAt:'2026-01-01'});
    expect(service.currentUser()).toBeNull();expect(service.token()).toBeNull();
  });

  it('ne remplace pas le profil du nouveau compte par une ancienne réponse',()=>{
    service.token.set('ancienne-session');service.profile().subscribe();
    const oldProfile=http.expectOne('/api/users/me');
    service.login('nouveau@example.test','motdepasse').subscribe();
    http.expectOne('/api/auth/login').flush({token:'nouvelle-session',user:{id:'2',name:'Nouveau compte',email:'nouveau@example.test',createdAt:'2026-01-01'}});
    oldProfile.flush({id:'1',name:'Ancien compte',email:'ancien@example.test',createdAt:'2026-01-01'});
    expect(service.currentUser()?.id).toBe('2');expect(service.token()).toBe('nouvelle-session');
  });
});
