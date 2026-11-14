import { Component, inject, signal, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CommunityService } from '../../shared/services/community.service';
import { TrackService } from '../../shared/services/track.service';
import { MusicPlayerService } from '../../shared/services/music-player.service';
import { MusicCollection,CommunityTrack } from '../../shared/models/community.model';
@Component({imports:[ReactiveFormsModule],templateUrl:'./collections-page.html'})
export class CollectionsPageComponent implements OnInit {
  private readonly api=inject(CommunityService);private readonly tracksApi=inject(TrackService);readonly player=inject(MusicPlayerService);readonly items=signal<MusicCollection[]>([]);readonly favorites=signal<CommunityTrack[]>([]);readonly tracks=signal<CommunityTrack[]>([]);readonly name=new FormControl('',{nonNullable:true});readonly kind=new FormControl<'album'|'playlist'>('playlist',{nonNullable:true});readonly visibility=new FormControl('private',{nonNullable:true});readonly error=signal('');readonly loading=signal(false);readonly page=signal(1);readonly pages=signal(1);
  ngOnInit(){this.load();this.loadTracks();}
  load(){this.loading.set(true);this.api.collections().subscribe({next:items=>{this.items.set(items);this.loading.set(false);},error:error=>this.fail(error)});this.api.favorites().subscribe({next:items=>this.favorites.set(items),error:error=>this.fail(error)});}
  loadTracks(page=1){this.tracksApi.list(page,20).subscribe({next:result=>{this.tracks.set(result.items);this.page.set(page);this.pages.set(result.pages);},error:error=>this.fail(error)});}
  create(){if(!this.name.value.trim())return;this.api.createCollection(this.name.value,this.kind.value,this.visibility.value).subscribe({next:()=>{this.name.setValue('');this.load();},error:error=>this.fail(error)});}
  add(collection:MusicCollection,event:Event){const trackId=(event.target as HTMLSelectElement).value;if(!trackId)return;this.api.updateCollection(collection.id,{trackIds:[...new Set([...collection.tracks.map(track=>track.id),trackId])]}).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  removeTrack(collection:MusicCollection,track:CommunityTrack){this.api.updateCollection(collection.id,{trackIds:collection.tracks.filter(item=>item.id!==track.id).map(item=>item.id)}).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  remove(collection:MusicCollection){if(!confirm('Supprimer cette collection ? Les fichiers seront conservés.'))return;this.api.deleteCollection(collection.id).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  visibilityChange(collection:MusicCollection,event:Event){this.api.updateCollection(collection.id,{visibility:(event.target as HTMLSelectElement).value}).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  unfavorite(track:CommunityTrack){this.api.reaction(track.id,'favorite',false).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  private fail(error:unknown){console.error('[Collections] Opération impossible',error);this.loading.set(false);this.error.set('Impossible de modifier vos collections.');}
}
