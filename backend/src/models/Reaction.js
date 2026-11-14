import mongoose from 'mongoose';
const schema=new mongoose.Schema({ownerId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, trackId:{type:mongoose.Schema.Types.ObjectId,ref:'Track',required:true}, kind:{type:String,enum:['like','favorite'],required:true}},{timestamps:true});
schema.index({ownerId:1,trackId:1,kind:1},{unique:true});
export const Reaction=mongoose.model('Reaction',schema);
