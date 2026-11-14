import mongoose from 'mongoose';
import { Block } from '../models/Block.js';
import { Friendship } from '../models/Friendship.js';
import { User } from '../models/User.js';

export const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value) && mongoose.isValidObjectId(value);
export const pairKey = (a,b) => [String(a),String(b)].sort().join(':');
export async function blocked(a,b) {
  if (!a || !b || String(a) === String(b)) return false;
  return !!await Block.exists({$or:[{ownerId:a,targetId:b},{ownerId:b,targetId:a}]});
}
export async function friends(a,b) {
  if (!a || !b || String(a) === String(b)) return false;
  // Les deux comptes doivent rester actifs, quel que soit l'ordre des arguments.
  const active = await User.countDocuments({_id:{$in:[a,b]},suspended:{$ne:true}});
  return active === 2 && !(await blocked(a,b)) && !!await Friendship.exists({pair:pairKey(a,b),status:'accepted'});
}
export async function canRead(track, userId) {
  if (!track) return false;
  if (userId && String(track.ownerId) === String(userId)) return true;
  if (track.moderated || !await User.exists({_id:track.ownerId,suspended:{$ne:true}})) return false;
  if (userId && await blocked(track.ownerId,userId)) return false;
  if (track.visibility === 'public') return true;
  return !!userId && (track.sharedWith || []).some(id => String(id) === String(userId)) && await friends(track.ownerId,userId);
}
export async function trackView(track, viewer) {
  const owner = await User.findById(track.ownerId).select('name avatarUrl');
  const result = typeof track.toPublic === 'function' ? track.toPublic() : {...track,id:String(track._id),_id:undefined,storedName:undefined};
  // ACL recipients are only visible to the owner.
  if (String(track.ownerId) !== String(viewer)) {delete result.sharedWith;result.originalName='';}
  return {...result, author:owner?.name || 'Compte supprimé', authorId:String(track.ownerId), credits:track.credits || []};
}
export function fail(status,message) { return Object.assign(new Error(message),{status}); }
export function text(value,max=200) { if (typeof value !== 'string') throw fail(400,'Texte invalide'); return value.trim().slice(0,max); }
export function imageUrl(value) { if (!value) return ''; if (typeof value !== 'string' || value.length>2000) throw fail(400,'Image invalide'); try { const url=new URL(value); if(url.protocol!=='https:'||url.username||url.password) throw fail(400,'Image HTTPS requise'); return url.href; } catch(error) { throw fail(400,'Image HTTPS invalide'); } }
export function escaped(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
