import mongoose from 'mongoose';
const schema=new mongoose.Schema({ownerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true}, name:{type:String,trim:true,required:true,maxlength:120}, kind:{type:String,enum:['album','playlist'],required:true}, visibility:{type:String,enum:['private','public'],default:'private'}, trackIds:[{type:mongoose.Schema.Types.ObjectId,ref:'Track'}]},{timestamps:true});

export const Collection=mongoose.model('Collection',schema);
