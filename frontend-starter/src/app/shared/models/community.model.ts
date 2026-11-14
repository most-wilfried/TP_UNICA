import { Track } from './track.model';
export interface CommunityTrack extends Track {
  ownerId?: string; authorId?: string; author?: string; style?: string; tags?: string[];
  coverImageUrl?: string; duration?: number; visibility?: 'private' | 'friends' | 'public';
  sharedWith?: string[]; remixAllowed?: boolean; parentId?: string | null;
  credits?: Array<{userId:string;name:string}>; kind?: 'track' | 'mix' | 'remix';
}
export interface Profile { id:string; name:string; bio?:string; avatarUrl?:string; role?:string;suspended?:boolean; }
export interface Friendship { id:string; status:'pending'|'accepted'; incoming:boolean; user:Profile; }
export interface ConversationMessage { id:string; sender:string; text:string; createdAt:string; readAt:string|null; track:CommunityTrack|null; interrupted:boolean; }
export interface MusicCollection { id:string; name:string; kind:'album'|'playlist'; visibility:'private'|'public'; tracks:CommunityTrack[]; author?:string; }
export interface SocialNotification { id:string; type:string; read:boolean; actor:string; track:CommunityTrack|null; interrupted:boolean; createdAt:string; }
export interface AdminReport { id:string; reason:string; status:string; track:CommunityTrack|null; }
