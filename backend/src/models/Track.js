import mongoose from "mongoose";

/*
 * Ce schéma conserve les métadonnées d'une piste. Le fichier audio lui-même
 * reste sur le disque ; storedName contient le nom technique utilisé côté
 * serveur et n'est jamais exposé par toPublic().
 */
const schema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    style: { type: String, trim: true, maxlength: 60, default: 'Autre' },
    tags: [{type:String,trim:true,maxlength:50}],
    coverImageUrl: {type:String,default:'',maxlength:2000},
    duration: {type:Number,min:0,default:0},
    visibility: {type:String,enum:['private','friends','public'],default:'private'},
    sharedWith: [{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    remixAllowed: {type:Boolean,default:false},
    parentId: {type:mongoose.Schema.Types.ObjectId,ref:'Track',immutable:true},
    sourceIds: {type:[{type:mongoose.Schema.Types.ObjectId,ref:'Track'}],default:[],immutable:true},
    credits: {type:[{userId:String,name:String}],default:[],immutable:true},
    kind: {type:String,enum:['track','mix','remix'],default:'track'},
    moderated: {type:Boolean,default:false},
    originalName: { type: String, required: true },
    storedName: { type: String, required: true, select: false },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

// Cet index accélère la liste des pistes d'un utilisateur triées par date.
schema.index({ ownerId: 1, createdAt: -1 });

/**
 * Convertit un document Mongoose en objet sûr pour le frontend.
 * L'identifiant MongoDB devient la propriété simple `id` attendue par Angular.
 */
schema.methods.toPublic = function () {
  console.debug(`[track-model] Préparation de la piste publique ${this.id}`);
  return {
    id: this.id,
    ownerId: String(this.ownerId),
    title: this.title,
    originalName: this.originalName,
    mimeType: this.mimeType,
    size: this.size,
    createdAt: this.createdAt,
    style: this.style || 'Autre', tags: this.tags, coverImageUrl: this.coverImageUrl,
    duration: this.duration, visibility: this.visibility || 'private', sharedWith: this.sharedWith.map(String),
    remixAllowed: this.remixAllowed, parentId: this.parentId ? String(this.parentId) : null,
    credits: this.credits, kind: this.kind,
  };
};

export const Track = mongoose.model("Track", schema);
