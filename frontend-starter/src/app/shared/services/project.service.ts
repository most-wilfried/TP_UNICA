import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MixProject } from '../models/mix-project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly http = inject(HttpClient);
  list() { return this.http.get<MixProject[]>('/api/projects'); }
  create(name: string, effects?: unknown) { return this.http.post<MixProject>('/api/projects', effects ? { name, settings: { effects } } : { name }); }
  share(id:string,userId:string){return this.http.post<MixProject>(`/api/projects/${id}/share`,{userId});}
  revoke(id:string,userId:string){return this.http.delete<MixProject>(`/api/projects/${id}/share/${userId}`);}
  delete(id: string) { return this.http.delete<void>(`/api/projects/${id}`); }
}
