import mongoose from 'mongoose';
const schema=new mongoose.Schema({ownerId: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, targetId: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}},{timestamps:true});
schema.index({ownerId:1,targetId:1},{unique:true});
export const Block=mongoose.model('Block',schema);
