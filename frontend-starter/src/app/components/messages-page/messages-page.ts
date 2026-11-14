import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommunityService } from '../../shared/services/community.service';
import { TrackService } from '../../shared/services/track.service';
import { AuthService } from '../../shared/services/auth.service';
import { MusicPlayerService } from '../../shared/services/music-player.service';
import { Friendship,ConversationMessage,CommunityTrack } from '../../shared/models/community.model';
@Component({imports:[ReactiveFormsModule],templateUrl:'./messages-page.html',styleUrl:'./messages-page.css'})
export class MessagesPageComponent implements OnInit,OnDestroy {
  readonly auth=inject(AuthService);readonly player=inject(MusicPlayerService);private readonly api=inject(CommunityService);private readonly tracksApi=inject(TrackService);private readonly route=inject(ActivatedRoute);
  readonly friends=signal<Friendship[]>([]);readonly selected=signal<Friendship|null>(null);readonly messages=signal<ConversationMessage[]>([]);readonly tracks=signal<CommunityTrack[]>([]);readonly picker=signal(false);readonly loading=signal(false);readonly sending=signal(false);readonly error=signal('');readonly text=new FormControl('',{nonNullable:true});readonly search=new FormControl('',{nonNullable:true});readonly page=signal(1);readonly pages=signal(1);private timer?:ReturnType<typeof setInterval>;private request?:Subscription;
  readonly pickerLoading=signal(false);private pickerRequest?:Subscription;private searchRequest?:Subscription;
  ngOnInit(){this.api.friends().subscribe({next:items=>{this.friends.set(items.filter(item=>item.status==='accepted'));const requested=this.route.snapshot.queryParamMap.get('with');const friend=this.friends().find(item=>item.user.id===requested);if(friend)this.open(friend);},error:error=>this.fail(error)});this.searchRequest=this.search.valueChanges.pipe(debounceTime(250),distinctUntilChanged()).subscribe({next:()=>{if(this.picker())this.choose();},error:error=>this.fail(error)});this.timer=setInterval(()=>{if(this.selected())this.refresh();},15000);}
  open(friend:Friendship){if(this.selected()?.user.id!==friend.user.id)this.text.setValue('');this.selected.set(friend);this.messages.set([]);this.error.set('');this.picker.set(false);this.refresh();}
  refresh(){const friend=this.selected();if(!friend)return;this.loading.set(true);this.request?.unsubscribe();this.request=this.api.messages(friend.user.id).subscribe({next:items=>{if(this.selected()?.user.id!==friend.user.id)return;this.messages.set(items);this.loading.set(false);},error:error=>{if(this.selected()?.user.id!==friend.user.id)return;this.messages.set([]);this.fail(error);}});}
  send(trackId?:string){const friend=this.selected();if(!friend||this.sending()||(!trackId&&!this.text.value.trim()))return;const content=this.text.value;this.sending.set(true);this.api.send(friend.user.id,content,trackId).subscribe({next:()=>{this.sending.set(false);if(this.selected()?.user.id!==friend.user.id)return;if(this.text.value===content)this.text.setValue('');this.picker.set(false);this.refresh();},error:error=>{this.sending.set(false);if(this.selected()?.user.id===friend.user.id)this.fail(error);}});}
  choose(page=1){this.picker.set(true);this.pickerLoading.set(true);this.pickerRequest?.unsubscribe();this.pickerRequest=this.tracksApi.list(page,20,this.search.value).subscribe({next:result=>{this.tracks.set(result.items);this.page.set(result.page);this.pages.set(result.pages);this.pickerLoading.set(false);},error:error=>{this.pickerLoading.set(false);this.fail(error);}});}
  private fail(error:unknown){console.error('[Messages] Opération impossible',error);this.error.set('Conversation inaccessible ou partage interrompu. Les messages sont réservés aux amis non bloqués.');this.loading.set(false);}
  ngOnDestroy(){this.request?.unsubscribe();this.pickerRequest?.unsubscribe();this.searchRequest?.unsubscribe();if(this.timer)clearInterval(this.timer);}
}
