import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Adds the bearer token to protected API requests. */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const url = new URL(request.url, window.location.origin);
  const isApiRequest = url.origin === window.location.origin && url.pathname.startsWith('/api/');
  const isPublicRequest = ['/api/auth/login', '/api/auth/register', '/api/health'].includes(url.pathname);
  const authenticatedRequest = token && isApiRequest && !isPublicRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: { status?: number }) => {
      if (error.status === 401 && token && auth.token()===token && isApiRequest && !isPublicRequest) {
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
