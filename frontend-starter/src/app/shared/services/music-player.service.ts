import { inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TrackService } from './track.service';
import { CommunityTrack } from '../models/community.model';

@Injectable({providedIn:'root'})
export class MusicPlayerService {
  private readonly tracks=inject(TrackService);
  readonly current=signal<CommunityTrack|null>(null);
  readonly playing=signal(false);readonly loading=signal(false);readonly error=signal('');
  readonly mediaUrl=signal('');
  readonly time=signal(0);readonly duration=signal(0);
  private audio?:HTMLMediaElement;private url='';private request?:Subscription;
  play(track:CommunityTrack):void {
    this.request?.unsubscribe();this.releaseMedia();
    this.loading.set(true);this.error.set('');this.current.set(track);this.time.set(0);this.duration.set(0);
    this.request=this.tracks.audio(track.id).subscribe({next:blob=>{
      if(this.url)URL.revokeObjectURL(this.url);this.url=URL.createObjectURL(blob);this.mediaUrl.set(this.url);
      if(track.mimeType.startsWith('image/')||track.mimeType.startsWith('video/')){this.loading.set(false);this.time.set(0);return;}
      if(!this.audio || this.audio.tagName!=='AUDIO')this.audio=new Audio();const audio=this.audio;
      audio.onloadedmetadata=()=>this.duration.set(Number.isFinite(audio.duration)?audio.duration:0);
      audio.ontimeupdate=()=>this.time.set(audio.currentTime);audio.onplay=()=>this.playing.set(true);audio.onpause=()=>this.playing.set(false);audio.onended=()=>this.playing.set(false);
      audio.onerror=()=>{this.error.set('Lecture indisponible. Le partage peut avoir été interrompu.');this.loading.set(false);};
      audio.src=this.url;this.time.set(0);this.loading.set(false);void audio.play().catch(error=>{console.error('[Lecteur] Lecture bloquée',error);this.error.set('Appuyez sur Lecture pour démarrer.');});
    },error:error=>{console.error('[Lecteur] Audio inaccessible',error);this.loading.set(false);this.error.set('Piste inaccessible ou partage interrompu.');}});
  }
  mediaError():void {this.error.set('Ce média ne peut pas être affiché dans ce navigateur.');this.loading.set(false);}
  attachVideo(event:Event):void {const video=event.target as HTMLVideoElement;this.audio=video;this.duration.set(Number.isFinite(video.duration)?video.duration:0);video.ontimeupdate=()=>this.time.set(video.currentTime);video.onplay=()=>this.playing.set(true);video.onpause=()=>this.playing.set(false);video.onended=()=>this.playing.set(false);this.playing.set(!video.paused);}
  toggle():void {if(!this.audio)return;if(this.audio.paused)void this.audio.play().catch(error=>{console.error('[Lecteur] Lecture impossible',error);this.error.set('Lecture impossible.');});else this.pause();}
  pause():void {this.audio?.pause();this.playing.set(false);}
  seek(value:number):void {if(this.audio)this.audio.currentTime=Math.max(0,Math.min(value,this.duration()));}
  close():void {this.request?.unsubscribe();this.releaseMedia();this.current.set(null);this.loading.set(false);this.time.set(0);this.duration.set(0);this.error.set('');}
  private releaseMedia():void {
    this.pause();
    if(this.audio){
      this.audio.onloadedmetadata=null;this.audio.ontimeupdate=null;this.audio.onplay=null;
      this.audio.onpause=null;this.audio.onended=null;this.audio.onerror=null;this.audio.src='';
    }
    this.audio=undefined;
    if(this.url)URL.revokeObjectURL(this.url);
    this.url='';this.mediaUrl.set('');
  }
}
