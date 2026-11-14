# Contrat HTTP — MOST VIBE (compatibilité TP1–TP3)

Base : `/api`. Les routes privées exigent `Authorization: Bearer <token>`. Santé, authentification, découverte, albums publics et médias publics peuvent être consultés sans connexion ; voir le contrat social ci-dessous.

Le contrat HTTP ne dépend pas du choix de persistance : le backend fourni utilise Mongoose et MongoDB. MongoDB conserve les utilisateurs et métadonnées ; les octets des fichiers audio restent sur le disque du serveur.

| Méthode | Route | Requête | Réponse principale |
|---|---|---|---|
| GET | `/health` | - | `{ "status": "ok" }` |
| POST | `/auth/register` | `{name,email,password}` | `201 {token,user}` |
| POST | `/auth/login` | `{email,password}` texte, email ≤254, mot de passe 1–128 caractères | `200 {token,user}` ; `400` format invalide, `401` identifiants incorrects ou compte suspendu |
| GET | `/users/me` | JWT | `200 User` |
| PUT | `/users/me` | `{name}` + JWT | `200 User` |
| GET | `/tracks?page=1&limit=5&q=` | JWT ; `page` entier 1–10000, `limit` 1–20, `q` facultatif ≤100 caractères (titre/style/tags) | `Page<Track>` du propriétaire ; `401` hors connexion |
| POST | `/tracks` | multipart : `audio`, `title` | `201 Track` |
| GET | `/tracks/:id/audio` | JWT facultatif, public ou destinataire autorisé | flux média |
| DELETE | `/tracks/:id` | JWT | `204` (bonus) |
| GET | `/projects` | JWT | `200 MixProject[]` |
| POST | `/projects` | `{name,trackId?,artist?,genre?,tags?,coverImageUrl?,settings?}` + JWT | `201 MixProject` |
| PUT | `/projects/:id` | champs modifiables + JWT propriétaire | `200 MixProject` et version précédente archivée |
| DELETE | `/projects/:id` | JWT propriétaire | `204` |
| POST | `/projects/:id/share` | `{email}` + JWT propriétaire | `200 MixProject` |

`Page<Track>` contient `items`, `page`, `limit`, `total` et `pages`. Formats historiques : MP3, WAV, OGG et M4A, 25 Mo maximum ; les formats multimédia ajoutés sont détaillés dans le contrat social.

Erreurs courantes : `400` validation, `401` authentification, `404` ressource, `409` email déjà utilisé.

`MixProject.settings` conserve le BPM, le volume, le panoramique, la vitesse,
la zone de lecture et les paramètres d'effets. Seul le propriétaire peut
modifier, supprimer ou partager un projet. Les utilisateurs présents dans
`sharedWith` disposent d'un accès en lecture via `GET /projects`.

### Sauvegardes du studio (frontend, version 1)

Le frontend réutilise `POST /projects` avec `settings.effects.studioVersion = 1`.
Ce n'est pas une nouvelle route : `effects` reste le champ libre existant.
Le snapshot contient `decks.A/B` (`track` et réglages bornés), `master`,
`crossfade` et `styles` (association ID de piste → style). Aucun JWT, flux micro
ou enregistrement binaire n'est conservé dans ce snapshot. `GET /projects`
permet de retrouver les snapshots accessibles au compte authentifié. Les styles
restent des préférences de projet : ils ne modifient pas les métadonnées serveur
de `Track`, dont le contrat reste identique. La restauration recharge les sons
via leur ID et ne démarre ni le micro, ni l'enregistrement, ni la lecture.

## MOST VIBE — contrat social (14 octobre 2026)

La demande MOST VIBE autorise explicitement l’évolution de l’API et du backend.
Les données et anciennes routes sont conservées. `J` désigne un JWT valide d’un
compte existant non suspendu ; `O` un JWT facultatif (anonyme autorisé pour les
contenus publics). Tout ID doit être un ObjectId valide. Les erreurs communes
sont `400` validation, `401` session absente/invalide, `403` droit refusé, `404`
ressource inconnue ou inaccessible, `409` doublon, `413` corps trop volumineux,
`429` limitation des requêtes et `500` erreur générique sans détails internes.

### Fichiers et publications

`Track` conserve les anciens champs et ajoute `style`, `tags`, `coverImageUrl`,
`duration`, `visibility`, `sharedWith`, `remixAllowed`, `kind`, `parentId`,
`sourceIds` et `credits`. La durée audio est extraite du fichier côté serveur ; `0` si inconnue. Les crédits `{userId,name}` et les sources de remix sont
calculés côté serveur et immuables. Le nom d’auteur est joint dans les fiches.
Les ACL `sharedWith` ne sont renvoyées qu’au propriétaire.

| Méthode et route | Auth | Paramètres / corps | Réponse et erreurs particulières |
|---|---|---|---|
| GET `/api/discover` | O | `q` ≤100 caractères, `style`, `kind=track/mix/remix`, `page`; recherche titre/auteur/style/album/tags | `200 {items,page,pages}`, 20 contenus publics récents/page ; aucun privé |
| POST `/api/tracks` | J | multipart `audio`, `title`, `style?`, `tags?` séparés par virgules, `coverImageUrl?`, `duration?`, `kind?`, `parentId?` ou `parentIds?` (tableau JSON, ≤10) | `201 Track`, privé par défaut ; `400` format/signature, `403` remix non autorisé |
| GET `/api/tracks/:id/audio` | O | ID ; prise en charge Range par Express | flux si propriétaire/public/destinataire encore autorisé ; `404` sinon ; `Cache-Control: private, no-store` |
| GET `/api/tracks/:id/detail` | O | ID | `200 Track` avec auteur/crédits si accès ; `404` sinon |
| PATCH `/api/tracks/:id` | J propriétaire | `title?`, `style?`, `tags?` (≤10), `coverImageUrl?` HTTPS, `remixAllowed?`, `visibility?=private/friends/public`, `sharedWith?` IDs d’amis acceptés | `200 Track` ; `403` destinataire non ami/bloqué ; `404` non-propriétaire |
| POST `/api/tracks/:id/reactions` | J | `{kind:like/favorite,enabled?:boolean}` | `200 {kind,enabled}` ; accès à la piste obligatoire |
| GET `/api/favorites` | J | — | `200 Track[]`, seulement les pistes encore autorisées |
| POST `/api/reports` | J | `{trackId,reason}` motif ≤1000 caractères | `201 {ok:true}` ; accès préalable obligatoire |

Formats acceptés : MP3, WAV, OGG/Opus, M4A, WebM audio, MP4/WebM vidéo,
PNG/JPEG/WebP. **25 Mo maximum**, validation de la signature binaire et de sa
cohérence avec le type MIME. Pas de HTML ni de SVG envoyés comme fichiers.
La route conserve le nom multipart `audio` pour compatibilité. Les fichiers
sont stockés sous un nom aléatoire contrôlé ; leur chemin n’est jamais exposé.
Une pochette/avatar HTTPS est une URL, sans téléchargement serveur.

`private` vide les destinataires lors d’une modification explicite ; un envoi
privé par message peut ajouter un ami à `sharedWith` sans rendre le fichier
public. Un destinataire doit toujours être un ami non bloqué au moment du nouvel
accès. Retirer le destinataire, retirer l’ami ou le bloquer coupe les nouveaux
accès. Le propriétaire garde l’accès. Les fichiers déjà téléchargés ne peuvent
pas être récupérés à distance. Une publication publique reste accessible aux
visiteurs anonymes : le blocage n’est pas un mécanisme de DRM sur le public.

### Relations, messagerie et notifications

| Méthode et route | Auth | Paramètres / corps | Réponse et erreurs particulières |
|---|---|---|---|
| GET `/api/profiles?q=` | J | recherche nom 2–100 caractères | `200 {id,name,bio,avatarUrl}[]`, aucun email ; profils découvrables non bloqués |
| GET `/api/friends` | J | — | `200 {id,status,incoming,user}[]` |
| POST `/api/friends` | J | `{userId}` | `201 {id,status}` ; `403` soi-même/blocage |
| PATCH `/api/friends/:id` | J destinataire | `{accept:boolean}` | `200 {ok:true}` ; `404` si invitation non reçue/en attente |
| DELETE `/api/friends/:id` | J participant | — | `204` ; accès privés de la relation retirés |
| GET `/api/blocks` | J | — | `200 {id,name}[]` |
| POST `/api/blocks` | J | `{userId}` | `200 {ok:true}`, suppression de la relation et des accès privés de fichiers |
| DELETE `/api/blocks/:id` | J | ID bloqué | `204` ; ne recrée aucune relation ni autorisation |
| GET `/api/activity` | J | — | `200 {tracks,albums}`, créations publiques/partagées autorisées d’amis seulement |
| GET `/api/messages/:userId` | J ami | ami non bloqué | `200 Message[]`, 100 derniers dans l’ordre ; marque les reçus lus ; `403` hors relation |
| POST `/api/messages/:userId` | J ami | `{text?,trackId?}` texte ≤2000 ; `trackId` doit appartenir à l’émetteur | `201 {id}` ; partage de piste accordé à cet ami seulement ; `400` vide, `404` piste non possédée |
| GET `/api/notifications` | J | — | `200 {items,unread,messages}` ; notices filtrées, uniquement pour le compte |
| POST `/api/notifications/read` | J | `{}` | `200 {ok:true}` |

`Message` : `{id,sender,text,createdAt,readAt,track,interrupted}`. Si la piste
n’est plus accessible, `track=null, interrupted=true`; afficher « Partage
interrompu ». Les droits sont revérifiés à chaque lecture, pas seulement à
l’envoi. Les messages et notifications sont persistés en MongoDB ; le frontend
les rafraîchit périodiquement, sans prétendre à une présence temps réel.

### Collections, compte et projets

| Méthode et route | Auth | Paramètres / corps | Réponse et erreurs particulières |
|---|---|---|---|
| GET `/api/collections` | J, ou O avec `public=true` | `public=true` pour albums publics | `200 {id,name,kind,visibility,author,tracks}[]` ; pistes filtrées par droit |
| POST `/api/collections` | J | `{name,kind:album/playlist,visibility?:private/public}` | `201 {id}` ; playlists personnelles toujours privées |
| PUT `/api/collections/:id` | J propriétaire | `{name?,visibility?,trackIds?}` ≤200 pistes accessibles | `200 {ok:true}` ; `404` autre propriétaire ; ne rend jamais les fichiers privés publics |
| DELETE `/api/collections/:id` | J propriétaire | — | `204`, ne supprime pas les fichiers |
| PATCH `/api/settings` | J | `{name?,bio?,avatarUrl?,discoverable?,notificationsEnabled?}` | `200 User` propre ; aucun champ `role`/`suspended` pris du client |
| DELETE `/api/account` | J | `{password}` | `204` après vérification ; fichiers, projets et conversations du compte supprimés ; anciens JWT refusés |
| DELETE `/api/projects/:id/share/:userId` | J propriétaire | ID projet et destinataire | `200 MixProject` après révocation |

Les routes de projets précédentes restent présentes. `POST /projects` choisit
les champs autorisés, ignore `sharedWith` venant du client et garde le brouillon
privé. Un `trackId` doit appartenir au créateur. Le partage par email ou `userId` exige une
relation d’amitié active. `GET /projects` revérifie cette relation ; un blocage
ou retrait coupe l’accès même pour un ancien partage. Les publications de mixes
sont les fichiers audio enregistrés dans `/tracks`, avec la visibilité choisie,
pas une publication automatique du snapshot privé ou de ses sources.

### Administration

| Méthode et route | Auth | Corps | Réponse et contraintes |
|---|---|---|---|
| GET `/api/admin` | J + rôle admin en base | — | `200 {users,reports,tracks}` ; fichiers publics uniquement, pas de conversation privée |
| PATCH `/api/admin/users/:id` | admin | `{suspended:boolean}` | `200 {ok:true}` ; auto-suspension interdite ; sessions du suspendu refusées |
| PATCH `/api/admin/reports/:id` | admin | `{}` | `200 {ok:true}` ; signalement résolu |
| PATCH `/api/admin/tracks/:id` | admin | `{moderated:boolean}` | `200 {ok:true}` ; `404` pour fichier privé ; masquer/rétablir sans supprimer les données |

Le rôle est lu en base, jamais accordé par inscription, préférences ou corps de
requête. Le premier administrateur se configure via l’outil opérateur
`backend/scripts/set-admin.js`, avec accès sécurisé au serveur. Il n’obtient
aucun contournement de `canRead` sur les fichiers privés ni des règles de la
messagerie. Voir `deployment/README.md` pour la configuration et les contrôles.

### Durcissement des erreurs JSON — 14 novembre 2026

Toutes les routes recevant du JSON conservent leur authentification et leur
contrat métier. Un corps JSON mal formé produit `400 {"message":"JSON invalide"}` ;
un corps dépassant 256 Ko produit `413 {"message":"Requête trop volumineuse"}`.
Le corps brut et les diagnostics du parseur ne sont ni renvoyés ni journalisés
par le gestionnaire central.

### Suspension et projets partagés — 14 novembre 2026

`GET /api/projects` (JWT requis, sans corps ni paramètre supplémentaire,
`200 MixProject[]`, `401` session invalide) exclut les projets partagés dont le
propriétaire est suspendu. Une relation autorisant un partage exige désormais
deux comptes existants non suspendus ; une réactivation rétablit l'accès si
l'amitié et le partage existent toujours.
