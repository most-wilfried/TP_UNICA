import mongoose from 'mongoose';
const schema=new mongoose.Schema({ownerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}, actorId:{type:mongoose.Schema.Types.ObjectId,ref:'User'}, type:{type:String,enum:['invitation','accepted','message','share','publication'],required:true}, trackId:{type:mongoose.Schema.Types.ObjectId,ref:'Track'}, read:{type:Boolean,default:false}},{timestamps:true});

export const Notification=mongoose.model('Notification',schema);
