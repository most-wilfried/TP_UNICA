import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { Track } from '../src/models/Track.js';
import { User } from '../src/models/User.js';

let database,server,base,a,b,c,trackId;
const uploads=[];
const password='Test-local-1234!';
const wave=await fs.readFile(path.resolve('../frontend-starter/public/audio/demos/house.wav'));
async function call(route,session,method='GET',body){
 const headers={};if(session)headers.Authorization=`Bearer ${session.token}`;
 if(body && !(body instanceof FormData))headers['Content-Type']='application/json';
 const response=await fetch(base+'/api'+route,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
 const json=response.headers.get('content-type')?.includes('json')?await response.json():null;
 return {response,json};
}
async function upload(session,extra={}){const form=new FormData();form.append('audio',new Blob([wave],{type:'audio/wav'}),'original.wav');form.append('title','Création de test');form.append('style','House');for(const [key,value] of Object.entries(extra))form.append(key,value);return call('/tracks',session,'POST',form);}
async function friendship(sender,recipient){const invited=await call('/friends',sender,'POST',{userId:recipient.user.id});assert.equal(invited.response.status,201);const accepted=await call('/friends/'+invited.json.id,recipient,'PATCH',{accept:true});assert.equal(accepted.response.status,200);return invited.json.id;}
test.before(async()=>{
 database=await MongoMemoryServer.create({binary:{version:'8.0.4',downloadDir:'/tmp/most-vibe-mongodb'}});
 await mongoose.connect(database.getUri());server=createApp().listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}`;
 for(const name of ['alice','bob','charlie']){const result=await call('/auth/register',null,'POST',{name,email:name+'@example.test',password});assert.equal(result.response.status,201);if(name==='alice')a=result.json;if(name==='bob')b=result.json;if(name==='charlie')c=result.json;}
},{timeout:180000});
test.after(async()=>{const tracks=await Track.find().select('+storedName');for(const track of tracks)if(track.storedName)try{await fs.unlink(path.resolve('data/uploads',track.storedName));}catch(error){if(error.code!=='ENOENT')console.error('[test] nettoyage',error.code);}await new Promise(resolve=>server?.close(resolve));await mongoose.disconnect();await database?.stop();});

test('private by default, anonymous discovery only public, and owner-only publication',async()=>{
 const result=await upload(a);assert.equal(result.response.status,201);trackId=result.json.id;assert.equal(result.json.visibility,'private');assert.ok(result.json.duration>15);
 assert.equal((await call('/tracks/'+trackId+'/audio')).response.status,404);
 assert.equal((await call('/tracks/'+trackId+'/audio',b)).response.status,404);
 assert.equal((await call('/tracks/'+trackId,b,'PATCH',{visibility:'public'})).response.status,404);
 assert.equal((await call('/discover')).json.items.length,0);
 assert.equal((await call('/tracks/'+trackId,a,'PATCH',{visibility:'public',tags:['azur'],remixAllowed:true})).response.status,200);
 assert.equal((await call('/discover?q=azur')).json.items[0].id,trackId);
 assert.equal((await call('/tracks?q=House',a)).json.items[0].id,trackId);
 assert.equal((await call('/tracks?q=House',b)).json.items.length,0);
 assert.equal((await call('/tracks?q=.*',a)).json.items.length,0);
 const audio=await call('/tracks/'+trackId+'/audio');assert.equal(audio.response.status,200);assert.ok(audio.response.headers.get('cache-control').includes('no-store'));
 assert.equal((await call('/discover?q=.*')).json.items.length,0);
});
test('invitations, messaging grants, revocation, and no private activity leaks',async()=>{
 await call('/tracks/'+trackId,a,'PATCH',{visibility:'private'});
 assert.equal((await call('/messages/'+a.user.id,b,'POST',{text:'Non ami'})).response.status,403);
 await friendship(a,b);
 assert.equal((await call('/activity',b)).json.tracks.length,0);
 assert.equal((await call('/messages/'+b.user.id,a,'POST',{text:'Une piste privée',trackId})).response.status,201);
 assert.equal((await call('/tracks/'+trackId+'/audio',b)).response.status,200);
 assert.equal((await call('/tracks/'+trackId+'/audio',c)).response.status,404);
 const messages=await call('/messages/'+a.user.id,b);assert.equal(messages.json[0].track.id,trackId);
 await call('/tracks/'+trackId,a,'PATCH',{visibility:'private',sharedWith:[]});
 assert.equal((await call('/tracks/'+trackId+'/audio',b)).response.status,404);
 assert.equal((await call('/messages/'+a.user.id,b)).json[0].interrupted,true);
 assert.equal((await call('/messages/'+a.user.id,b,'POST',{trackId,text:'Tentative de transfert'})).response.status,404);
});
test('remix authorization and immutable server-derived credit chain',async()=>{
 await call('/tracks/'+trackId,a,'PATCH',{visibility:'public',remixAllowed:false});
 assert.equal((await upload(b,{parentId:trackId,credits:'[]'})).response.status,403);
 await call('/tracks/'+trackId,a,'PATCH',{remixAllowed:true});
 const remix=await upload(b,{parentId:trackId,credits:'[]'});assert.equal(remix.response.status,201);assert.equal(remix.json.credits[0].userId,a.user.id);
 const id=remix.json.id;await call('/tracks/'+id,b,'PATCH',{visibility:'public',remixAllowed:true,credits:[]});
 const next=await upload(c,{parentId:id});assert.equal(next.response.status,201);assert.deepEqual(next.json.credits.map(credit=>credit.userId),[a.user.id,b.user.id]);
 const unchanged=await call('/tracks/'+id+'/detail');assert.equal(unchanged.json.credits[0].userId,a.user.id);
});
test('only an invitation recipient can accept or refuse it',async()=>{
 const invited=await call('/friends',c,'POST',{userId:a.user.id});assert.equal(invited.response.status,201);
 assert.equal((await call('/friends/'+invited.json.id,b,'PATCH',{accept:true})).response.status,404);
 assert.equal((await call('/friends/'+invited.json.id,a,'PATCH',{accept:false})).response.status,200);
 assert.equal((await call('/friends',c)).json.length,0);
});
test('blocking cuts friendship, private playback and conversations',async()=>{
 await call('/messages/'+b.user.id,a,'POST',{trackId,text:''});
 await call('/tracks/'+trackId,a,'PATCH',{visibility:'friends',sharedWith:[b.user.id]});
 assert.equal((await call('/tracks/'+trackId+'/audio',b)).response.status,200);
 await call('/blocks',b,'POST',{userId:a.user.id});
 assert.equal((await call('/tracks/'+trackId+'/audio',b)).response.status,404);
 assert.equal((await call('/messages/'+a.user.id,b)).response.status,403);
 assert.equal((await call('/friends',b)).json.length,0);
 await call('/blocks/'+a.user.id,b,'DELETE');
});
test('albums, playlists, favorites and project snapshots are persistent and owner-isolated',async()=>{
 await call('/tracks/'+trackId,a,'PATCH',{visibility:'public'});
 assert.equal((await call('/tracks/'+trackId+'/reactions',b,'POST',{kind:'favorite'})).response.status,200);assert.equal((await call('/favorites',b)).json[0].id,trackId);assert.equal((await call('/favorites',c)).json.length,0);
 const created=await call('/collections',a,'POST',{name:'Album privé',kind:'album'});assert.equal(created.response.status,201);
 const collections=await call('/collections',a);assert.equal(collections.json[0].name,'Album privé');assert.equal((await call('/collections',b)).json.length,0);
 assert.equal((await call('/collections/'+created.json.id,b,'PUT',{name:'Volé'})).response.status,404);
 await friendship(a,b);await call('/collections/'+created.json.id,a,'PUT',{visibility:'public',trackIds:[trackId]});assert.equal((await call('/activity',b)).json.albums[0].name,'Album privé');
 const notices=await call('/notifications',b);assert.ok(notices.json.items.length>0);await call('/notifications/read',b,'POST',{});assert.equal((await call('/notifications',b)).json.unread,0);
 const snapshot=await call('/projects',a,'POST',{name:'Brouillon',sharedWith:[b.user.id],settings:{effects:{studioVersion:1}}});assert.equal(snapshot.response.status,201);assert.equal(snapshot.json.sharedWith.length,0);
 assert.equal((await call('/projects',b)).json.length,0);
 await call('/projects/'+snapshot.json.id+'/share',a,'POST',{email:'bob@example.test'});assert.equal((await call('/projects',b)).json.length,1);await call('/projects/'+snapshot.json.id+'/share/'+b.user.id,a,'DELETE');assert.equal((await call('/projects',b)).json.length,0);
});
test('admin cannot read private files or conversations, and role cannot be escalated',async()=>{
 assert.equal((await call('/admin',c)).response.status,403);
 await call('/settings',c,'PATCH',{role:'admin'});assert.equal((await call('/admin',c)).response.status,403);
 await User.updateOne({_id:c.user.id},{$set:{role:'admin'}});
 await call('/tracks/'+trackId,a,'PATCH',{visibility:'private'});
 assert.equal((await call('/admin',c)).response.status,200);
 assert.equal((await call('/tracks/'+trackId+'/audio',c)).response.status,404);
 assert.equal((await call('/messages/'+a.user.id,c)).response.status,403);
 assert.equal((await call('/admin/users/'+b.user.id,c,'PATCH',{suspended:true})).response.status,200);
 assert.equal((await call('/tracks',b)).response.status,401);
 assert.equal((await call('/auth/login',null,'POST',{email:'bob@example.test',password})).response.status,401);
 await call('/admin/users/'+b.user.id,c,'PATCH',{suspended:false});
});
test('login rejects malformed credentials without an internal error',async()=>{
 for(const body of [{email:{value:'alice@example.test'},password}, {email:'alice@example.test',password:{}}, {email:'alice@example.test',password:''}])assert.equal((await call('/auth/login',null,'POST',body)).response.status,400);
 const session=await call('/auth/login',null,'POST',{email:'alice@example.test',password});assert.equal(session.response.status,200);assert.equal(session.json.user.id,a.user.id);
});
test('multipart signatures reject disguised files and deleted accounts lose token access',async()=>{
 const form=new FormData();form.append('audio',new Blob(['not audio'],{type:'audio/wav'}),'fake.wav');assert.equal((await call('/tracks',a,'POST',form)).response.status,400);
 const deleted=await call('/account',b,'DELETE',{password});assert.equal(deleted.response.status,204);assert.equal((await call('/tracks',b)).response.status,401);
});
