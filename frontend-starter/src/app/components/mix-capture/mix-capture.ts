import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { signal, input, effect } from '@angular/core';
import { SavedMix } from '../../shared/services/mix-capture.service';
import { TrackService } from '../../shared/services/track.service';
import { CommunityTrack } from '../../shared/models/community.model';
import { PublishControlsComponent } from '../publish-controls/publish-controls';
import { Component, inject } from '@angular/core';
import { MixCaptureService } from '../../shared/services/mix-capture.service';

@Component({ selector: 'app-mix-capture', imports:[ReactiveFormsModule,PublishControlsComponent], providers: [MixCaptureService], templateUrl: './mix-capture.html', styleUrl: './mix-capture.css' })
export class MixCaptureComponent {
  readonly sources=input<Record<'A'|'B',CommunityTrack|null>>({A:null,B:null});
  constructor(){effect(()=>{if(!this.capture.recording())return;const sources=Object.values(this.sources()).filter((track):track is CommunityTrack=>!!track&&!track.id.startsWith('demo-'));this.capture.remixSources.update(ids=>[...new Set([...ids,...sources.map(track=>track.id)])]);});}
  private readonly tracks=inject(TrackService);
  readonly title=new FormControl('Mon mix MOST VIBE',{nonNullable:true});
  readonly uploaded=signal<CommunityTrack|null>(null);
  readonly saving=signal(false);readonly publishError=signal('');
  publish(mix:SavedMix):void {
    if(this.saving())return;
    const parentIds=mix.parentIds.length?JSON.stringify(mix.parentIds):undefined;
    this.saving.set(true);this.publishError.set('');
    this.tracks.upload(new File([mix.blob],mix.name,{type:mix.blob.type}),this.title.value||mix.name,{kind:'mix',parentIds,duration:String(mix.seconds)}).subscribe({next:event=>{if(event.type===HttpEventType.Response&&event.body){this.uploaded.set(event.body);this.saving.set(false);}},error:error=>{console.error('[Mix] Publication impossible',error);this.publishError.set('Enregistrement impossible : vérifiez la taille (25 Mo) et l’autorisation du remix.');this.saving.set(false);}});
  }
  readonly capture = inject(MixCaptureService);
  number(event: Event): number { return Number((event.target as HTMLInputElement).value); }
  time(value: number): string { return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, '0')}`; }
}
