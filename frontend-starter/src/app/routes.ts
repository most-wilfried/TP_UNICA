import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';
import { LoginPageComponent } from './components/login-page/login-page';
import { ProfilePageComponent } from './components/profile-page/profile-page';
import { RegisterPageComponent } from './components/register-page/register-page';
import { LibraryPageComponent } from './components/library-page/library-page';
import { PlayerPageComponent } from './components/player-page/player-page';
import { StudioPageComponent } from './components/studio-page/studio-page';
import { ProjectsPageComponent } from './components/projects-page/projects-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tracks' },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'profile', component: ProfilePageComponent, canActivate: [authGuard] },
  { path: 'tracks', component: LibraryPageComponent, canActivate: [authGuard] },
  { path: 'player', component: PlayerPageComponent, canActivate: [authGuard] },
  { path: 'player/:id', component: PlayerPageComponent, canActivate: [authGuard] },
  { path: 'studio', component: StudioPageComponent, canActivate: [authGuard] },
  { path: 'studio/:id', component: StudioPageComponent, canActivate: [authGuard] },
  { path: 'projects', component: ProjectsPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'tracks' },
];
