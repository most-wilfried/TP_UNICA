import { Component,inject,signal } from '@angular/core';
import { FormControl,ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MixProject } from '../../shared/models/mix-project.model';
import { ProjectService } from '../../shared/services/project.service';
import { CommunityService } from '../../shared/services/community.service';
import { AuthService } from '../../shared/services/auth.service';
import { Friendship } from '../../shared/models/community.model';
@Component({imports:[ReactiveFormsModule,RouterLink],templateUrl:'./projects-page.html'})
export class ProjectsPageComponent {
  private readonly service=inject(ProjectService);private readonly community=inject(CommunityService);readonly auth=inject(AuthService);readonly projects=signal<MixProject[]>([]);readonly friends=signal<Friendship[]>([]);readonly error=signal('');readonly loading=signal(false);readonly name=new FormControl('',{nonNullable:true});
  constructor(){this.load();this.community.friends().subscribe({next:items=>this.friends.set(items.filter(item=>item.status==='accepted')),error:error=>this.fail(error)});}
  load(){this.loading.set(true);this.service.list().subscribe({next:items=>{this.projects.set(items);this.loading.set(false);},error:error=>this.fail(error)});}
  create(){if(!this.name.value.trim())return;this.service.create(this.name.value.trim()).subscribe({next:()=>{this.name.setValue('');this.load();},error:error=>this.fail(error)});}
  remove(project:MixProject){if(confirm(`Supprimer le brouillon « ${project.name} » ? Les pistes seront conservées.`))this.service.delete(project.id).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  share(project:MixProject,event:Event){const id=(event.target as HTMLSelectElement).value;if(id)this.service.share(project.id,id).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  revoke(project:MixProject,userId:string){this.service.revoke(project.id,userId).subscribe({next:()=>this.load(),error:error=>this.fail(error)});}
  person(id:string){return this.friends().find(friend=>friend.user.id===id)?.user.name||'Ancien destinataire';}
  private fail(error:unknown){console.error('[Brouillons] Opération impossible',error);this.loading.set(false);this.error.set('Impossible de modifier ou charger ce brouillon. Vérifiez vos droits.');}
}
