import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/*
 * Un schéma Mongoose décrit la forme des documents MongoDB et leurs règles de
 * validation. `timestamps` ajoute automatiquement createdAt et updatedAt.
 */
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // select:false empêche de renvoyer le hash par défaut dans les requêtes.
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

/**
 * Virtual property : `password` n'est pas stocké dans MongoDB.
 * Le setter conserve temporairement le mot de passe en mémoire pour que le
 * hook pre('validate') puisse le hacher avant la sauvegarde.
 */
schema.virtual("password").set(function (value) {
  this._plainPassword = value;
});

/**
 * Hook exécutéDans un nouveau terminal (conseil : utilisez Git Bash comme shell dans le terminal), testez le projet frontend Angular proposé. Le fichier `proxy.conf.json` se trouve à la racine du projet frontend ; sa propriété `target` contient normalement `http://localhost:3000`. Si le backend est lancé sur un autre port, adaptez cette valeur.
 avant la validation d'un nouvel utilisateur.
 * bcrypt transforme le mot de passe en hash irréversible ; le mot de passe
 * original ne doit jamais être écrit dans la base ni dans les logs.
 */
schema.pre("validate", async function () {
  if (this.isNew && this._plainPassword) {
    console.debug(`[user-model] Hachage du mot de passe pour ${this.email}`);
    this.passwordHash = await bcrypt.hash(this._plainPassword, 10);
  }
});

/** Compare un mot de passe reçu avec le hash stocké. */
schema.methods.verifyPassword = function (value) {
  console.debug(`[user-model] Vérification du mot de passe pour ${this.email}`);
  return bcrypt.compare(value, this.passwordHash);
};

/** Retourne uniquement les champs qu'une réponse HTTP peut exposer. */
schema.methods.toPublic = function () {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    createdAt: this.createdAt,
  };
};

export const User = mongoose.model("User", schema);
