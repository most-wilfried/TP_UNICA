import { PersistentPlayerComponent } from '../persistent-player/persistent-player';
import { MusicPlayerService } from '../../shared/services/music-player.service';
import { CommunityService } from '../../shared/services/community.service';
import { OnDestroy, effect } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [PersistentPlayerComponent, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class AppComponent implements OnDestroy {
  readonly player=inject(MusicPlayerService);
  private readonly community=inject(CommunityService);
  readonly unread=signal(0);readonly notificationUnread=signal(0);
  private noticeTimer?:ReturnType<typeof setInterval>;
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly mixingLayout = toSignal(this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    map(event => event.urlAfterRedirects.split(/[?#]/)[0].match(/^\/(studio|player)(\/|$)/) !== null),
    startWith(this.router.url.split(/[?#]/)[0].match(/^\/(studio|player)(\/|$)/) !== null),
  ), { requireSync: true });
  private readonly document = inject(DOCUMENT);
  readonly darkMode = signal(this.initialDarkMode());

  constructor() {
    this.applyTheme(this.darkMode());
    effect(()=>{if(this.mixingLayout())this.player.pause();});
    effect(onCleanup=>{
      const token=this.auth.token();
      this.player.close();this.unread.set(0);this.notificationUnread.set(0);
      if(!token)return;
      const request=this.auth.profile().subscribe({next:()=>undefined,error:error=>console.error('[Compte] Profil indisponible',error)});
      onCleanup(()=>request.unsubscribe());
      this.refreshNotifications();
    });
    this.noticeTimer=setInterval(()=>{if(this.auth.token())this.refreshNotifications();},30000);
  }

  logout(): void {
    this.auth.logout();
    this.player.close();
    void this.router.navigateByUrl('/');
  }

  private refreshNotifications(){const token=this.auth.token();if(!token)return;this.community.notifications().subscribe({next:result=>{if(this.auth.token()!==token)return;this.unread.set(result.messages);this.notificationUnread.set(result.unread);},error:error=>console.error('[Notifications] Indisponibles',error)});}
  ngOnDestroy(){if(this.noticeTimer)clearInterval(this.noticeTimer);this.player.close();}

  toggleTheme(): void {
    const enabled = !this.darkMode();
    this.darkMode.set(enabled);
    localStorage.setItem('most_vibe_theme', enabled ? 'dark' : 'light');
    this.applyTheme(enabled);
  }

  private initialDarkMode(): boolean {
    const savedTheme = localStorage.getItem('most_vibe_theme');
    if (savedTheme) return savedTheme === 'dark';
    return false;
  }

  private applyTheme(enabled: boolean): void {
    this.document.documentElement.dataset['theme'] = enabled ? 'dark' : 'light';
  }
}
