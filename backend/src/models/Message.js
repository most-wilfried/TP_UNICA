import mongoose from 'mongoose';
const schema=new mongoose.Schema({sender: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, recipient: {type:mongoose.Schema.Types.ObjectId,ref:'User',required:true}, text:{type:String,trim:true,maxlength:2000,default:''}, trackId:{type:mongoose.Schema.Types.ObjectId,ref:'Track'}, readAt:{type:Date,default:null}},{timestamps:true});
schema.index({sender:1,recipient:1,createdAt:-1});
export const Message=mongoose.model('Message',schema);
