import mongoose from 'mongoose';
const schema=new mongoose.Schema({ownerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, trackId:{type:mongoose.Schema.Types.ObjectId,ref:'Track',required:true}, reason:{type:String,trim:true,required:true,maxlength:1000}, status:{type:String,enum:['open','resolved'],default:'open'}},{timestamps:true});

export const Report=mongoose.model('Report',schema);
