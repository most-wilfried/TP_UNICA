import { parseFile } from 'music-metadata';
import { fileTypeFromFile } from 'file-type';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { socialRoutes, uploadMetadata } from './social/routes.js';
import { escaped, friends, validId } from './social/access.js';
import express from "express";
import cors from "cors";
import multer from "multer";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { User } from "./models/User.js";
import { Track } from "./models/Track.js";
import { MixProject } from "./models/MixProject.js";

// Les fichiers audio restent sur le disque du serveur dans ce TP.
// MongoDB ne conserve que leurs métadonnées : titre, nom, taille, etc.
const UPLOADS = path.resolve("data/uploads");

try {
  // mkdirSync est utilisé au démarrage : l'application doit disposer de ce
  // dossier avant de pouvoir accepter le premier upload.
  fs.mkdirSync(UPLOADS, { recursive: true });
  console.log(`[startup] Dossier des uploads prêt : ${UPLOADS}`);
} catch (error) {
  console.error("[startup] Impossible de créer le dossier des uploads", error);
  throw error;
}

// Ce secret reste côté serveur. Il ne doit jamais être copié dans Angular.
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) throw new Error('JWT_SECRET robuste requis en production');
const SECRET = process.env.JWT_SECRET || "tp1-development-secret";

// La taille maximale d'un fichier audio est de 25 Mo. Les fichiers plus gros
// sont refusés par Multer avant d'être écrits sur le disque.
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Les types MIME autorisés correspondent aux formats demandés dans le sujet.
const allowed = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "video/mp4", "video/webm", "image/png", "image/jpeg", "image/webp",
]);

/**
 * Crée un jeton JWT contenant uniquement l'identité nécessaire à l'API.
 * Le mot de passe n'est jamais placé dans le token. `sub` signifie subject
 * et contient l'identifiant MongoDB de l'utilisateur.
 */
function token(user) {
  console.log(`[auth] Création d'un token pour l'utilisateur ${user.id}`);
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, {
    expiresIn: "2h",
  });
}

/** Middleware Express qui protège les routes privées. */
async function auth(req, res, next) {
  const raw = req.headers.authorization;

  // Le token est transmis dans l'en-tête Authorization sous la forme
    // "Authorization: Bearer <token>". Le préfixe "Bearer " est obligatoire pour que
    // le middleware sache qu'il s'agit d'un JWT et non d'un autre type de jeton.
  if (!raw?.startsWith("Bearer ")) {
    console.warn(`[auth] Authorization absente pour ${req.method} ${req.path}`);
    return res.status(401).json({ message: "Authentification requise" });
  }

  try {
    // jwt.verify vérifie la signature et la date d'expiration du token.
    // On ne logue jamais sa valeur, car un JWT permettrait une usurpation.
    req.auth = jwt.verify(raw.slice(7), SECRET, {algorithms:['HS256']});
    if (!validId(req.auth.sub) || !await User.exists({_id:req.auth.sub,suspended:{$ne:true}})) return res.status(401).json({message:'Session invalide'});
    console.log(`[auth] Token accepté pour ${req.auth.sub}`);
    next();
  } catch (error) {
    console.error("[auth] Token invalide ou expiré", error);
    return res.status(401).json({ message: "Jeton invalide ou expiré" });
  }
}

/*
 * Multer transforme une requête HTTP multipart/form-data en données exploitables
 * par Express et traite les fichiers envoyés par un formulaire HTML.
 * Documentation officielle : https://github.com/expressjs/multer
 *
 * diskStorage indique que Multer écrit directement le fichier sur disque.
 * Chaque callback doit appeler cb(error, value) : null signifie qu'il n'y a
 * pas d'erreur. Le nom aléatoire évite les collisions entre utilisateurs.
 */
const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    console.debug(`[multer] Destination sélectionnée : ${UPLOADS}`);
    callback(null, UPLOADS);
  },
  filename: (_request, file, callback) => {
    const filename =
      crypto.randomUUID() + path.extname(file.originalname).toLowerCase();
    console.log("[multer] Nom de stockage sécurisé généré");
    callback(null, filename);
  },
});

/*
 * limits.fileSize protège le serveur contre les fichiers trop volumineux.
 * fileFilter est appelé avant l'enregistrement : accepter le fichier appelle
 * callback(null, true), le refuser transmet une vraie Error à Express.
 */
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_request, file, callback) => {
    // Seuls les types MIME audio demandés dans le sujet sont acceptés.
    if (allowed.has(file.mimetype)) {
      console.log(`[multer] Type accepté : ${file.mimetype}`);
      return callback(null, true);
    }

    const error = new Error("Format audio non accepté");
    console.error(`[multer] Type refusé : ${file.mimetype}`, error);
    return callback(error);
  },
});

/**
 * Construit l'application Express sans ouvrir de port.
 * Cette séparation permet au serveur réel et aux tests de créer la même
 * application. Le port est ouvert uniquement dans server.js.
 */
export function createApp() {
  const app = express();

  // Journaliser la fin de chaque requête permet de suivre méthode, URL,
  // statut et durée sans exposer les corps contenant des mots de passe.
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      console.log(
        `[http] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - startedAt} ms)`,
      );
    });
    next();
  });

  // CORS est nécessaire pour que le frontend Angular puisse appeler l'API.
  // C'est-à-dire que le navigateur autorise les requêtes cross-origin depuis localhost:4200.
  // Dans un vrai projet, il est recommandé de limiter les origines autorisées.
  app.disable('x-powered-by');
  app.use(helmet({contentSecurityPolicy:false,crossOriginResourcePolicy:{policy:'same-site'}}));
  const origins=(process.env.CORS_ORIGINS || 'http://localhost:4200,http://localhost:4201').split(',');
  app.use(cors({origin:(origin,callback)=>callback(null,!origin||origins.includes(origin))}));
  app.use('/api',rateLimit({windowMs:60000,limit:300,standardHeaders:'draft-8',legacyHeaders:false}));
  app.use('/api/auth',rateLimit({windowMs:15*60000,limit:50,standardHeaders:'draft-8',legacyHeaders:false}));

  // Express ne gère pas nativement le JSON : ce middleware transforme le corps JSON en objet JavaScript 
  // accessible via req.body.
  // Il est placé avant les routes pour que toutes les requêtes JSON soient traitées.
  app.use(express.json({limit:'256kb'}));
  const optionalAuth=(req,res,next)=>req.headers.authorization?auth(req,res,next):next();
  app.use('/api',socialRoutes({auth,optionalAuth,uploads:UPLOADS}));

  /** Endpoint public utilisé pour vérifier que l'API répond. */
  app.get("/api/health", (_req, res) => {
    console.log("[health] Vérification de l'API");
    res.json({ status: "ok" });
  });

  /** Requête POST pour "insertion" de donnée.
   * Inscrit un utilisateur et renvoie un token avec ses données publiques. 
   * @param {Object} req - La requête HTTP.
   * @param {Object} res - La réponse HTTP.
   * @param {Function} next - La fonction de middleware suivante.
   */
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { name, email, password } = req.body || {};
      console.log(`[auth] Tentative d'inscription pour ${email || "email absent"}`);

      if (typeof name!=='string' || typeof email!=='string' || typeof password!=='string' || name.trim().length<2 || name.length>100 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length<8 || password.length>128) {
        console.warn("[auth] Inscription refusée : données invalides ou incomplètes");
        return res.status(400).json({
          message: "Nom, email et mot de passe de 8 caractères requis",
        });
      }

      // Vérifie si l'email est déjà utilisé avant de créer un nouvel utilisateur.
      if (await User.exists({ email: String(email).toLowerCase() })) {
        console.warn(`[auth] Email déjà utilisé : ${email}`);
        return res.status(409).json({ message: "Email déjà utilisé" });
      }

      // Crée l'utilisateur et le stocke dans MongoDB. Le mot de passe est haché
      // par le hook pre('validate') défini dans le schéma Mongoose.
      const user = await User.create({ name, email, password });
      console.log(`[auth] Utilisateur créé : ${user.id}`);
      res.status(201).json({ token: token(user), user: user.toPublic() });
    } catch (error) {
      console.error("[auth] Erreur pendant l'inscription", error);
      next(error);
    }
  });

  /** Vérifie les identifiants et ouvre une session JWT. Les identifiants sont envoyés dans le corps de la 
   * requête par un HTTP POST. */
  app.post("/api/auth/login", async (req, res, next) => {
    try {
        // req.body est déjà un objet JavaScript grâce au middleware express.json() placé plus haut.
        // il contient les champs email et password envoyés par le frontend Angular.
      if(typeof req.body?.email!=='string'||typeof req.body?.password!=='string'||req.body.email.length>254||!req.body.password||req.body.password.length>128){
        return res.status(400).json({message:'Email et mot de passe valides requis'});
      }
      const email = req.body.email.trim().toLowerCase();
      console.log(`[auth] Tentative de connexion pour ${email || "email absent"}`);

      // Sélectionne le mot de passe haché pour vérifier les identifiants.
      // User est un modèle Mongoose qui correspond au schéma défini dans models/User.js.
      // on envoie les requête à MongoDB via cet objet. Le mot de passe haché est stocké dans 
      // passwordHash, mais il n'est pas renvoyé par défaut dans les requêtes pour 
      // des raisons de sécurité.
      const user = await User.findOne({ email }).select("+passwordHash");

      if (!user || user.suspended || !(await user.verifyPassword(req.body.password))) {
        console.warn(`[auth] Identifiants incorrects pour ${email}`);
        return res.status(401).json({ message: "Identifiants incorrects" });
      }

      console.log(`[auth] Connexion réussie : ${user.id}`);
      res.json({ token: token(user), user: user.toPublic() });
    } catch (error) {
      console.error("[auth] Erreur pendant la connexion", error);
      next(error);
    }
  });

  /** Retourne le profil public de l'utilisateur identifié par le JWT. 
   * Les paramètres sont :
   * @param auth - Le middleware qui vérifie le JWT et ajoute req.auth. 
   * @param {Object} req - La requête HTTP.
   * @param {Object} res - La réponse HTTP.
   * @param {Function} next - La fonction de middleware suivante.
  */
  app.get("/api/users/me", auth, async (req, res, next) => {
    try {
        // req.auth.sub contient l'identifiant MongoDB de l'utilisateur 
        // extrait du JWT par le middleware auth. ici req.auth est un objet ajouté par le middleware 
        // auth à la requête, et sub est la propriété qui contient l'identifiant de l'utilisateur.
      const user = await User.findById(req.auth.sub);
      if (!user) {
        console.warn(`[user] Profil introuvable : ${req.auth.sub}`);
        return res.status(404).json({ message: "Utilisateur inconnu" });
      }

      console.log(`[user] Profil envoyé : ${user.id}`);
      res.json(user.toPublic());
    } catch (error) {
      console.error("[user] Erreur de lecture du profil", error);
      next(error);
    }
  });

  /** Modifie uniquement le nom de l'utilisateur connecté. */
  app.put("/api/users/me", auth, async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.auth.sub,
        { $set: { name: req.body?.name } },
        { returnDocument: 'after', runValidators: true },
      );

      if (!user) {
        console.warn(`[user] Mise à jour impossible : ${req.auth.sub}`);
        return res.status(404).json({ message: "Utilisateur inconnu" });
      }

      console.log(`[user] Nom mis à jour : ${user.id}`);
      res.json(user.toPublic());
    } catch (error) {
      console.error("[user] Erreur de mise à jour du profil", error);
      next(error);
    }
  });

  /** Retourne une page des pistes appartenant exclusivement à l'utilisateur. */
  app.get("/api/tracks", auth, async (req, res, next) => {
    try {
      const page = Math.max(1, Math.min(10000, parseInt(req.query.page,10) || 1));
      const limit = Math.min(20, Math.max(1, parseInt(req.query.limit,10) || 5));
      const filter = { ownerId: req.auth.sub };
      if(typeof req.query.q==='string'&&req.query.q.trim()){
        const regex=new RegExp(escaped(req.query.q.trim().slice(0,100)),'i');
        filter.$or=[{title:regex},{style:regex},{tags:regex}];
      }

      console.log(`[tracks] Lecture page=${page}, limit=${limit}, user=${req.auth.sub}`);

      // La lecture des pistes et le comptage total sont parallélisés pour réduire la latence.
      // on utilise Promise.all pour exécuter les deux opérations en parallèle. 
      // Track.find() récupère les pistes de l'utilisateur avec pagination, 
      // tandis que Track.countDocuments() compte le nombre total de pistes pour cet utilisateur.
      // Promise.all attend que les deux opérations soient terminées avant de continuer et les résultats
        // sont stockés dans les variables items et total.
      const [items, total] = await Promise.all([
        Track.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select("-storedName")
          .lean(),
        Track.countDocuments(filter),
      ]);

      // items.map(track) crée un nouveau tableau publicItems en transformant chaque piste pour inclure 
      // uniquement les champs nécessaires à l'API.
      // L'identifiant MongoDB (_id) est converti en chaîne de caractères (id) pour être plus lisible 
      // côté frontend.
      // Le champ _id (généré par MongoDB) est supprimé pour éviter de l'exposer dans la réponse JSON.
      const publicItems = items.map((track) => ({
        ...track,
        id: String(track._id),
        _id: undefined,
      }));

      console.log(`[tracks] ${publicItems.length} piste(s) envoyée(s) sur ${total}`);

      // envoi de la réponse JSON avec les pistes publiques, la page actuelle, la limite par page, 
      // le nombre total de pistes et le nombre total de pages.
      res.json({
        items: publicItems,
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      });
    } catch (error) {
      console.error("[tracks] Erreur de pagination", error);
      next(error);
    }
  });

  /**
   * Reçoit le champ multipart audio et le champ texte title.
   * upload.single("audio") traite un seul fichier et le place dans req.file,
   * tandis que req.body.title contient le champ texte associé.
   * C'est ici qu'est fait l'upload de fichiers sur le serveur. 
   * Le middleware auth vérifie le JWT avant d'accepter l'upload.
   * Le middleware upload.single("audio") traite le fichier audio envoyé dans le champ "audio" du formulaire
   * ou de l'appel depuis le frontend avec un objet FormData.
   * Si le fichier est accepté, il est stocké sur le disque et ses métadonnées sont enregistrées 
   * dans MongoDB.
   */
  app.post(
    "/api/tracks",
    auth,
    upload.single("audio"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          console.warn(`[tracks] Upload sans fichier par ${req.auth.sub}`);
          return res.status(400).json({ message: "Fichier audio requis" });
        }

        const detected=await fileTypeFromFile(req.file.path);
        const formats={mp3:['audio/mpeg'],wav:['audio/wav','audio/x-wav'],ogg:['audio/ogg'],opus:['audio/ogg'],m4a:['audio/mp4','audio/x-m4a'],mp4:['audio/mp4','video/mp4'],webm:['audio/webm','video/webm'],png:['image/png'],jpg:['image/jpeg'],webp:['image/webp']};
        if(!detected || !formats[detected.ext]?.includes(req.file.mimetype))throw Object.assign(new Error('Le contenu du fichier ne correspond pas à un média audio autorisé'),{status:400});
        const metadata=await uploadMetadata(req.body,req.auth.sub);
        if(!['png','jpg','webp'].includes(detected.ext)){
          try {const audioMetadata=await parseFile(req.file.path,{duration:true});metadata.duration=Number.isFinite(audioMetadata.format.duration)?Math.max(0,audioMetadata.format.duration):0;}
          catch(error){console.error('[upload] Métadonnées illisibles',error.name);throw Object.assign(new Error('Média illisible ou format non pris en charge'),{status:400});}
        }
        const track = await Track.create({
          ...metadata,
          ownerId: req.auth.sub,
          title: metadata.title,
          originalName: req.file.originalname,
          storedName: req.file.filename,
          mimeType: req.file.mimetype,
          size: req.file.size,
        });

        console.log(`[tracks] Upload enregistré : ${track.id}`);
        res.status(201).json(track.toPublic());
      } catch (error) {
        console.error("[tracks] Erreur après l'enregistrement du fichier", error);

        // Si MongoDB échoue après l'écriture sur disque, on tente de nettoyer
        // le fichier orphelin. L'erreur de nettoyage est elle aussi loguée.
        if (req.file) {
          const uploadedPath = path.join(UPLOADS, req.file.filename);
          try {
            await fsPromises.unlink(uploadedPath);
            console.log(`[tracks] Fichier temporaire supprimé : ${uploadedPath}`);
          } catch (cleanupError) {
            console.error(
              `[tracks] Impossible de supprimer le fichier temporaire ${uploadedPath}`,
              cleanupError,
            );
          }
        }
        next(error);
      }
    },
  );

  /** Envoie le contenu binaire d'une piste après vérification de sa propriété. */
  app.get("/api/tracks/:id/audio", auth, async (req, res, next) => {
    try {
      const track = await Track.findOne({
        _id: req.params.id,
        ownerId: req.auth.sub,
      }).select("+storedName");

      if (!track) {
        console.warn(`[tracks] Audio introuvable ou interdit : ${req.params.id}`);
        return res.status(404).json({ message: "Piste inconnue" });
      }

      const audioPath = path.join(UPLOADS, track.storedName);
      res.type(track.mimeType);
      // Ce callback permet de loguer le succès ou l'erreur du transfert.
      res.sendFile(audioPath, (error) => {
        if (error) {
          console.error(`[tracks] Erreur d'envoi audio ${track.id}`, error);
          if (!res.headersSent) next(error);
          return;
        }
        console.log(`[tracks] Audio envoyé : ${track.id}`);
      });
    } catch (error) {
      console.error("[tracks] Erreur de préparation du flux audio", error);
      next(error);
    }
  });

  /** Supprime la métadonnée et le fichier physique correspondant. */
  app.delete("/api/tracks/:id", auth, async (req, res, next) => {
    try {
      const track = await Track.findOneAndDelete({
        _id: req.params.id,
        ownerId: req.auth.sub,
      }).select("+storedName");

      if (!track) {
        console.warn(`[tracks] Suppression impossible : ${req.params.id}`);
        return res.status(404).json({ message: "Piste inconnue" });
      }

      const audioPath = path.join(UPLOADS, track.storedName);
      try {
        await fsPromises.unlink(audioPath);
        console.log(`[tracks] Fichier supprimé : ${audioPath}`);
      } catch (error) {
        // L'exception n'est volontairement pas ignorée : l'administrateur doit
        // voir ce fichier orphelin si sa suppression échoue.
        console.error(`[tracks] Fichier audio non supprimé : ${audioPath}`, error);
        return res.status(500).json({
          message: "Métadonnée supprimée, mais fichier audio non supprimé",
        });
      }

      res.status(204).end();
    } catch (error) {
      console.error("[tracks] Erreur de suppression", error);
      next(error);
    }
  });

  /** Projets de mixage persistés dans MongoDB et accessibles au propriétaire ou aux invités. */
  app.get("/api/projects", auth, async (req, res, next) => {
    try {
      const projects = await MixProject.find({
        $or: [{ ownerId: req.auth.sub }, { sharedWith: req.auth.sub }],
      }).sort({ updatedAt: -1 });
      const visible=[];for(const project of projects)if(String(project.ownerId)===req.auth.sub || await friends(project.ownerId,req.auth.sub))visible.push(project.toPublic());
      res.json(visible);
    } catch (error) {
      console.error("[projects] Lecture impossible", error);
      next(error);
    }
  });

  app.post("/api/projects", auth, async (req, res, next) => {
    try {
      const body=req.body || {};
      const safe={};for(const key of ['name','artist','genre','tags','coverImageUrl','settings'])if(body[key]!==undefined)safe[key]=body[key];
      if(body.trackId){const track=await Track.findOne({_id:body.trackId,ownerId:req.auth.sub});if(!track)return res.status(404).json({message:'Piste inconnue'});safe.trackId=track.id;}
      const project = await MixProject.create({ ...safe, ownerId: req.auth.sub });
      res.status(201).json(project.toPublic());
    } catch (error) {
      console.error("[projects] Création impossible", error);
      next(error);
    }
  });

  app.put("/api/projects/:id", auth, async (req, res, next) => {
    try {
      const current = await MixProject.findOne({ _id: req.params.id, ownerId: req.auth.sub });
      if (!current) return res.status(404).json({ message: "Projet inconnu" });
      current.versions.push({ number: current.versions.length + 1, settings: current.settings });
      if(req.body?.trackId){const track=await Track.findOne({_id:req.body.trackId,ownerId:req.auth.sub});if(!track)return res.status(404).json({message:'Piste inconnue'});}
      const allowed = ["name", "trackId", "artist", "genre", "tags", "coverImageUrl", "settings"];
      for (const field of allowed) if (req.body?.[field] !== undefined) current[field] = req.body[field];
      await current.save();
      res.json(current.toPublic());
    } catch (error) {
      console.error("[projects] Mise à jour impossible", error);
      next(error);
    }
  });

  app.delete("/api/projects/:id", auth, async (req, res, next) => {
    try {
      const project = await MixProject.findOneAndDelete({ _id: req.params.id, ownerId: req.auth.sub });
      if (!project) return res.status(404).json({ message: "Projet inconnu" });
      res.status(204).end();
    } catch (error) {
      console.error("[projects] Suppression impossible", error);
      next(error);
    }
  });

  app.post("/api/projects/:id/share", auth, async (req, res, next) => {
    try {
      if(req.body?.userId&&!validId(req.body.userId))return res.status(400).json({message:"Identifiant invalide"});
      const user = req.body?.userId?await User.findById(req.body.userId):await User.findOne({ email: String(req.body?.email || "").toLowerCase() });
      if (!user || !await friends(req.auth.sub,user.id)) return res.status(404).json({message:'Destinataire non autorisé'});
      const project = await MixProject.findOneAndUpdate(
        { _id: req.params.id, ownerId: req.auth.sub },
        { $addToSet: { sharedWith: user.id }, $set:{visibility:'friends'} },
        { returnDocument: 'after' },
      );
      if (!project) return res.status(404).json({ message: "Projet inconnu" });
      res.json(project.toPublic());
    } catch (error) {
      console.error("[projects] Partage impossible", error);
      next(error);
    }
  });

  app.delete('/api/projects/:id/share/:userId',auth,async(req,res,next)=>{try{if(!validId(req.params.id)||!validId(req.params.userId))return res.status(400).json({message:'Identifiant invalide'});const project=await MixProject.findOneAndUpdate({_id:req.params.id,ownerId:req.auth.sub},{$pull:{sharedWith:req.params.userId}},{returnDocument:'after'});if(!project)return res.status(404).json({message:'Projet inconnu'});res.json(project.toPublic());}catch(error){console.error('[Projet] Révocation impossible',error.message);next(error);}});

  /** Gestionnaire central des erreurs connues de l'application. */
  app.use((error, _req, res, next) => {
    console.error("[error] Erreur reçue par le gestionnaire central", error);

    if (
      error instanceof multer.MulterError ||
      error?.message === "Format audio non accepté"
    ) {
      return res.status(400).json({ message: error.message });
    }
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error?.name === "CastError") {
      return res.status(404).json({ message: "Ressource inconnue" });
    }

    if(error.status) return res.status(error.status).json({message:error.message});
    if(error.code===11000)return res.status(409).json({message:'Cet élément existe déjà'});
    if(error.type==='entity.too.large')return res.status(413).json({message:'Requête trop volumineuse'});
    if(error instanceof SyntaxError)return res.status(400).json({message:'JSON invalide'});
    res.status(500).json({message:'Erreur interne du serveur'});
  });

  return app;
}
