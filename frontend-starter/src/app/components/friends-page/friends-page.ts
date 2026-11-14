import { Component, inject, signal, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommunityService } from '../../shared/services/community.service';
import { Friendship,Profile,CommunityTrack,MusicCollection } from '../../shared/models/community.model';
import { MusicPlayerService } from '../../shared/services/music-player.service';
@Component({imports:[ReactiveFormsModule,RouterLink],templateUrl:'./friends-page.html'})
export class FriendsPageComponent implements OnInit {
  private readonly api=inject(CommunityService);readonly player=inject(MusicPlayerService);readonly query=new FormControl('',{nonNullable:true});readonly results=signal<Profile[]>([]);readonly relations=signal<Friendship[]>([]);readonly activity=signal<CommunityTrack[]>([]);readonly albums=signal<MusicCollection[]>([]);readonly error=signal('');readonly message=signal('');readonly loading=signal(false);
  ngOnInit(){this.load();}
  load(){this.loading.set(true);this.api.friends().subscribe({next:items=>{this.relations.set(items);this.loading.set(false);},error:error=>this.fail(error)});this.api.activity().subscribe({next:result=>{this.activity.set(result.tracks);this.albums.set(result.albums);},error:error=>this.fail(error)});}
  search(){this.api.profiles(this.query.value).subscribe({next:items=>this.results.set(items),error:error=>this.fail(error)});}
  invite(user:Profile){this.api.invite(user.id).subscribe({next:()=>{this.message.set('Invitation envoyée.');this.load();},error:error=>this.fail(error)});}
  respond(friend:Friendship,accept:boolean){this.api.respond(friend.id,accept).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  remove(friend:Friendship){this.api.removeFriend(friend.id).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  block(user:Profile){this.api.block(user.id).subscribe({next:()=>{this.results.update(items=>items.filter(item=>item.id!==user.id));this.load();this.message.set('Utilisateur bloqué. Les accès privés et les messages sont interrompus.');},error:error=>this.fail(error)});}
  private fail(error:unknown){console.error('[Amis] Opération impossible',error);this.error.set('Opération impossible. Vérifiez votre connexion et les droits.');this.loading.set(false);}
}
