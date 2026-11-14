import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly error = signal('');
  readonly submitting = signal(false);
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    const values = this.form.getRawValue();
    this.auth.login(values.email, values.password).subscribe({
      next: () => {
        this.submitting.set(false);
        console.debug('[LoginPage] Connexion réussie');
        const requested=this.route.snapshot.queryParamMap.get('returnTo');
        void this.router.navigateByUrl(requested && /^\/(explore|studio|tracks|player|friends|messages|settings|collections|projects|profile|admin)(\/|$)/.test(requested.split(/[?#]/)[0]) ? requested : '/explore');
      },
      error: (error: { error?: { message?: string } }) => {
        this.submitting.set(false);
        console.error('[LoginPage] Échec de connexion', error);
        this.error.set(error.error?.message ?? 'Erreur de connexion');
      },
    });
  }
}
