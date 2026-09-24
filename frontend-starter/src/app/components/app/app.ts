import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  readonly darkMode = signal(this.initialDarkMode());

  constructor() {
    this.applyTheme(this.darkMode());
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  toggleTheme(): void {
    const enabled = !this.darkMode();
    this.darkMode.set(enabled);
    localStorage.setItem('gpc_theme', enabled ? 'dark' : 'light');
    this.applyTheme(enabled);
  }

  private initialDarkMode(): boolean {
    const savedTheme = localStorage.getItem('gpc_theme');
    if (savedTheme) return savedTheme === 'dark';
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  private applyTheme(enabled: boolean): void {
    this.document.documentElement.dataset['theme'] = enabled ? 'dark' : 'light';
  }
}
