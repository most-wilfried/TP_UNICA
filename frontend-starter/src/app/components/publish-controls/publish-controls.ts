import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackStyleService } from '../../shared/services/track-style.service';
import { CommunityService } from '../../shared/services/community.service';
import { CommunityTrack, Friendship } from '../../shared/models/community.model';
@Component({selector:'app-publish-controls',imports:[ReactiveFormsModule],templateUrl:'./publish-controls.html',styleUrl:'./publish-controls.css'})
export class PublishControlsComponent {
  readonly track=input.required<CommunityTrack>();readonly updated=output<CommunityTrack>();readonly expanded=signal(false);readonly friends=signal<Friendship[]>([]);readonly recipients=signal<string[]>([]);readonly busy=signal(false);readonly message=signal('');readonly error=signal('');
  readonly styles=inject(TrackStyleService).styles;readonly style=new FormControl('Autre',{nonNullable:true});
  readonly visibility=new FormControl('private',{nonNullable:true});readonly tags=new FormControl('',{nonNullable:true});readonly cover=new FormControl('',{nonNullable:true});readonly allowRemix=new FormControl(false,{nonNullable:true});private readonly api=inject(CommunityService);
  open(){this.expanded.update(value=>!value);const track=this.track();this.visibility.setValue(track.visibility||'private');this.style.setValue(track.style||'Autre');this.tags.setValue(track.tags?.join(', ')||'');this.cover.setValue(track.coverImageUrl||'');this.allowRemix.setValue(track.remixAllowed||false);this.recipients.set(track.sharedWith||[]);if(this.expanded())this.api.friends().subscribe({next:items=>this.friends.set(items.filter(item=>item.status==='accepted')),error:error=>{console.error('[Publication] Amis indisponibles',error);this.error.set('Impossible de charger les amis.');}});}
  toggle(id:string,event:Event){const checked=(event.target as HTMLInputElement).checked;this.recipients.update(items=>checked?[...items,id]:items.filter(item=>item!==id));}
  save(){if(this.busy())return;this.busy.set(true);this.error.set('');this.api.updateTrack(this.track().id,{style:this.style.value,visibility:this.visibility.value as CommunityTrack['visibility'],sharedWith:this.visibility.value==='private'?[]:this.recipients(),remixAllowed:this.allowRemix.value,tags:this.tags.value.split(',').map(value=>value.trim()).filter(Boolean),coverImageUrl:this.cover.value}).subscribe({next:track=>{this.updated.emit(track);this.busy.set(false);this.message.set('Publication et droits mis à jour.');},error:error=>{console.error('[Publication] Modification impossible',error);this.error.set('Vérifiez la pochette HTTPS et les destinataires autorisés.');this.busy.set(false);}});}
}
