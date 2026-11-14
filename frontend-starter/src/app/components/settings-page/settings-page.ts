import { Component, inject, signal, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityService } from '../../shared/services/community.service';
import { AuthService } from '../../shared/services/auth.service';
import { Profile,SocialNotification } from '../../shared/models/community.model';
@Component({imports:[ReactiveFormsModule],templateUrl:'./settings-page.html'})
export class SettingsPageComponent implements OnInit {
  private readonly api=inject(CommunityService);readonly auth=inject(AuthService);private readonly router=inject(Router);readonly name=new FormControl('',{nonNullable:true});readonly bio=new FormControl('',{nonNullable:true});readonly avatar=new FormControl('',{nonNullable:true});readonly discoverable=new FormControl(true,{nonNullable:true});readonly notifications=new FormControl(true,{nonNullable:true});readonly password=new FormControl('',{nonNullable:true});readonly blocked=signal<Profile[]>([]);readonly notices=signal<SocialNotification[]>([]);readonly error=signal('');readonly message=signal('');readonly busy=signal(false);readonly loading=signal(true);
  ngOnInit(){this.auth.profile().subscribe({next:user=>{this.loading.set(false);this.name.setValue(user.name);this.bio.setValue(user.bio||'');this.avatar.setValue(user.avatarUrl||'');this.discoverable.setValue(user.discoverable!==false);this.notifications.setValue(user.notificationsEnabled!==false);},error:error=>this.fail(error)});this.refresh();}
  refresh(){this.api.blocks().subscribe({next:items=>this.blocked.set(items),error:error=>this.fail(error)});this.api.notifications().subscribe({next:result=>this.notices.set(result.items),error:error=>this.fail(error)});}
  save(){if(this.busy())return;const token=this.auth.token();this.busy.set(true);this.api.settings({name:this.name.value,bio:this.bio.value,avatarUrl:this.avatar.value,discoverable:this.discoverable.value,notificationsEnabled:this.notifications.value}).subscribe({next:user=>{if(this.auth.token()!==token)return;this.auth.currentUser.set(user);this.busy.set(false);this.message.set('Préférences enregistrées.');},error:error=>this.fail(error)});}
  unblock(user:Profile){this.api.unblock(user.id).subscribe({next:()=>this.refresh(),error:error=>this.fail(error)});}
  read(){this.api.readNotifications().subscribe({next:()=>this.refresh(),error:error=>this.fail(error)});}
  delete(){if(this.busy()||!this.password.value||!confirm('Supprimer définitivement votre compte, vos fichiers et vos conversations ? Cette action est irréversible.'))return;const token=this.auth.token();this.busy.set(true);this.api.deleteAccount(this.password.value).subscribe({next:()=>{if(this.auth.token()!==token)return;this.auth.logout();void this.router.navigate(['/']);},error:error=>this.fail(error)});}
  private fail(error:unknown){console.error('[Paramètres] Opération impossible',error);this.error.set('Opération impossible. Vérifiez les informations saisies et votre connexion.');this.busy.set(false);this.loading.set(false);}
}
