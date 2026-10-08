import { Component } from '@angular/core';
import { TracksPageComponent } from '../tracks-page/tracks-page';

@Component({ imports: [TracksPageComponent], template: '<app-tracks-page section="player" />' })
export class PlayerPageComponent {}
