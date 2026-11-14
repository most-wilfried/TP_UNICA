import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('ajoute Authorization lorsqu’un token existe', () => {
    auth.token.set('jwt-test');

    auth.profile().subscribe();

    const request = http.expectOne('/api/users/me');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-test');
    request.flush({ id: '1', name: 'Test', email: 'test@example.com', createdAt: '2026-01-01' });
  });
  it('never sends the JWT to local audio assets or third-party URLs', () => {
    auth.token.set('jwt-test');
    const client = TestBed.inject(HttpClient);
    for (const url of ['/audio/demos/house.wav', 'https://example.test/api/tracks']) {
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('ne ferme pas la nouvelle session quand une ancienne requête reçoit 401',()=>{
    const navigate=vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);
    auth.token.set('ancienne-session');auth.profile().subscribe({error:()=>undefined});
    const oldRequest=http.expectOne('/api/users/me');auth.token.set('nouvelle-session');
    oldRequest.flush({message:'Session expirée'},{status:401,statusText:'Unauthorized'});
    expect(auth.token()).toBe('nouvelle-session');expect(navigate).not.toHaveBeenCalled();
  });

  it('ferme la session courante si le serveur refuse son token',()=>{
    const navigate=vi.spyOn(TestBed.inject(Router),'navigateByUrl').mockResolvedValue(true);
    auth.token.set('session-refusée');auth.profile().subscribe({error:()=>undefined});
    http.expectOne('/api/users/me').flush({message:'Session expirée'},{status:401,statusText:'Unauthorized'});
    expect(auth.token()).toBeNull();expect(navigate).toHaveBeenCalledWith('/login');
  });

});
