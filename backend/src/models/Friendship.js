import mongoose from 'mongoose';
const schema=new mongoose.Schema({sender: {type: mongoose.Schema.Types.ObjectId, ref:'User', required:true}, recipient: {type: mongoose.Schema.Types.ObjectId, ref:'User', required:true}, pair: {type:String,required:true,unique:true}, status: {type:String,enum:['pending','accepted'],default:'pending'}},{timestamps:true});

export const Friendship=mongoose.model('Friendship',schema);
