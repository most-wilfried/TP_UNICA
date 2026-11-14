import mongoose from 'mongoose';
import { User } from '../src/models/User.js';
const email=process.argv[2];
if(!email || !process.env.MONGODB_URI) throw new Error('Utilisation : node --env-file=.env scripts/set-admin.js adresse-email-du-compte');
try {await mongoose.connect(process.env.MONGODB_URI);const user=await User.findOneAndUpdate({email:email.toLowerCase()},{$set:{role:'admin'}},{returnDocument:'after'});if(!user)throw new Error('Créez ce compte avant de lui accorder le rôle administrateur.');console.log('Rôle administrateur attribué au compte sélectionné.');}
finally {await mongoose.disconnect();}
