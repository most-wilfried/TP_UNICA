# Contrat HTTP - TP1

Base : `/api`. Sauf inscription et connexion, envoyer `Authorization: Bearer <token>`.

Le contrat HTTP ne dépend pas du choix de persistance : le backend fourni utilise Mongoose et MongoDB. MongoDB conserve les utilisateurs et métadonnées ; les octets des fichiers audio restent sur le disque du serveur.

| Méthode | Route | Requête | Réponse principale |
|---|---|---|---|
| GET | `/health` | - | `{ "status": "ok" }` |
| POST | `/auth/register` | `{name,email,password}` | `201 {token,user}` |
| POST | `/auth/login` | `{email,password}` | `200 {token,user}` |
| GET | `/users/me` | JWT | `200 User` |
| PUT | `/users/me` | `{name}` + JWT | `200 User` |
| GET | `/tracks?page=1&limit=5` | JWT | `Page<Track>` |
| POST | `/tracks` | multipart : `audio`, `title` | `201 Track` |
| GET | `/tracks/:id/audio` | JWT | flux audio |
| DELETE | `/tracks/:id` | JWT | `204` (bonus) |
| GET | `/projects` | JWT | `200 MixProject[]` |
| POST | `/projects` | `{name,trackId?,artist?,genre?,tags?,coverImageUrl?,settings?}` + JWT | `201 MixProject` |
| PUT | `/projects/:id` | champs modifiables + JWT propriétaire | `200 MixProject` et version précédente archivée |
| DELETE | `/projects/:id` | JWT propriétaire | `204` |
| POST | `/projects/:id/share` | `{email}` + JWT propriétaire | `200 MixProject` |

`Page<Track>` contient `items`, `page`, `limit`, `total` et `pages`. Formats acceptés : MP3, WAV, OGG et M4A, 25 Mo maximum.

Erreurs courantes : `400` validation, `401` authentification, `404` ressource, `409` email déjà utilisé.

`MixProject.settings` conserve le BPM, le volume, le panoramique, la vitesse,
la zone de lecture et les paramètres d'effets. Seul le propriétaire peut
modifier, supprimer ou partager un projet. Les utilisateurs présents dans
`sharedWith` disposent d'un accès en lecture via `GET /projects`.
