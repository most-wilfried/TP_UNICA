import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { User } from '../models/User.js';
import { Track } from '../models/Track.js';
import { MixProject } from '../models/MixProject.js';
import { Friendship } from '../models/Friendship.js';
import { Block } from '../models/Block.js';
import { Message } from '../models/Message.js';
import { Notification } from '../models/Notification.js';
import { Collection } from '../models/Collection.js';
import { Reaction } from '../models/Reaction.js';
import { Report } from '../models/Report.js';
import { validId, pairKey, blocked, friends, canRead, trackView, fail, text, imageUrl, escaped } from './access.js';

const profile = user => ({id:String(user._id),name:user.name,bio:user.bio || '',avatarUrl:user.avatarUrl || ''});
const action = handler => async (req,res,next) => { try { await handler(req,res); } catch(error) { console.error('[MOST VIBE]',error.message); next(error); } };
const id = value => { if(!validId(value)) throw fail(400,'Identifiant invalide'); return value; };
async function notice(ownerId,actorId,type,trackId) {
  const owner=await User.findById(ownerId).select('notificationsEnabled');
  if(owner && owner.notificationsEnabled !== false) await Notification.create({ownerId,actorId,type,trackId});
}
async function owned(trackId,ownerId) {
  const track=await Track.findOne({_id:id(trackId),ownerId}); if(!track) throw fail(404,'Piste inconnue'); return track;
}
async function granted(trackId,viewer) {
  const track=await Track.findById(id(trackId)); if(!await canRead(track,viewer)) throw fail(404,'Piste inaccessible'); return track;
}
async function allowedRecipients(owner, values) {
  if(!Array.isArray(values) || values.length>50 || !values.every(validId)) throw fail(400,'Destinataires invalides');
  const recipients=[...new Set(values)];
  for(const target of recipients) if(!await friends(owner,target)) throw fail(403,'Le partage est réservé aux amis non bloqués');
  return recipients;
}
export async function uploadMetadata(body,ownerId) {
  const metadata={title:text(body.title || 'Sans titre'),style:text(body.style || 'Autre',60),kind:['track','mix','remix'].includes(body.kind)?body.kind:'track',tags:[],duration:Math.max(0,Math.min(86400,Number(body.duration)||0)),coverImageUrl:imageUrl(body.coverImageUrl),visibility:'private',sharedWith:[],remixAllowed:body.remixAllowed==='true'};
  if(body.tags) metadata.tags=text(body.tags,500).split(',').map(tag=>tag.trim()).filter(Boolean).slice(0,10);
  let sources=body.parentId?[body.parentId]:[];
  if(body.parentIds){try{sources=JSON.parse(body.parentIds);}catch(error){throw fail(400,'Sources de remix invalides');}}
  if(!Array.isArray(sources)||sources.length>10||!sources.every(validId))throw fail(400,'Sources de remix invalides');
  if(sources.length){metadata.credits=[];metadata.sourceIds=[...new Set(sources)];metadata.parentId=sources[0];metadata.kind='remix';}
  for(const sourceId of [...new Set(sources)]) {
    const parent=await granted(sourceId,ownerId);
    if(String(parent.ownerId)!==ownerId&&!parent.remixAllowed)throw fail(403,'Le créateur n’autorise pas les remixes');
    const creator=await User.findById(parent.ownerId).select('name');
    metadata.credits.push(...(parent.credits||[]).map(credit=>({userId:credit.userId,name:credit.name})),{userId:String(parent.ownerId),name:creator?.name||'Compte supprimé'});
  }
  if(metadata.credits)metadata.credits=metadata.credits.filter((credit,index,list)=>list.findIndex(item=>item.userId===credit.userId)===index);

  return metadata;
}

export function socialRoutes({auth,optionalAuth,uploads}) {
  const router=express.Router();
  router.get('/discover',optionalAuth,action(async(req,res)=>{
    const page=Math.max(1,Math.min(10000,parseInt(req.query.page,10)||1));
    const q=typeof req.query.q==='string'?req.query.q.slice(0,100):'';
    const filter={visibility:'public',moderated:{$ne:true}};
    if(typeof req.query.style==='string' && req.query.style) filter.style=req.query.style.slice(0,60);
    if(['track','mix','remix'].includes(req.query.kind)) filter.kind=req.query.kind;
    if(q) {
      const regex=new RegExp(escaped(q),'i');
      const authors=await User.find({name:regex}).select('_id').limit(100);
      const albums=await Collection.find({name:regex,visibility:'public',kind:'album'}).select('trackIds').limit(100);
      filter.$or=[{title:regex},{style:regex},{tags:regex},{ownerId:{$in:authors.map(author=>author._id)}},{_id:{$in:albums.flatMap(album=>album.trackIds)}}];
    }
    const items=await Track.find(filter).sort({createdAt:-1}).skip((page-1)*20).limit(20);
    const visible=[];for(const track of items) if(await canRead(track,req.auth?.sub)) visible.push(await trackView(track,req.auth?.sub));
    res.json({items:visible,page,pages:Math.max(1,Math.ceil(await Track.countDocuments(filter)/20))});
  }));
  router.get('/tracks/:id/audio',optionalAuth,action(async(req,res)=>{
    const track=await Track.findById(id(req.params.id)).select('+storedName');
    if(!await canRead(track,req.auth?.sub)) throw fail(404,'Piste inaccessible');
    if(!track.storedName || path.basename(track.storedName)!==track.storedName) throw fail(404,'Fichier indisponible');
    res.set('Cache-Control','private, no-store').set('X-Content-Type-Options','nosniff').type(track.mimeType);
    res.sendFile(path.join(uploads,track.storedName),error=>{if(error){console.error('[audio] Transfert impossible',error.code);if(!res.headersSent)res.status(404).json({message:'Fichier indisponible'});}});
  }));
  router.get('/tracks/:id/detail',optionalAuth,action(async(req,res)=>res.json(await trackView(await granted(req.params.id,req.auth?.sub),req.auth?.sub))));
  router.patch('/tracks/:id',auth,action(async(req,res)=>{
    const track=await owned(req.params.id,req.auth.sub);const wasPublic=track.visibility==='public';
    if(req.body.title!==undefined) track.title=text(req.body.title);
    if(req.body.style!==undefined) track.style=text(req.body.style,60);
    if(req.body.coverImageUrl!==undefined) track.coverImageUrl=imageUrl(req.body.coverImageUrl);
    if(req.body.tags!==undefined){if(!Array.isArray(req.body.tags)||req.body.tags.length>10)throw fail(400,'Tags invalides');track.tags=req.body.tags.map(tag=>text(tag,50));}
    if(req.body.remixAllowed!==undefined)track.remixAllowed=req.body.remixAllowed===true;
    if(req.body.visibility!==undefined){if(!['private','friends','public'].includes(req.body.visibility))throw fail(400,'Visibilité invalide');track.visibility=req.body.visibility;}
    if(req.body.sharedWith!==undefined)track.sharedWith=await allowedRecipients(req.auth.sub,req.body.sharedWith);
    if(track.visibility==='private')track.sharedWith=[];
    await track.save();
    for(const target of track.sharedWith)await notice(target,req.auth.sub,'share',track.id);
    if(track.visibility==='public'&&!wasPublic){const relations=await Friendship.find({status:'accepted',$or:[{sender:req.auth.sub},{recipient:req.auth.sub}]});for(const relation of relations){const target=String(relation.sender)===req.auth.sub?relation.recipient:relation.sender;if(await friends(req.auth.sub,target))await notice(target,req.auth.sub,'publication',track.id);}}
    res.json(await trackView(track,req.auth.sub));
  }));
  router.post('/tracks/:id/reactions',auth,action(async(req,res)=>{
    const track=await granted(req.params.id,req.auth.sub);const kind=req.body.kind;
    if(req.body.enabled!==undefined&&typeof req.body.enabled!=='boolean')throw fail(400,'État de réaction invalide');
    if(!['like','favorite'].includes(kind))throw fail(400,'Réaction invalide');
    if(req.body.enabled===false)await Reaction.deleteOne({ownerId:req.auth.sub,trackId:track.id,kind});
    else await Reaction.updateOne({ownerId:req.auth.sub,trackId:track.id,kind},{$setOnInsert:{ownerId:req.auth.sub,trackId:track.id,kind}},{upsert:true});
    res.json({enabled:req.body.enabled!==false,kind});
  }));
  router.get('/favorites',auth,action(async(req,res)=>{
    const reactions=await Reaction.find({ownerId:req.auth.sub,kind:'favorite'}).limit(200);const result=[];
    for(const item of reactions){const track=await Track.findById(item.trackId);if(await canRead(track,req.auth.sub))result.push(await trackView(track,req.auth.sub));}res.json(result);
  }));
  router.get('/profiles',auth,action(async(req,res)=>{
    const q=typeof req.query.q==='string'?req.query.q.slice(0,100):'';
    if(q.length<2)return res.json([]);
    const users=await User.find({_id:{$ne:req.auth.sub},suspended:{$ne:true},discoverable:{$ne:false},name:new RegExp(escaped(q),'i')}).select('name bio avatarUrl').limit(20);
    const result=[];for(const user of users)if(!await blocked(req.auth.sub,user.id))result.push(profile(user));res.json(result);
  }));
  router.get('/friends',auth,action(async(req,res)=>{
    const entries=await Friendship.find({$or:[{sender:req.auth.sub},{recipient:req.auth.sub}]}).sort({updatedAt:-1}).limit(200);const result=[];
    for(const entry of entries){const other=String(entry.sender)===req.auth.sub?entry.recipient:entry.sender;const user=await User.findById(other).select('name bio avatarUrl suspended');if(user&&!user.suspended&&!await blocked(req.auth.sub,other))result.push({id:entry.id,status:entry.status,incoming:String(entry.recipient)===req.auth.sub,user:profile(user)});}res.json(result);
  }));
  router.post('/friends',auth,action(async(req,res)=>{
    const target=id(req.body.userId);if(target===req.auth.sub||await blocked(req.auth.sub,target))throw fail(403,'Invitation impossible');
    if(!await User.exists({_id:target,suspended:{$ne:true}}))throw fail(404,'Profil inconnu');
    const entry=await Friendship.findOneAndUpdate({pair:pairKey(req.auth.sub,target)},{$setOnInsert:{sender:req.auth.sub,recipient:target,pair:pairKey(req.auth.sub,target),status:'pending'}},{upsert:true,returnDocument:'after'});
    await notice(target,req.auth.sub,'invitation');res.status(201).json({id:entry.id,status:entry.status});
  }));
  router.patch('/friends/:id',auth,action(async(req,res)=>{
    if(typeof req.body.accept!=='boolean')throw fail(400,'Réponse invalide');
    const entry=await Friendship.findOne({_id:id(req.params.id),recipient:req.auth.sub,status:'pending'});if(!entry)throw fail(404,'Invitation inconnue');
    if(await blocked(entry.sender,entry.recipient))throw fail(403,'Invitation impossible');
    if(req.body.accept===true){entry.status='accepted';await entry.save();await notice(entry.sender,req.auth.sub,'accepted');}else await entry.deleteOne();res.json({ok:true});
  }));
  router.delete('/friends/:id',auth,action(async(req,res)=>{
    const entry=await Friendship.findOneAndDelete({_id:id(req.params.id),$or:[{sender:req.auth.sub},{recipient:req.auth.sub}]});if(!entry)throw fail(404,'Relation inconnue');await Track.updateMany({ownerId:entry.sender},{$pull:{sharedWith:entry.recipient}});await Track.updateMany({ownerId:entry.recipient},{$pull:{sharedWith:entry.sender}});res.status(204).end();
  }));
  router.get('/blocks',auth,action(async(req,res)=>{
    const entries=await Block.find({ownerId:req.auth.sub});const result=[];for(const entry of entries){const user=await User.findById(entry.targetId).select('name');result.push({id:String(entry.targetId),name:user?.name||'Compte supprimé'});}res.json(result);
  }));
  router.post('/blocks',auth,action(async(req,res)=>{
    const target=id(req.body.userId);if(target===req.auth.sub)throw fail(400,'Blocage invalide');if(!await User.exists({_id:target,suspended:{$ne:true}}))throw fail(404,'Profil inconnu');
    await Block.updateOne({ownerId:req.auth.sub,targetId:target},{$setOnInsert:{ownerId:req.auth.sub,targetId:target}},{upsert:true});
    await Friendship.deleteOne({pair:pairKey(req.auth.sub,target)});await Track.updateMany({ownerId:req.auth.sub},{$pull:{sharedWith:target}});await Track.updateMany({ownerId:target},{$pull:{sharedWith:req.auth.sub}});res.json({ok:true});
  }));
  router.delete('/blocks/:id',auth,action(async(req,res)=>{await Block.deleteOne({ownerId:req.auth.sub,targetId:id(req.params.id)});res.status(204).end();}));
  router.get('/activity',auth,action(async(req,res)=>{
    const relations=await Friendship.find({status:'accepted',$or:[{sender:req.auth.sub},{recipient:req.auth.sub}]});
    const owners=relations.map(item=>String(item.sender)===req.auth.sub?item.recipient:item.sender);
    const tracks=await Track.find({ownerId:{$in:owners},$or:[{visibility:'public'},{sharedWith:req.auth.sub}]}).sort({createdAt:-1}).limit(50);
    const result=[];for(const track of tracks)if(await canRead(track,req.auth.sub))result.push(await trackView(track,req.auth.sub));
    const collections=await Collection.find({ownerId:{$in:owners},visibility:'public',kind:'album'}).sort({createdAt:-1}).limit(20);const albums=[];
    for(const album of collections){if(await blocked(album.ownerId,req.auth.sub))continue;const visible=[];for(const trackId of album.trackIds){const item=await Track.findById(trackId);if(await canRead(item,req.auth.sub))visible.push(await trackView(item,req.auth.sub));}if(visible.length)albums.push({id:album.id,name:album.name,tracks:visible});}
    res.json({tracks:result,albums});
  }));
  router.get('/messages/:userId',auth,action(async(req,res)=>{
    const target=id(req.params.userId);if(!await friends(req.auth.sub,target))throw fail(403,'Conversation réservée aux amis');
    await Message.updateMany({sender:target,recipient:req.auth.sub,readAt:null},{$set:{readAt:new Date()}});
    const messages=await Message.find({$or:[{sender:req.auth.sub,recipient:target},{sender:target,recipient:req.auth.sub}]}).sort({createdAt:-1}).limit(100);const result=[];
    for(const message of messages.reverse()){
      let track=null;if(message.trackId){const item=await Track.findById(message.trackId);if(await canRead(item,req.auth.sub))track=await trackView(item,req.auth.sub);}
      result.push({id:message.id,sender:String(message.sender),text:message.text,createdAt:message.createdAt,readAt:message.readAt,track,interrupted:!!message.trackId&&!track});
    }res.json(result);
  }));
  router.post('/messages/:userId',auth,action(async(req,res)=>{
    const target=id(req.params.userId);if(!await friends(req.auth.sub,target))throw fail(403,'Conversation réservée aux amis');
    const content=text(req.body.text || '',2000);let trackId;
    if(req.body.trackId){const track=await owned(req.body.trackId,req.auth.sub);trackId=track.id;
      if(!track.sharedWith.some(value=>String(value)===target))track.sharedWith.push(target);
      await track.save();
    }
    if(!content&&!trackId)throw fail(400,'Message vide');
    const message=await Message.create({sender:req.auth.sub,recipient:target,text:content,trackId});await notice(target,req.auth.sub,'message',trackId);res.status(201).json({id:message.id});
  }));
  router.get('/notifications',auth,action(async(req,res)=>{
    const entries=await Notification.find({ownerId:req.auth.sub}).sort({createdAt:-1}).limit(100);const result=[];
    for(const entry of entries){if(entry.actorId&&await blocked(entry.actorId,req.auth.sub))continue;const actor=entry.actorId?await User.findById(entry.actorId).select('name'):null;
      let track=null;if(entry.trackId){const item=await Track.findById(entry.trackId);if(await canRead(item,req.auth.sub))track=await trackView(item,req.auth.sub);}
      result.push({id:entry.id,type:entry.type,read:entry.read,createdAt:entry.createdAt,actor:actor?.name||'Compte supprimé',track,interrupted:!!entry.trackId&&!track});
    }
    const relations=await Friendship.find({status:'accepted',$or:[{sender:req.auth.sub},{recipient:req.auth.sub}]});const senders=relations.map(item=>String(item.sender)===req.auth.sub?item.recipient:item.sender);res.json({items:result,unread:result.filter(item=>!item.read).length,messages:await Message.countDocuments({recipient:req.auth.sub,sender:{$in:senders},readAt:null})});
  }));
  router.post('/notifications/read',auth,action(async(req,res)=>{await Notification.updateMany({ownerId:req.auth.sub},{$set:{read:true}});res.json({ok:true});}));
  router.get('/collections',optionalAuth,action(async(req,res)=>{
    const filter=req.query.public==='true'?{visibility:'public',kind:'album'}:{ownerId:req.auth?.sub};if(!req.auth&&req.query.public!=='true')throw fail(401,'Connexion requise');
    const entries=await Collection.find(filter).sort({createdAt:-1}).limit(100);const result=[];
    for(const entry of entries){if(req.auth&&await blocked(entry.ownerId,req.auth.sub))continue;const tracks=[];
      for(const trackId of entry.trackIds){const track=await Track.findById(trackId);if(await canRead(track,req.auth?.sub))tracks.push(await trackView(track,req.auth?.sub));}
      if(req.query.public==='true'&&!tracks.length)continue;const owner=await User.findById(entry.ownerId).select('name');
      result.push({id:entry.id,name:entry.name,kind:entry.kind,visibility:entry.visibility,tracks,author:owner?.name||'Compte supprimé'});
    }res.json(result);
  }));
  router.post('/collections',auth,action(async(req,res)=>{
    const name=text(req.body.name,120),kind=req.body.kind;if(!name||!['album','playlist'].includes(kind))throw fail(400,'Nom et type requis');
    const entry=await Collection.create({ownerId:req.auth.sub,name,kind,visibility:kind==='album'&&req.body.visibility==='public'?'public':'private'});res.status(201).json({id:entry.id});
  }));
  router.put('/collections/:id',auth,action(async(req,res)=>{
    const entry=await Collection.findOne({_id:id(req.params.id),ownerId:req.auth.sub});if(!entry)throw fail(404,'Collection inconnue');
    if(req.body.name!==undefined)entry.name=text(req.body.name,120);
    if(req.body.visibility!==undefined)entry.visibility=entry.kind==='album'&&req.body.visibility==='public'?'public':'private';
    if(req.body.trackIds!==undefined){if(!Array.isArray(req.body.trackIds)||req.body.trackIds.length>200)throw fail(400,'Liste invalide');for(const trackId of req.body.trackIds)await granted(trackId,req.auth.sub);entry.trackIds=[...new Set(req.body.trackIds)];}
    await entry.save();res.json({ok:true});
  }));
  router.delete('/collections/:id',auth,action(async(req,res)=>{const result=await Collection.deleteOne({_id:id(req.params.id),ownerId:req.auth.sub});if(!result.deletedCount)throw fail(404,'Collection inconnue');res.status(204).end();}));
  router.patch('/settings',auth,action(async(req,res)=>{
    const update={};if(req.body.bio!==undefined)update.bio=text(req.body.bio,500);if(req.body.name!==undefined)update.name=text(req.body.name,100);if(req.body.avatarUrl!==undefined)update.avatarUrl=imageUrl(req.body.avatarUrl);
    for(const key of ['discoverable','notificationsEnabled'])if(req.body[key]!==undefined){if(typeof req.body[key]!=='boolean')throw fail(400,'Préférence invalide');update[key]=req.body[key];}
    const user=await User.findByIdAndUpdate(req.auth.sub,{$set:update},{returnDocument:'after',runValidators:true});res.json(user.toPublic());
  }));
  router.delete('/account',auth,action(async(req,res)=>{
    const user=await User.findById(req.auth.sub).select('+passwordHash');if(!user||typeof req.body.password!=='string'||!await user.verifyPassword(req.body.password))throw fail(403,'Mot de passe incorrect');
    const tracks=await Track.find({ownerId:user.id}).select('+storedName');
    for(const track of tracks)if(track.storedName&&path.basename(track.storedName)===track.storedName)try{await fs.unlink(path.join(uploads,track.storedName));}catch(error){if(error.code!=='ENOENT')console.error('[account] Nettoyage fichier impossible',error.code);}
    await Promise.all([Track.deleteMany({ownerId:user.id}),MixProject.deleteMany({ownerId:user.id}),Collection.deleteMany({ownerId:user.id}),Reaction.deleteMany({ownerId:user.id}),Notification.deleteMany({ownerId:user.id}),Friendship.deleteMany({$or:[{sender:user.id},{recipient:user.id}]}),Block.deleteMany({$or:[{ownerId:user.id},{targetId:user.id}]}),Message.deleteMany({$or:[{sender:user.id},{recipient:user.id}]})]);
    await User.deleteOne({_id:user.id});res.status(204).end();
  }));
  router.post('/reports',auth,action(async(req,res)=>{
    const track=await granted(req.body.trackId,req.auth.sub);const reason=text(req.body.reason,1000);if(!reason)throw fail(400,'Motif requis');await Report.create({ownerId:req.auth.sub,trackId:track.id,reason});res.status(201).json({ok:true});
  }));

  // Explicit admin guard; no private audio/message endpoints are granted by role.
  const requireAdmin=async(req,res,next)=>{try{const user=await User.findById(req.auth.sub).select('role');if(user?.role!=='admin')throw fail(403,'Administration réservée');next();}catch(error){next(error);}};
  router.get('/admin',auth,requireAdmin,action(async(req,res)=>{
    const users=await User.find().select('name role suspended createdAt').limit(100);
    const reports=await Report.find({status:'open'}).sort({createdAt:-1}).limit(100);const safe=[];
    for(const report of reports){const track=await Track.findOne({_id:report.trackId,visibility:'public'});safe.push({id:report.id,reason:report.reason,status:report.status,track:track?await trackView(track,null):null});}
    const tracks=await Track.find({visibility:'public'}).sort({createdAt:-1}).limit(100);res.json({users:users.map(user=>({...profile(user),role:user.role,suspended:user.suspended})),reports:safe,tracks:await Promise.all(tracks.map(track=>trackView(track,null)))});
  }));
  router.patch('/admin/users/:id',auth,requireAdmin,action(async(req,res)=>{
    const target=id(req.params.id);if(target===req.auth.sub)throw fail(400,'Vous ne pouvez pas suspendre votre propre compte');
    if(typeof req.body.suspended!=='boolean')throw fail(400,'Statut invalide');
    const user=await User.findByIdAndUpdate(target,{$set:{suspended:req.body.suspended}},{returnDocument:'after'});if(!user)throw fail(404,'Compte inconnu');res.json({ok:true});
  }));
  router.patch('/admin/reports/:id',auth,requireAdmin,action(async(req,res)=>{await Report.updateOne({_id:id(req.params.id)},{$set:{status:'resolved'}});res.json({ok:true});}));
  router.patch('/admin/tracks/:id',auth,requireAdmin,action(async(req,res)=>{const track=await Track.findOneAndUpdate({_id:id(req.params.id),visibility:'public'},{$set:{moderated:req.body.moderated===true}},{returnDocument:'after'});if(!track)throw fail(404,'Contenu public inconnu');res.json({ok:true});}));
  return router;
}
