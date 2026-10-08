import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  bpm: { type: Number, min: 40, max: 240, default: 120 },
  volume: { type: Number, min: 0, max: 1, default: 1 },
  pan: { type: Number, min: -1, max: 1, default: 0 },
  playbackRate: { type: Number, min: 0.5, max: 2, default: 1 },
  regionStart: { type: Number, min: 0, default: 0 },
  regionEnd: { type: Number, min: 0, default: 0 },
  effects: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const versionSchema = new mongoose.Schema({
  number: { type: Number, required: true },
  settings: { type: settingsSchema, required: true },
  savedAt: { type: Date, default: Date.now },
}, { _id: false });

const schema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  name: { type: String, required: true, trim: true, maxlength: 120 },
  trackId: { type: mongoose.Schema.Types.ObjectId, ref: "Track" },
  artist: { type: String, trim: true, default: "" },
  genre: { type: String, trim: true, default: "" },
  tags: [{ type: String, trim: true }],
  coverImageUrl: { type: String, trim: true, default: "" },
  settings: { type: settingsSchema, default: () => ({}) },
  versions: { type: [versionSchema], default: [] },
}, { timestamps: true });

schema.methods.toPublic = function () {
  return {
    id: this.id, name: this.name, trackId: this.trackId ? String(this.trackId) : null,
    artist: this.artist, genre: this.genre, tags: this.tags,
    coverImageUrl: this.coverImageUrl, settings: this.settings,
    versions: this.versions, sharedWith: this.sharedWith.map(String),
    createdAt: this.createdAt, updatedAt: this.updatedAt,
  };
};

export const MixProject = mongoose.model("MixProject", schema);
