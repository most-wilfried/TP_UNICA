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
  const isPublicRequest = request.url.endsWith('/api/auth/login') ||
    request.url.endsWith('/api/auth/register') || request.url.endsWith('/api/health');
  const authenticatedRequest = token && !isPublicRequest
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticatedRequest).pipe(
    catchError((error: { status?: number }) => {
      if (error.status === 401 && !isPublicRequest) {
        auth.logout();
        void router.navigateByUrl('/login');
      }
      return throwError(() => error);
    }),
  );
};
