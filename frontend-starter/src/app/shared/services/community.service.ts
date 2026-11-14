import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommunityTrack, Profile, Friendship, ConversationMessage, MusicCollection, SocialNotification, AdminReport } from '../models/community.model';
import { User } from '../models/user.model';

@Injectable({providedIn:'root'})
export class CommunityService {
  private readonly http=inject(HttpClient);
  discover(q='',style='',kind='',page=1){return this.http.get<{items:CommunityTrack[];page:number;pages:number}>('/api/discover',{params:{q,style,kind,page}});}
  detail(id:string){return this.http.get<CommunityTrack>(`/api/tracks/${encodeURIComponent(id)}/detail`);}
  updateTrack(id:string,body:Partial<CommunityTrack>){return this.http.patch<CommunityTrack>(`/api/tracks/${encodeURIComponent(id)}`,body);}
  reaction(id:string,kind:'like'|'favorite',enabled=true){return this.http.post(`/api/tracks/${encodeURIComponent(id)}/reactions`,{kind,enabled});}
  favorites(){return this.http.get<CommunityTrack[]>('/api/favorites');}
  profiles(q:string){return this.http.get<Profile[]>('/api/profiles',{params:{q}});}
  friends(){return this.http.get<Friendship[]>('/api/friends');}
  invite(userId:string){return this.http.post('/api/friends',{userId});}
  respond(id:string,accept:boolean){return this.http.patch(`/api/friends/${id}`,{accept});}
  removeFriend(id:string){return this.http.delete(`/api/friends/${id}`);}
  activity(){return this.http.get<{tracks:CommunityTrack[];albums:MusicCollection[]}>('/api/activity');}
  messages(userId:string){return this.http.get<ConversationMessage[]>(`/api/messages/${userId}`);}
  send(userId:string,text:string,trackId?:string){return this.http.post(`/api/messages/${userId}`,{text,trackId});}
  notifications(){return this.http.get<{items:SocialNotification[];unread:number;messages:number}>('/api/notifications');}
  readNotifications(){return this.http.post('/api/notifications/read',{});}
  collections(isPublic=false){return this.http.get<MusicCollection[]>('/api/collections',{params:{public:isPublic}});}
  createCollection(name:string,kind:'album'|'playlist',visibility='private'){return this.http.post('/api/collections',{name,kind,visibility});}
  updateCollection(id:string,body:{name?:string;visibility?:string;trackIds?:string[]}){return this.http.put(`/api/collections/${id}`,body);}
  deleteCollection(id:string){return this.http.delete(`/api/collections/${id}`);}
  blocks(){return this.http.get<Profile[]>('/api/blocks');}
  block(userId:string){return this.http.post('/api/blocks',{userId});}
  unblock(userId:string){return this.http.delete(`/api/blocks/${userId}`);}
  settings(body:Partial<User>){return this.http.patch<User>('/api/settings',body);}
  deleteAccount(password:string){return this.http.request<void>('DELETE','/api/account',{body:{password}});}
  report(trackId:string,reason:string){return this.http.post('/api/reports',{trackId,reason});}
  admin(){return this.http.get<{users:Profile[];reports:AdminReport[];tracks:CommunityTrack[]}>('/api/admin');}
  moderate(id:string,moderated:boolean){return this.http.patch(`/api/admin/tracks/${id}`,{moderated});}
  suspend(id:string,suspended:boolean){return this.http.patch(`/api/admin/users/${id}`,{suspended});}
  resolve(id:string){return this.http.patch(`/api/admin/reports/${id}`,{});}
}
