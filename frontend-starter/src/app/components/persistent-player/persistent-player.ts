import { Component, inject } from '@angular/core';
import { MusicPlayerService } from '../../shared/services/music-player.service';
@Component({selector:'app-persistent-player',templateUrl:'./persistent-player.html',styleUrl:'./persistent-player.css'})
export class PersistentPlayerComponent {
  readonly player=inject(MusicPlayerService);
  seek(event:Event){this.player.seek(Number((event.target as HTMLInputElement).value));}
  time(value:number){return `${Math.floor(value/60)}:${Math.floor(value%60).toString().padStart(2,'0')}`;}
}
