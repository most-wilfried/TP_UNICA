import { Component, inject, signal, OnInit } from '@angular/core';
import { CommunityService } from '../../shared/services/community.service';
import { Profile,AdminReport,CommunityTrack } from '../../shared/models/community.model';
@Component({templateUrl:'./admin-page.html'})
export class AdminPageComponent implements OnInit {
  private readonly api=inject(CommunityService);readonly users=signal<Profile[]>([]);readonly reports=signal<AdminReport[]>([]);readonly tracks=signal<CommunityTrack[]>([]);readonly error=signal('');readonly loading=signal(false);
  ngOnInit(){this.load();}
  load(){this.loading.set(true);this.api.admin().subscribe({next:result=>{this.users.set(result.users);this.reports.set(result.reports);this.tracks.set(result.tracks);this.loading.set(false);},error:error=>{console.error('[Administration] Accès refusé',error);this.error.set('Accès refusé ou administration indisponible.');this.loading.set(false);}});}
  moderate(track:CommunityTrack,hidden:boolean){this.api.moderate(track.id,hidden).subscribe({next:()=>this.load(),error:error=>{console.error('[Administration] Modération impossible',error);this.error.set('Action impossible.');}});}
  suspend(user:Profile,suspended:boolean){this.api.suspend(user.id,suspended).subscribe({next:()=>this.load(),error:error=>{console.error('[Administration] Modification impossible',error);this.error.set('Action impossible.');}});}
  resolve(report:AdminReport){this.api.resolve(report.id).subscribe({next:()=>this.load(),error:error=>{console.error('[Administration] Résolution impossible',error);this.error.set('Action impossible.');}});}
}
