import { NgOptimizedImage } from '@angular/common';
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommunityService } from '../../shared/services/community.service';
import { AuthService } from '../../shared/services/auth.service';
import { MusicPlayerService } from '../../shared/services/music-player.service';
import { DemoTrackService } from '../../shared/services/demo-track.service';
import { CommunityTrack, MusicCollection } from '../../shared/models/community.model';
@Component({imports:[ReactiveFormsModule,RouterLink,NgOptimizedImage],templateUrl:'./discovery-page.html',styleUrl:'./discovery-page.css'})
export class DiscoveryPageComponent implements OnInit,OnDestroy {
  private request?:Subscription;
  private readonly api=inject(CommunityService);readonly auth=inject(AuthService);readonly player=inject(MusicPlayerService);readonly demos=inject(DemoTrackService);private readonly router=inject(Router);
  readonly tracks=signal<CommunityTrack[]>([]);readonly albums=signal<MusicCollection[]>([]);readonly loading=signal(false);readonly error=signal('');readonly message=signal('');readonly page=signal(1);readonly pages=signal(1);
  readonly query=new FormControl('',{nonNullable:true});readonly style=new FormControl('',{nonNullable:true});readonly kind=new FormControl('',{nonNullable:true});
  readonly styles=['Hip-hop','Afrobeat','Amapiano','Électro','Pop','Jazz','Rock','House','Reggae','Blues','Autre'];
  ngOnInit(){this.search();this.api.collections(true).subscribe({next:albums=>this.albums.set(albums),error:error=>console.error('[Explorer] Albums indisponibles',error)});this.resumeAction();}
  search(page=1){this.loading.set(true);this.error.set('');this.request?.unsubscribe();this.request=this.api.discover(this.query.value,this.style.value,this.kind.value,page).subscribe({next:result=>{this.tracks.set(result.items);this.page.set(result.page);this.pages.set(result.pages);this.loading.set(false);},error:error=>{console.error('[Explorer] Recherche indisponible',error);this.error.set('La communauté est momentanément indisponible. Les boucles MOST VIBE restent accessibles.');this.loading.set(false);}});}
  react(track:CommunityTrack,kind:'like'|'favorite'){if(!this.auth.token()){sessionStorage.setItem('most_vibe_pending_action',JSON.stringify({id:track.id,kind}));void this.router.navigate(['/login'],{queryParams:{returnTo:'/explore'}});return;}this.api.reaction(track.id,kind).subscribe({next:()=>this.message.set(kind==='like'?'J’aime enregistré.':'Piste ajoutée aux favoris.'),error:error=>{console.error('[Explorer] Réaction impossible',error);this.error.set('Cette piste n’est plus accessible.');}});}
  report(track:CommunityTrack){if(!this.auth.token()){this.defer(track.id,'report');return;}const reason=prompt('Motif du signalement');if(!reason)return;this.api.report(track.id,reason).subscribe({next:()=>this.message.set('Signalement transmis.'),error:error=>{console.error('[Explorer] Signalement impossible',error);this.error.set('Signalement impossible.');}});}
  remix(track:CommunityTrack){if(!this.auth.token()){this.defer(track.id,'remix');return;}if(!track.remixAllowed){this.error.set('Le créateur n’autorise plus les remixes de cette piste.');return;}sessionStorage.setItem('gpc_selected_track',JSON.stringify(track));sessionStorage.setItem('most_vibe_remix_source',track.id);void this.router.navigate(['/studio',track.id]);}
  ngOnDestroy(){this.request?.unsubscribe();}
  private defer(id:string,kind:'remix'|'report'){
    sessionStorage.setItem('most_vibe_pending_action',JSON.stringify({id,kind}));
    void this.router.navigate(['/login'],{queryParams:{returnTo:'/explore'}});
  }
  private resumeAction(){
    const stored=sessionStorage.getItem('most_vibe_pending_action');
    if(!stored||!this.auth.token())return;
    sessionStorage.removeItem('most_vibe_pending_action');
    try{
      const value:unknown=JSON.parse(stored);
      if(!value||typeof value!=='object'||!('id'in value)||typeof value.id!=='string'||!(/^[a-f0-9]{24}$/i.test(value.id))||!('kind'in value))return;
      if(value.kind==='like'||value.kind==='favorite'){
        this.api.reaction(value.id,value.kind).subscribe({next:()=>this.message.set('Votre action a été reprise après connexion.'),error:error=>{console.error('[Explorer] Reprise impossible',error);this.error.set('La piste n’est plus accessible.');}});
      }else if(value.kind==='remix'||value.kind==='report'){
        const kind=value.kind;
        this.api.detail(value.id).subscribe({
          next:track=>{if(kind==='remix')this.remix(track);else this.report(track);},
          error:error=>{console.error('[Explorer] Reprise impossible',error);this.error.set('La piste n’est plus accessible.');},
        });
      }
    }catch(error){console.error('[Explorer] Action locale invalide',error);}
  }
}
