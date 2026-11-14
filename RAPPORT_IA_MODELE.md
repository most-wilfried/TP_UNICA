# Rapport d'usage de l'IA - TP1

## Suivi de livraison — 14 novembre 2026

Les entrées historiques ci-dessous sont conservées telles qu'elles existaient
avant cette session. Leurs dates ne sont pas réattribuées à d'autres journées.
Les modifications applicatives étaient déjà présentes dans le répertoire de
travail au début de cette session ; leur enregistrement Git est organisé en lots
techniques le 14 novembre 2026. Ces lots décrivent une livraison, pas des journées
de développement distinctes ni des fonctionnalités créées pendant cette session.

| Étape de livraison | Périmètre | Vérification |
| --- | --- | --- |
| 1 — API sociale | Modèles MongoDB, droits de partage/remix, messages, collections, modération et contrat HTTP | Tests backend sur base éphémère |
| 2 — Application Angular | Studio audio, bibliothèque de démonstration, lecteur persistant et interfaces sociales | Tests frontend et build Angular |
| 3 — Déploiement | Docker, Nginx et guide de configuration | Préparation uniquement, aucun déploiement effectué |
| 4 — Documentation | Bilans, captures existantes et présent suivi de livraison | Cohérence du découpage et contrôle Git |

Résultats vérifiés le 14 novembre 2026 : **17 tests backend sur 17**, **50 tests
frontend sur 50** (16 fichiers), et **build Angular réussi**. Deux avertissements
CommonJS subsistent pour Butterchurn et ses presets. Ces résultats actualisent
les chiffres des entrées historiques sans les réécrire.

Références des trois premiers lots : `fe2f168` (API), `3295836` (Angular),
`668690a` (préparation du déploiement). Le quatrième lot contient ce suivi et
les documents existants. Les commits sont datés de leur enregistrement réel.

Cette session porte sur la vérification et l'enregistrement des changements
existants. Aucun contrôle manuel dans le navigateur n'a été réalisé pendant
cette session. Les captures antérieures restent des preuves historiques.


> **État à jour au 14 octobre 2026 :** consulter la [transformation MOST VIBE](#transformation-most-vibe--14-octobre-2026). Les sections précédentes décrivent l’historique ; certaines fonctions alors annoncées comme absentes ont depuis été réalisées.

Pour chaque mission, détailler et fournir des explications concernant : objectif; prompt principal; plan proposé par l'agent; vérifications réalisées par le binôme; erreurs ou propositions rejetées; fichiers effectivement modifiés; preuve de fonctionnement; ce que chaque membre sait maintenant expliquer sans l'agent.

## Mission — Audit fonctionnel et remise en état (23 septembre 2026)

### Demande reformulée

Lire la documentation et le code du projet afin d'expliquer le rôle général de l'application, comparer les fonctionnalités présentes avec celles attendues par les trois sujets de TP, identifier ce qui fonctionne, ce qui est incomplet ou absent, puis corriger côté frontend les parcours essentiels qui ne fonctionnent pas complètement. Ne pas modifier le contrat HTTP ni le backend. Vérifier le résultat avec les tests et le build disponibles.

### Objectif et fonctionnement général identifié

**Guitar Practice Cloud** est le portail cloud d'une application d'entraînement musical. Un utilisateur peut créer un compte, se connecter, consulter et modifier son profil, puis gérer une bibliothèque personnelle de pistes audio : pagination, import, écoute et suppression. Angular appelle une API Express avec `HttpClient`; MongoDB conserve les utilisateurs et les métadonnées, tandis que les fichiers audio sont conservés sur le disque du serveur. Un JWT protège toutes les routes sauf l'inscription, la connexion et la santé de l'API.

### Plan suivi par l'agent

1. Lire les consignes, les trois sujets, le contrat HTTP, la documentation Atlas et tout le code frontend/backend utile.
2. Exécuter les tests backend, le build frontend et les tests frontend avant modification.
3. Comparer le comportement implémenté avec les missions TP1, TP2 et TP3.
4. Compléter les parcours frontend incomplets sans changer le backend.
5. Ajouter des tests HTTP frontend reproductibles.
6. Relancer les tests, le build et tenter une vérification avec l'application démarrée.

### État constaté avant modification

Fonctionnalités déjà présentes et structurellement correctes : routes Angular; guard d'authentification; inscription et connexion via `AuthService`; stockage du JWT; lecture et modification du profil; pagination serveur; construction du `FormData`; upload; récupération d'un `Blob`; création et remplacement d'une `ObjectURL`; endpoints backend d'authentification, profil, pistes, audio et suppression; validation Multer côté serveur.

Fonctionnalités incomplètes ou défectueuses : aucun bouton de déconnexion; formulaires envoyables sans validation utilisateur suffisante; profil chargé uniquement après un clic; erreurs de profil et de pistes visibles seulement dans la console; JWT expiré non nettoyé et absence de retour automatique vers la connexion; JWT ajouté aussi aux routes publiques; aucune validation frontend du fichier audio; absence d'état/progression d'upload; taille en octets affichée à tort comme des Ko; absence de libération de l'URL audio à la destruction du composant; suppression absente du frontend; tests frontend impossibles à lancer faute de DOM et de configuration TypeScript adaptée.

Éléments encore facultatifs ou non retenus dans cette mission : Angular Material/SnackBar, image de couverture, filtre par titre et pagination Material. Les messages de succès/erreur sont actuellement accessibles dans la page, sans dépendance graphique supplémentaire.

### Modifications réalisées

- Ajout d'une navigation adaptée à l'état connecté et d'une déconnexion complète.
- Validation des formulaires de connexion et d'inscription, blocage des doubles soumissions et messages explicites.
- Chargement automatique du profil, états de chargement/enregistrement et retours succès/erreur.
- Intercepteur limité aux routes protégées; sur un `401` protégé, suppression de la session locale et redirection vers `/login`.
- Validation frontend des formats MP3/WAV/OGG/M4A et de la limite de 25 Mo.
- Progression d'upload, blocage des doubles envois, messages de résultat et rechargement de la première page.
- Erreurs visibles pour la liste et la lecture, nom de la piste en cours et révocation finale de l'`ObjectURL`.
- Affichage correct des tailles, ajout de la date et bornage défensif de la pagination.
- Ajout de la suppression avec confirmation, état anti-double-clic, gestion du `404` et rechargement de la liste.
- Ajout de quatre tests frontend : login, paramètres de pagination, suppression HTTP et multipart/progression.
- Réparation de la configuration de tests (`jsdom`, `tsconfig.spec.json`, exclusion des specs du build et configuration `development`).

### Fichiers effectivement modifiés

- `frontend-starter/src/app/components/app/app.ts`, `app.html`, `app.css`
- `frontend-starter/src/app/components/login-page/login-page.ts`, `login-page.html`
- `frontend-starter/src/app/components/register-page/register-page.ts`, `register-page.html`
- `frontend-starter/src/app/components/profile-page/profile-page.ts`, `profile-page.html`
- `frontend-starter/src/app/components/tracks-page/tracks-page.ts`, `tracks-page.html`
- `frontend-starter/src/app/shared/services/auth.service.ts`, `track.service.ts`
- `frontend-starter/src/app/shared/interceptors/auth.interceptor.ts`
- `frontend-starter/src/app/shared/services/auth.service.spec.ts`, `track.service.spec.ts`
- `frontend-starter/src/styles.css`
- `frontend-starter/angular.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `tsconfig.json`
- `frontend-starter/package.json`, `package-lock.json`
- `RAPPORT_IA_MODELE.md`

### Vérifications et preuves

- Avant modification, `npm test` dans `backend/` : **2 tests réussis sur 2**.
- Avant modification, `npm run build` dans `frontend-starter/` : **build réussi**.
- Avant correction de la configuration, `npm test` frontend échouait car aucun environnement DOM n'était installé; après ajout de `jsdom` et de la configuration dédiée : **2 fichiers de test réussis, 4 tests réussis sur 4**.
- Après modification, `npm run build` frontend : **réussi**, bundle initial d'environ 301,46 kB brut.
- Serveur Angular démarré et page racine vérifiée par HTTP : **statut 200**.
- La vérification métier complète avec la vraie base Atlas n'a pas pu être réalisée dans cet environnement : le backend a reçu `MongooseServerSelectionError`/`ECONNRESET` avant la sélection d'un serveur Atlas. Il faut vérifier l'autorisation IP Atlas et la connectivité réseau, puis refaire connexion, upload, lecture et suppression dans l'onglet Network.
- Aucun navigateur pilotable n'était disponible dans l'environnement de l'agent; aucune capture Network n'a donc été fabriquée artificiellement.

### Erreurs rencontrées et décisions

L'ajout initial des specs les faisait entrer dans le build applicatif, car `tsconfig.app.json` incluait tous les fichiers TypeScript. Les specs ont été exclues du build et incluses dans un `tsconfig.spec.json`. Le runner référençait aussi une configuration `build:development` absente; une configuration explicite a été ajoutée. Le backend n'a pas été modifié, conformément aux consignes du frontend et au contrat HTTP.

### Ce que le binôme doit pouvoir expliquer

Le trajet composant → service → `HttpClient` → API; la différence entre Signal et `localStorage`; le rôle du guard et celui, distinct, de la sécurité backend; l'ajout du JWT par l'intercepteur; la gestion d'un `401`; la validation frontend qui complète sans remplacer Multer; la différence entre événements de progression et réponse finale; le passage Blob → ObjectURL → lecteur audio; la nécessité de révoquer l'URL; la pagination serveur; la suppression via le service; et l'intérêt de tests HTTP simulés indépendants de MongoDB.

## Mission 1 - Finalisation des livrables TP1 (24 septembre 2026)

### Objectif et demande reformulée

Vérifier que tous les livrables de la Mission 1 sont présents et fournir des
preuves exploitables pour le contrôle continu : code frontend complété, schéma
annoté de la connexion, preuve d'échanges HTTP, explication de Signal et
`localStorage`, résultats des tests et mise à jour du présent rapport.

### Plan suivi

1. Relancer les tests frontend et backend ainsi que le build Angular.
2. Démarrer le backend avec MongoDB Atlas et le frontend Angular.
3. Exécuter les trois scénarios du checkpoint sans enregistrer de secret.
4. Créer une preuve anonymisée et une synthèse autonome des livrables.
5. Relier les preuves depuis le rapport.

### Résultats et preuves

- Le backend s'est connecté à MongoDB Atlas et a confirmé que le compte de
  démonstration existait.
- Connexion réussie : `POST /api/auth/login`, statut `200`, sans header
  `Authorization`.
- Connexion refusée : `POST /api/auth/login`, statut `401`, sans header
  `Authorization`.
- Lecture du profil : `GET /api/users/me`, statut `200`, avec un header Bearer
  dont la valeur a été masquée.
- Tests frontend : **4/4 réussis**.
- Tests backend : **2/2 réussis**.
- Build Angular : **réussi**.

Preuves liées :

- [Synthèse des livrables TP1](LIVRABLES_TP1.md)
- [Preuve HTTP réelle et anonymisée](preuves/tp1-reseau-authentification.png)
- [Guide détaillé TP1 au format PDF](output/pdf/guide_verification_tp1_authentification_profil.pdf)

La preuve PNG correspond à de véritables requêtes exécutées contre l'API et
MongoDB Atlas. Ce n'est pas une capture de l'onglet DevTools, car aucun
navigateur pilotable n'était disponible dans l'environnement de l'assistant.
Cette limite est explicitement indiquée afin de ne pas présenter une preuve
artificielle comme une capture Network.

### Fichiers créés ou modifiés

- `LIVRABLES_TP1.md` : schéma, explications et bilan de conformité ;
- `preuves/tp1-reseau-authentification.png` : preuve HTTP anonymisée ;
- `RAPPORT_IA_MODELE.md` : présente entrée de mission.

Le code applicatif n'a pas été modifié pendant cette finalisation : il était
déjà conforme aux exigences du TP1 après la mission précédente.

### Ce que le binôme doit savoir expliquer

Le binôme doit pouvoir expliquer le flux complet de connexion, le rôle de
`AuthService`, la différence entre guard, intercepteur et middleware backend,
le stockage et la validation du JWT, la réaction à un `401`, la mise à jour du
profil, ainsi que la différence entre un Signal réactif et `localStorage`.

## Amélioration visuelle, thèmes et responsive (24 septembre 2026)

### Demande reformulée

Moderniser l'interface du frontend sans modifier ses fonctionnalités métier :
rendre le style plus attractif, améliorer l'apparence et les états des boutons,
ajouter un mode clair et un mode sombre, puis assurer une utilisation confortable
sur ordinateur, tablette et téléphone.

### Modifications réalisées

- Mise en place d'une identité visuelle cohérente avec variables CSS : surfaces,
  couleurs, bordures, ombres et contrastes adaptés aux deux thèmes.
- Ajout d'un sélecteur clair/sombre accessible dans l'en-tête.
- Initialisation avec la préférence système et mémorisation du choix dans
  `localStorage` sous la clé `gpc_theme`.
- Refonte de l'en-tête : marque musicale, navigation active, actions regroupées
  et navigation adaptée aux petits écrans.
- Amélioration des boutons : variantes principale, secondaire, danger et icône,
  avec états hover, focus, actif et désactivé.
- Amélioration des cartes, champs, messages, listes de pistes, pagination,
  lecteur audio et barre de progression.
- Ajout de textes d'introduction sur les pages de connexion, inscription et
  profil.
- Mise en page responsive avec points de rupture à 760 px, 520 px et 460 px.
- Respect de `prefers-reduced-motion` pour les personnes qui limitent les
  animations.
- Ajout d'un pied de page sobre et responsive.

### Fichiers modifiés

- `frontend-starter/src/styles.css`
- `frontend-starter/src/app/components/app/app.ts`
- `frontend-starter/src/app/components/app/app.html`
- `frontend-starter/src/app/components/app/app.css`
- `frontend-starter/src/app/components/login-page/login-page.html`
- `frontend-starter/src/app/components/login-page/login-page.css`
- `frontend-starter/src/app/components/register-page/register-page.html`
- `frontend-starter/src/app/components/register-page/register-page.css`
- `frontend-starter/src/app/components/profile-page/profile-page.html`
- `frontend-starter/src/app/components/profile-page/profile-page.css`
- `frontend-starter/src/app/components/tracks-page/tracks-page.html`

### Vérifications et preuves

- `npm test` dans `frontend-starter/` : **4 tests réussis sur 4**.
- `npm run build` dans `frontend-starter/` : **réussi**.
- Bundle initial : environ **318,56 kB brut**, dont **5,41 kB** de styles.
- La compilation stricte des templates Angular ne signale aucune erreur.
- Aucun navigateur pilotable n'étant disponible dans l'environnement de
  l'assistant, la vérification visuelle finale sur plusieurs largeurs doit être
  reproduite par le binôme dans les outils responsifs du navigateur.

### Ce que le binôme doit savoir expliquer

Le binôme doit pouvoir expliquer le rôle des variables CSS dans les deux thèmes,
la propriété `data-theme` portée par l'élément HTML, la persistance du choix dans
`localStorage`, l'utilisation de `matchMedia` pour la préférence système, le rôle
des media queries et l'importance des états de focus visibles pour l'accessibilité.

## Audit de conformité du TP2 (2 octobre 2026)

### Demande reformulée

Contrôler point par point si tous les éléments demandés dans le sujet du TP2
étaient présents dans le projet. Cette intervention consistait uniquement à
examiner le code, les documents et les preuves disponibles, puis à lancer les
tests et le build. Aucune modification fonctionnelle du frontend ou du backend
n'était demandée.

### Étapes suivies lors du contrôle

1. Lecture complète de `SUJET_ETUDIANT_TP2.md` afin d'identifier les exigences
   obligatoires, les livrables et les améliorations facultatives.
2. Inventaire des fichiers du frontend, du backend, du rapport et des dossiers
   contenant les preuves.
3. Vérification de la bibliothèque paginée : Signals, paramètres `page` et
   `limit`, requête HTTP à chaque changement de page, états de chargement et
   d'erreur, `@for`, `@empty` et boutons Précédent/Suivant.
4. Vérification de l'upload : choix du fichier, validation du type et de la
   limite de 25 Mo, construction du `FormData`, champs `audio` et `title`, état
   d'envoi, progression, blocage des doubles soumissions et gestion des messages.
5. Vérification de la lecture authentifiée : récupération du `Blob`, création
   de l'`ObjectURL`, affectation au lecteur `<audio>`, révocation de l'ancienne
   URL et nettoyage final lors de la destruction du composant.
6. Vérification de l'intercepteur qui ajoute le JWT aux requêtes protégées et
   du contrôle de propriété effectué par le backend avant l'envoi d'un fichier.
7. Vérification des contrôles Multer côté backend : présence du fichier
   `audio`, lecture du titre, formats MIME autorisés et taille maximale.
8. Recherche des explications écrites demandées sur le Blob, l'ObjectURL, la
   mémoire, le buffering et le streaming.
9. Recherche des captures Network et des preuves de pagination, d'upload et de
   lecture audio authentifiée.
10. Exécution des tests frontend, des tests backend et du build Angular.

### Éléments validés

- La pagination est réalisée côté serveur et le frontend transmet réellement
  `page` et `limit` à l'API.
- La page utilise des Signals pour la liste, la page courante, le nombre de
  pages, le chargement et les erreurs.
- Une nouvelle requête est effectuée à chaque changement de page.
- Le template utilise `@if`, `@for` et `@empty`, avec des boutons de pagination
  désactivés aux bornes.
- Le frontend contrôle le format du fichier et la limite de 25 Mo avant
  l'envoi. Cette validation améliore l'expérience utilisateur, mais ne remplace
  pas la validation du backend, car une requête peut contourner l'interface.
- Le `FormData` contient exactement les champs `audio` et `title`.
- L'upload possède un état de chargement, une progression, une protection
  contre les doubles soumissions, un message d'erreur et un message de succès.
- Après un upload réussi, le titre est vidé et la première page est rechargée.
- La lecture utilise `HttpClient` avec `responseType: 'blob'`, puis
  `URL.createObjectURL`. L'ancienne URL et l'URL finale sont révoquées.
- Le titre du morceau en cours et une erreur de lecture compréhensible sont
  affichés.
- L'intercepteur ajoute le JWT dans le header `Authorization` des requêtes
  protégées.
- Le backend filtre les pistes avec l'identifiant du propriétaire avant la
  liste, la lecture et la suppression.
- Plusieurs améliorations facultatives sont déjà présentes : progression de
  l'upload, suppression avec confirmation, rafraîchissement de la liste et
  formatage de la taille et de la date.

### Éléments restant à compléter

- Réinitialiser visuellement le champ `<input type="file">` après un upload
  réussi. La variable TypeScript est vidée, mais le nom du fichier peut rester
  affiché par le navigateur.
- Afficher le format MIME de chaque piste dans la bibliothèque.
- Si une interprétation stricte du sujet est attendue, présenter chaque piste
  comme une card individuelle plutôt que comme une simple ligne dans la card
  principale.
- Ajouter une explication complète du flux composant → service → `HttpClient`
  → API, puis API → Blob → ObjectURL → lecteur audio.
- Expliquer qu'une URL placée directement dans l'attribut `src` du lecteur est
  demandée par le navigateur lui-même et ne traverse pas `HttpClient` ;
  l'intercepteur Angular ne peut donc pas lui ajouter le JWT.
- Répondre précisément aux questions du sujet sur la mémoire, le buffering et
  le streaming audio.
- Ajouter une capture Network de la pagination ou de l'upload et une preuve de
  lecture audio authentifiée. Les preuves présentes dans le dépôt concernent
  actuellement le TP1.
- Refaire le scénario métier complet dans un navigateur relié à MongoDB :
  connexion, pagination, upload, lecture, fichier invalide et contrôle de
  propriété.

### Résultats des vérifications automatiques

- Tests frontend : **2 fichiers de tests réussis, 4 tests réussis sur 4**.
- Tests backend : **2 tests réussis sur 2**.
- Build Angular : **réussi**, sans erreur de compilation.

### Fichiers modifiés pendant cet audit

Le code applicatif n'a pas été modifié pendant le contrôle. Seul le présent
rapport a ensuite été complété pour conserver une trace des vérifications et
des conclusions de l'audit.

### Conclusion de l'audit

Le fonctionnement principal obligatoire du TP2 était presque entièrement
implémenté. Le projet était estimé conforme à environ 90 à 95 %. Les principaux
éléments manquants concernaient les réponses écrites détaillées et les captures
Network, ainsi que quelques finitions mineures de l'interface.

## Mission 5 — Suppression d'une piste (2 octobre 2026)

### Demande reformulée

Vérifier l'état de la fonctionnalité de suppression demandée dans le TP3,
compléter les éléments absents sans modifier le backend, valider le résultat
avec les tests et le build, puis documenter le travail dans le rapport IA.

### Composant et service concernés

- `TracksPageComponent`, dans
  `frontend-starter/src/app/components/tracks-page/tracks-page.ts`, gère
  l'action de l'utilisateur, la confirmation, l'état de suppression, les
  messages et le rafraîchissement de la page.
- `TrackService`, dans
  `frontend-starter/src/app/shared/services/track.service.ts`, encapsule l'appel
  HTTP `DELETE /api/tracks/:id`.

Le composant n'utilise donc pas directement `HttpClient`. Le flux est :

```text
bouton Supprimer → TracksPageComponent.remove(track)
                  → TrackService.delete(track.id)
                  → HttpClient.delete()
                  → DELETE /api/tracks/:id
```

### État constaté avant la modification

La majorité de la mission était déjà implémentée :

- bouton « Supprimer » pour chaque piste ;
- confirmation avec `confirm()` avant l'appel HTTP ;
- Signal `deletingId` empêchant une seconde suppression ;
- texte « Suppression… » pendant la requête ;
- appel effectué par `TrackService`, et non directement par le composant ;
- rechargement de la liste après le succès ;
- retour à la page précédente lorsque la dernière piste d'une page est
  supprimée ;
- traitement explicite du statut `404` avec un message indiquant que la piste
  n'existe plus ou n'appartient pas à l'utilisateur ;
- test du service vérifiant l'URL et la méthode HTTP `DELETE`.

Le message était affiché dans la page avec des Signals, mais le composant
Angular Material SnackBar demandé explicitement dans le sujet n'était pas
encore utilisé.

### Modifications réalisées

- Ajout des dépendances Angular Material et Angular CDK compatibles avec la
  version Angular du projet.
- Ajout du thème préconstruit Angular Material `azure-blue` dans la
  configuration globale des styles.
- Import de `MatSnackBarModule` dans le composant standalone.
- Injection de `MatSnackBar` avec `inject()`.
- Affichage d'un SnackBar pendant quatre secondes après une suppression
  réussie.
- Affichage d'un SnackBar pendant six secondes en cas d'erreur, avec un message
  spécifique pour le statut `404`.
- Conservation des messages accessibles déjà affichés dans la page.
- Désactivation de tous les boutons de suppression pendant la requête. Le
  bouton de la piste concernée affiche « Suppression… », ce qui empêche les
  doubles clics et le lancement simultané d'une seconde suppression.

### Gestion de la piste absente ou appartenant à un autre utilisateur

Le frontend traite une réponse `404` avec le message : « Cette piste n'existe
plus ou ne vous appartient pas. » Ce cas couvre notamment une piste supprimée
dans un autre onglet entre l'affichage de la liste et le clic de l'utilisateur.

Le backend recherche la piste en associant son identifiant à `ownerId`, extrait
du JWT. Si aucune piste correspondant aux deux valeurs n'est trouvée, il répond
avec le statut `404`. Employer la même réponse pour une piste absente et une
piste appartenant à quelqu'un d'autre évite également de révéler l'existence
des ressources des autres utilisateurs.

### Pourquoi le guard et l'interface ne sécurisent pas la suppression

Le guard Angular améliore la navigation dans l'application, mais il s'exécute
uniquement dans le navigateur de l'utilisateur. Le bouton peut être manipulé
dans les outils de développement et l'API peut être appelée directement avec
un client HTTP, sans passer par l'interface ou le guard.

La sécurité réelle est donc assurée côté backend. Le middleware `auth` vérifie
la signature et l'expiration du JWT, puis la route de suppression recherche la
piste avec son identifiant **et** l'identifiant du propriétaire contenu dans le
JWT. Un utilisateur authentifié ne peut donc pas supprimer une piste appartenant
à un autre utilisateur simplement en connaissant son identifiant.

### Vérifications réalisées

- Tests frontend : **2 fichiers réussis, 4 tests réussis sur 4**.
- Le test de `TrackService.delete()` confirme l'utilisation de
  `DELETE /api/tracks/track-42`.
- Tests backend : **2 tests réussis sur 2**.
- Build Angular : **réussi**, sans erreur TypeScript ni erreur de template.
- L'installation des dépendances a signalé six vulnérabilités dans l'arbre npm
  (deux modérées, deux élevées et deux critiques). Aucun `npm audit fix` n'a été
  lancé automatiquement afin de ne pas appliquer des mises à jour potentiellement
  incompatibles sans analyse préalable.

La capture
`capture_de_test/Capture d’écran du 2026-10-02 13-48-14.png` montre une
suppression réelle dans l'onglet Network : la requête `DELETE` reçoit le statut
`204 No Content`, puis elle est suivie d'un `GET /api/tracks?page=1&limit=5`
qui actualise la bibliothèque.

### Fichiers modifiés

- `frontend-starter/src/app/components/tracks-page/tracks-page.ts` ;
- `frontend-starter/src/app/components/tracks-page/tracks-page.html` ;
- `frontend-starter/package.json` ;
- `frontend-starter/package-lock.json` ;
- `frontend-starter/angular.json` ;
- `RAPPORT_IA_MODELE.md`.

## Fondation MongoDB des projets de mixage (2 octobre 2026)

Le choix retenu est une persistance par le backend Express dans MongoDB, et non
un stockage limité au `localStorage` du navigateur. Un modèle `MixProject` a
été ajouté avec le propriétaire, les utilisateurs invités, le nom, la piste,
l'artiste, le genre, les tags, une URL de couverture, les réglages du lecteur
et un historique de versions.

Les routes JWT suivantes ont été ajoutées et documentées dans
`API_CONTRACT.md` : liste, création, modification avec archivage de la version
précédente, suppression et partage par adresse email. La lecture accepte les
projets possédés ou partagés ; les mutations restent réservées au propriétaire.

Cette étape constitue la fondation backend. L'interface Angular de gestion des
projets, la sauvegarde automatique, l'annulation/rétablissement et le rendu
audio WAV/MP3 restent à raccorder. L'export audio traité ne doit pas être
confondu avec l'export des réglages : il demandera un rendu Web Audio hors ligne
et un encodage adapté.

Vérifications après ajout : **8/8 tests backend**, **9/9 tests frontend** et
**build Angular réussi**.

## Séparation de l'interface par domaines (2 octobre 2026)

L'interface monolithique a été répartie en quatre routes protégées :

- `/tracks` : bibliothèque, recherche, upload, pagination et suppression ;
- `/player/:id` : lecteur, transport et visualiseur ;
- `/studio/:id` : fonctions musicales avancées ;
- `/projects` : création, liste et suppression des projets MongoDB.

Les boutons Lecture et Studio de chaque piste enregistrent temporairement la
piste sélectionnée dans `sessionStorage`, puis ouvrent la route correspondante.
La nouvelle page Projets utilise un `ProjectService` dédié ; le composant ne
fait aucun appel direct à `HttpClient`.

Les fichiers frontend ajoutés sont les composants `library-page`, `player-page`,
`studio-page` et `projects-page`, ainsi que `project.service.ts` et le modèle
`mix-project.model.ts`. Côté backend, les données disposent du modèle dédié
`MixProject.js` et des routes JWT documentées dans `API_CONTRACT.md`.

La logique Web Audio complexe reste centralisée dans le composant de travail
partagé utilisé par les pages Lecteur et Studio. Ce choix évite de dupliquer un
`AudioContext`, les nœuds audio et la gestion de l'ObjectURL, tout en donnant à
chaque domaine sa route et son point d'entrée propres.

Après séparation : **9/9 tests frontend réussis** et **build Angular réussi**.

Le menu principal affiche désormais explicitement les quatre domaines :
« Pistes », « Lecteur audio », « Mixage » et « Projets ». Les routes `/player`
et `/studio` sont utilisables même avant la sélection d'une piste et affichent
alors une consigne claire invitant l'utilisateur à revenir dans la bibliothèque.

## Mission 6 — Progression de l'upload (2 octobre 2026)

### Demande reformulée

Vérifier que l'upload permet de distinguer l'absence d'envoi, la progression,
la réussite et l'échec, que les contrôles sont désactivés pendant l'opération et
qu'aucune donnée sensible n'est affichée. Compléter les éléments manquants,
exécuter les vérifications automatiques et documenter le fonctionnement.

### Composant et service concernés

- `TracksPageComponent` choisit et valide le fichier, déclenche l'upload,
  interprète les événements HTTP et met à jour les Signals affichés dans le
  template.
- `TrackService.upload()` construit le `FormData` avec `audio` et `title`, puis
  utilise `HttpClient.post()` avec `observe: 'events'` et
  `reportProgress: true`.

Le flux est le suivant :

```text
formulaire → TracksPageComponent.upload()
           → TrackService.upload(file, title)
           → HttpClient.post(observe: 'events', reportProgress: true)
           → POST /api/tracks
```

### État constaté avant la modification

La progression de l'upload était déjà fonctionnelle :

- le Signal `uploading` indiquait si un upload était en cours ;
- le Signal `uploadProgress` conservait le pourcentage courant ;
- le service demandait tous les événements HTTP et activait le suivi de
  progression ;
- le composant traitait les événements `HttpEventType.UploadProgress` ;
- le pourcentage était calculé avec
  `Math.round(100 * event.loaded / event.total)` lorsque la taille totale était
  disponible ;
- le template affichait le pourcentage et une balise `<progress>` uniquement
  pendant l'envoi ;
- le champ titre, le champ fichier et le bouton d'envoi étaient désactivés
  pendant l'opération ;
- `upload()` refusait immédiatement une deuxième soumission lorsque
  `uploading()` était déjà vrai ;
- le succès et l'échec produisaient des messages accessibles ;
- après un succès, la première page de la bibliothèque était rechargée.

### Les quatre états de l'upload

1. **Aucun upload en cours** : `uploading` vaut `false`. La progression n'est
   pas affichée et le bouton reste désactivé tant qu'aucun fichier valide n'est
   sélectionné.
2. **Upload en cours** : `uploading` vaut `true`. Les contrôles sont désactivés,
   le bouton affiche « Envoi… » et le pourcentage courant est visible.
3. **Réussite** : la réception de `HttpEventType.Response` place la progression
   à 100 %, termine l'état d'envoi, affiche « Piste importée avec succès », vide
   le formulaire et recharge la première page.
4. **Échec** : le callback `error` termine l'état d'envoi, remet la progression
   à zéro et affiche le message envoyé par le serveur ou un message générique.
   Le fichier reste sélectionné afin que l'utilisateur puisse corriger le
   problème ou réessayer.

### Modification complémentaire réalisée

Après une réussite, la variable `file` était vidée mais le nom du fichier
pouvait rester visible dans le champ natif du navigateur. Une référence Angular
obtenue avec `viewChild()` a été ajoutée afin de remettre également la valeur de
`<input type="file">` à vide. Le bouton d'envoi expose maintenant aussi
`aria-busy` pendant l'opération pour mieux communiquer l'état aux technologies
d'assistance.

### Pourquoi la progression diffère d'une réponse HTTP finale

Une requête HTTP classique observée uniquement dans son mode par défaut émet
généralement la réponse finale lorsque le traitement est terminé. Cela ne
permet pas au composant de connaître l'avancement du transfert pendant l'envoi.

Avec `observe: 'events'`, l'Observable émet plusieurs valeurs de types
différents au cours d'une seule requête. Les événements
`HttpEventType.UploadProgress` contiennent `loaded` et, lorsque le navigateur la
connaît, `total`. Ils servent à actualiser le pourcentage. L'événement
`HttpEventType.Response` indique ensuite que la réponse finale du serveur a été
reçue. Le composant doit donc examiner `event.type` et ne pas traiter un
événement de progression comme une réponse métier définitive.

### Protection des données sensibles

Le contrôle du code n'a trouvé aucun affichage ni journalisation du mot de passe
ou du JWT. Les logs liés à l'upload contiennent uniquement le nom du fichier,
l'identifiant public de la piste ou l'objet d'erreur. L'intercepteur ajoute le
JWT au header `Authorization` sans écrire sa valeur dans la console ou dans
l'interface.

### Vérifications réalisées

- Le test de `TrackService.upload()` vérifie la méthode `POST`, l'URL
  `/api/tracks`, les champs `audio` et `title` du `FormData`, ainsi que
  l'activation de `reportProgress`.
- Tests frontend : **2 fichiers réussis, 4 tests réussis sur 4**.
- Tests backend : **2 tests réussis sur 2**.
- Build Angular : **réussi**, sans erreur TypeScript ni erreur de template.

La capture Network de l'upload et l'observation visuelle de plusieurs événements
de progression restent à produire manuellement pour compléter les preuves du
TP3.

### Fichiers modifiés pour cette mission

- `frontend-starter/src/app/components/tracks-page/tracks-page.ts` ;
- `frontend-starter/src/app/components/tracks-page/tracks-page.html` ;
- `RAPPORT_IA_MODELE.md`.

## Mission 7 — Tests automatisés (2 octobre 2026)

### Demande reformulée

Ajouter tous les tests frontend proposés dans le sujet ainsi que les six tests
backend facultatifs de contrat et de sécurité, sans remplacer les tests déjà
présents. Les tests doivent être reproductibles, contenir des assertions utiles
et ne dépendre ni d'un backend réel pour le frontend, ni d'une base MongoDB pour
les scénarios backend simulés.

### Tests frontend ajoutés ou conservés

Les sept catégories proposées dans le sujet sont maintenant couvertes :

1. `AuthService.login()` vérifie `POST /api/auth/login`, le corps transmis et la
   mémorisation de la session simulée.
2. `TrackService.list()` vérifie les paramètres `page` et `limit`.
3. L'intercepteur vérifie la présence du header
   `Authorization: Bearer jwt-test` lorsqu'un token existe.
4. Le guard vérifie qu'un utilisateur sans token reçoit un `UrlTree` pointant
   vers `/login`.
5. Le composant de bibliothèque simule un échec HTTP et vérifie le Signal
   d'erreur ainsi que le message réellement affiché avec `role="alert"`.
6. La suppression vérifie l'identifiant transmis au service, la méthode et
   l'URL `DELETE` dans le test du service, puis le rechargement de la liste dans
   le test du composant.
7. L'upload simule un événement `UploadProgress`, vérifie le passage à 50 %,
   puis simule une erreur et vérifie la fin de l'état d'envoi, la remise à zéro
   de la progression et le message présenté à l'utilisateur.

Les requêtes frontend sont interceptées avec `HttpTestingController` ou les
services sont remplacés par des doubles de test. Aucun serveur Express et aucune
base MongoDB ne sont nécessaires pour exécuter ces tests.

### Tests backend ajoutés

Les six extensions proposées sont également couvertes :

1. accès à `GET /api/tracks` sans JWT : réponse `401` ;
2. accès avec un JWT malformé : réponse `401` ;
3. upload authentifié sans fichier : réponse `400` ;
4. upload d'un fichier `text/plain` : réponse `400` et refus du type MIME ;
5. pagination `page=3&limit=7` : vérification de `skip(14)`, `limit(7)` et de la
   réponse paginée ;
6. accès à une piste ne correspondant pas au propriétaire authentifié : réponse
   `404` sans divulgation de l'existence de la ressource.

Les méthodes Mongoose nécessaires aux deux derniers scénarios sont remplacées
temporairement par des implémentations contrôlées, puis restaurées dans un bloc
`finally`. Les tests vérifient ainsi la construction des filtres et les réponses
HTTP sans connexion à MongoDB et sans modifier les routes de production.

### Résultats attendus et observés

| Suite | Résultat attendu | Résultat observé |
|---|---:|---:|
| Frontend — fichiers de tests | 5 réussis | **5 réussis** |
| Frontend — tests | 9 réussis | **9 réussis** |
| Backend — tests | 8 réussis | **8 réussis** |
| Build Angular | aucune erreur | **réussi** |

Le build produit un bundle initial d'environ **463,07 kB brut** et
**113,00 kB estimés après transfert**. Les tests backend affichent volontairement
les logs correspondant aux erreurs simulées (`401`, type MIME refusé et `404`) ;
ces traces sont attendues et ne représentent pas des échecs de la suite.

### Réponses pour la restitution orale

1. **Pourquoi la suppression passe-t-elle par un service ?** Le service
   centralise le contrat HTTP, garde le composant concentré sur l'interface et
   permet de tester l'appel indépendamment du composant.
2. **Comment le backend protège-t-il la suppression ?** Le middleware vérifie
   le JWT, puis la requête Mongoose associe l'identifiant de la piste à
   `ownerId` provenant du token. Connaître l'identifiant d'une autre piste ne
   suffit donc pas pour la supprimer.
3. **Comment Angular calcule-t-il la progression ?** `HttpClient` émet des
   événements `UploadProgress`. Le composant calcule
   `Math.round(100 * loaded / total)` lorsque `total` est disponible.
4. **Pourquoi les tests HTTP frontend n'ont-ils pas besoin de MongoDB ?**
   `HttpTestingController` intercepte la requête avant le réseau et fournit une
   réponse simulée. Le test porte sur le contrat construit par le frontend.
5. **Que vérifie un test d'intercepteur ou de guard ?** Le test d'intercepteur
   contrôle la transformation de la requête, notamment le header JWT. Le test
   du guard contrôle la décision de navigation selon l'état d'authentification.
6. **Quelle différence entre test unitaire et test d'intégration ?** Un test
   unitaire isole une classe ou une fonction avec des dépendances simulées. Un
   test d'intégration vérifie plusieurs éléments réellement assemblés, comme
   Express, ses middlewares, Multer et une requête HTTP locale dans les tests
   backend.

### État des livrables TP3

- suppression fonctionnelle : réalisée ;
- progression d'upload : réalisée ;
- au moins trois tests frontend : dépassé avec **9 tests** ;
- rapport attendu/observé : présent dans cette section ;
- capture Network de suppression : présente dans `capture_de_test/` ;
- capture Network de l'upload : reste à réaliser manuellement ;
- build Angular : exécuté avec succès ;
- rapport IA : complété.

### Fichiers créés ou modifiés pour les tests

- `frontend-starter/src/app/shared/interceptors/auth.interceptor.spec.ts` ;
- `frontend-starter/src/app/shared/guards/auth.guard.spec.ts` ;
- `frontend-starter/src/app/components/tracks-page/tracks-page.spec.ts` ;
- `backend/test/api.test.js` ;
- `RAPPORT_IA_MODELE.md`.

## Évolution du lecteur vers une application de mixage (2 octobre 2026)

### Objectif

Faire évoluer le lecteur audio authentifié du TP2 vers un outil de travail
musical, tout en conservant le téléchargement sécurisé par JWT, Blob et
ObjectURL. Les fonctionnalités ont été organisées en plusieurs priorités afin
de distinguer ce qui est déjà utilisable de ce qui constitue encore une feuille
de route.

### Priorité 1 — Lecteur de travail musical : réalisée

Les fonctions fondamentales du lecteur ont été ajoutées :

- commandes Lecture, Pause et Stop ;
- indication dynamique de l'état Lecture/Pause ;
- affichage du temps courant et de la durée totale ;
- barre de navigation permettant de se déplacer précisément dans le morceau ;
- réglage du volume ;
- activation et désactivation du son ;
- choix de la vitesse de lecture entre `0,5×` et `2×` ;
- activation d'une lecture en boucle ;
- sélection d'une zone de travail avec un début et une fin ;
- lecture en boucle limitée à la zone sélectionnée ;
- repositionnement au début de la zone avec le bouton Stop ;
- déplacement de la lecture par un clic sur la visualisation audio ;
- interface responsive utilisable sur ordinateur, tablette et téléphone.

Le lecteur continue de récupérer le morceau avec `TrackService.audio()` et
`HttpClient`. Le backend vérifie le JWT et le propriétaire, puis Angular reçoit
un Blob et crée une ObjectURL affectée à l'élément `<audio>`.

### Extension visuelle temps réel : réalisée

La première forme d'onde statique a été remplacée par un visualiseur piloté par
la Web Audio API. Un `AnalyserNode` reçoit le signal de l'élément audio et
produit en continu les données fréquentielles et temporelles utilisées pour
dessiner dans un `<canvas>`.

Quatre modèles sont disponibles :

1. **Barres énergie** : la hauteur et la couleur des barres varient selon
   l'intensité des fréquences.
2. **Miroir symétrique** : les barres sont dessinées de part et d'autre du
   centre pour produire un effet visuel équilibré.
3. **Onde fluide** : une ligne lumineuse multicolore suit le signal audio dans
   le temps.
4. **Cercle radial** : des rayons colorés réagissent aux fréquences autour d'un
   cercle central.

Le modèle peut être changé pendant la lecture. L'animation démarre à la lecture,
s'arrête pendant la pause, reprend ensuite et libère sa boucle d'animation ainsi
que son `AudioContext` lors de la destruction du composant.

### Amélioration de la bibliothèque : réalisée

Une barre de recherche par titre a aussi été ajoutée. Elle est réactive,
insensible aux majuscules et aux accents, possède un bouton d'effacement et
affiche un état vide spécifique. Elle filtre les pistes de la page serveur
actuellement chargée afin de ne pas contourner la pagination du backend.

### Priorité 2 — Mixage multipiste : proposée, non réalisée

Cette étape pourra comprendre une timeline multipiste, la synchronisation de
plusieurs morceaux, les réglages individuels de volume et de panoramique, les
actions Mute/Solo, le découpage de segments, les fondus et les crossfades. Ces
éléments ne sont pas encore présents dans le code actuel.

### Priorité 3 — Traitement sonore : proposée, non réalisée

Les traitements suivants constituent la prochaine évolution possible :

- égaliseur trois bandes pour les graves, médiums et aigus ;
- filtres passe-haut et passe-bas ;
- compresseur de dynamique ;
- réverbération ;
- délai et écho ;
- réglage du gain avant la sortie ;
- limiteur protégeant contre un niveau sonore excessif ;
- vumètres affichant le niveau instantané et les crêtes.

Cette priorité nécessitera de faire passer le signal dans une chaîne de nœuds
Web Audio, par exemple :

```text
source audio
→ filtre passe-haut
→ égaliseur graves/médiums/aigus
→ filtre passe-bas
→ compresseur
→ gain
→ effets réverbération/délai
→ analyseur et vumètres
→ limiteur
→ sortie audio
```

Les valeurs devront être bornées afin d'éviter la saturation, les changements
brutaux de volume et les niveaux dangereux. Les effets devront aussi pouvoir
être désactivés individuellement pour comparer le signal traité au signal
d'origine.

### Fonctions musicales avancées — première version réalisée

Une première couche de fonctions musicales avancées a été ajoutée au lecteur
monopiste actuel.

#### Détection et réglage du BPM

Lors du chargement d'un morceau, le frontend décode temporairement le Blob avec
la Web Audio API. Il calcule l'énergie moyenne de fenêtres successives, repère
les pics suffisamment espacés, transforme leurs intervalles en valeurs de BPM
et choisit la valeur la plus fréquente entre 70 et 180 BPM. Le résultat est une
estimation : un champ numérique permet donc de le corriger manuellement entre
40 et 240 BPM.

Cette méthode est adaptée à une démonstration et aux morceaux possédant des
transitoires rythmiques nettes. Elle n'a pas la précision d'un moteur spécialisé
pour les morceaux complexes, les changements de tempo ou les rythmes très
souples.

#### Métronome et grille rythmique

- Un métronome Web Audio produit un clic selon le BPM courant.
- Le BPM peut être changé pendant son fonctionnement ; son intervalle est alors
  recalculé.
- Une grille rythmique est dessinée sur le visualiseur en temps réel.
- Les débuts de mesure sont plus visibles que les battements intermédiaires.
- La mesure peut contenir 3, 4 ou 6 temps.
- L'utilisateur peut afficher ou masquer cette grille.

#### Synchronisation sur le battement

Le bouton « Caler sur le battement » déplace la position actuelle vers le
battement le plus proche en fonction du BPM. Cette fonction réalise une
quantification temporelle dans le lecteur monopiste.

La synchronisation automatique de plusieurs morceaux n'est pas encore possible,
car elle dépend de la timeline et du moteur multipiste prévus dans la priorité 2.
La fonction actuelle prépare ce futur comportement sans prétendre synchroniser
des pistes qui ne sont pas encore chargées simultanément.

#### Marqueurs et points de repère

L'utilisateur peut saisir le nom d'un repère et l'enregistrer à la position
courante. Les repères sont triés chronologiquement. Un clic revient à la
position mémorisée et chaque repère peut être supprimé individuellement. Ils
sont conservés dans l'état du composant pour la session courante ; leur
persistance en base nécessitera une évolution future du modèle et de l'API.

#### Tempo sans changement de tonalité

Le sélecteur de vitesse continue de modifier le tempo de `0,5×` à `2×`.
La propriété `preservesPitch` de l'élément audio est explicitement activée afin
que les navigateurs compatibles conservent la tonalité pendant ce changement.

La modification indépendante de la hauteur sans changer la vitesse n'est pas
encore réalisée. Elle demande un algorithme de pitch shifting dans un
`AudioWorklet` ou une bibliothèque DSP spécialisée ; une simple modification
de `playbackRate` ne respecterait pas la demande.

#### Boucles calées sur les mesures

L'utilisateur choisit une signature de 3, 4 ou 6 temps et une longueur de 1, 2,
4 ou 8 mesures. Le lecteur calcule le début de la mesure contenant la position
courante, règle automatiquement la zone de travail, active la boucle et replace
la lecture au début calculé.

#### Automation du volume et du panoramique

- Un contrôle de panoramique gauche/droite utilise un `StereoPannerNode`.
- L'utilisateur peut mémoriser des points contenant le temps, le volume et le
  panoramique courants.
- Lorsque l'automation est active, les valeurs sont interpolées entre deux
  points pendant la lecture.
- Les points peuvent être effacés pour recommencer une automation.

L'automation des effets n'est pas encore disponible, car les effets concernés
doivent d'abord être créés dans la priorité 3. La structure des points
d'automation pourra ensuite être étendue avec les paramètres d'égalisation,
de filtre, de réverbération et de délai.

#### Chaîne audio actuelle

```text
élément audio authentifié
→ MediaElementAudioSourceNode
→ StereoPannerNode
→ AnalyserNode
→ sortie audio
```

Le `StereoPannerNode` traite le panoramique, tandis que l'`AnalyserNode` alimente
les quatre modèles de visualisation et la grille rythmique.

### Vérifications réalisées après la priorité 1 et le visualiseur

- Tests frontend : **5 fichiers réussis, 9 tests réussis sur 9**.
- Build Angular : **réussi**.
- Le téléchargement authentifié, l'upload, la suppression, la pagination et les
  tests précédents restent compatibles avec le lecteur enrichi.

### Fichiers concernés

- `frontend-starter/src/app/components/tracks-page/tracks-page.ts` ;
- `frontend-starter/src/app/components/tracks-page/tracks-page.html` ;
- `frontend-starter/src/styles.css` ;
- `RAPPORT_IA_MODELE.md`.


## Bilan du studio de mixage — 14 octobre 2026

### Objectif et demandes de l’utilisateur

Faire évoluer le studio vers une interface inspirée de Virtual DJ : deux platines
A et B avec scratch, une console occupant toute la largeur, des visualisations
musicales en arrière-plan modifiables, des réglages de tonalité et d’égalisation,
un enregistrement du mix, une entrée micro et une collection classée par style.
Corriger aussi le fonctionnement du mode clair/sombre dans Mixage.

Ce bilan couvre les interventions des 12 et 14 octobre 2026. Il complète les
priorités décrites le 2 octobre sans prétendre que toutes les fonctions d’un
logiciel DJ professionnel sont déjà présentes.

### Plan suivi par l’assistant

1. Lire les consignes Angular, le contrat HTTP et les composants existants.
2. Remplacer le studio monopiste par deux transports audio indépendants.
3. Ajouter le crossfader, le scratch et le fond musical configurable.
4. Ajouter les réglages de tonalité, l’égaliseur, le micro et l’enregistrement.
5. Relier les composants du studio au thème global de l’application.
6. Générer et intégrer six boucles instrumentales originales par style.
7. Vérifier la compilation, les tests, les fichiers WAV et les parcours navigateur.
8. Documenter les résultats, les limites et les prochaines améliorations.

### Ce qui a été réalisé

| Domaine | Fonctionnalités effectivement présentes |
|---|---|
| Platines A / B | Chargement indépendant, lecture/pause, retour au début avec CUE, position de lecture, volume et boucle sur le morceau entier. |
| Scratch | Manipulation verticale à la souris ou au toucher, et flèches gauche/droite au clavier ; lecture de fragments vers l’avant ou depuis un buffer inversé. Reprise de la lecture si elle était active. |
| Mixage | Crossfader à puissance constante, volume de sortie général, réglage de vitesse par platine. |
| Tonalité et égaliseur | Transposition de −12 à +12 demi-tons ; graves, médiums et aigus de −24 à +12 dB ; réinitialisation des réglages. |
| Présentation | Console sur toute la largeur, platines agrandies, adaptation aux petits écrans et boutons dont les couleurs/lueurs réagissent au signal audio. |
| Fond musical | Butterchurn/MilkDrop avec choix du preset et bouton « Preset suivant » ; modèles Barres, Miroir, Onde et Cercle. Le visualiseur reçoit la sortie commune des platines. |
| Thèmes | Mode clair et mode sombre appliqués au fond, aux panneaux, aux boutons, aux textes, aux égaliseurs et aux commandes du micro. Les disques conservent leur aspect vinyle sombre. |
| Micro | Activation à la demande avec autorisation du navigateur, volume de voix, mute, ajout de la voix à la sortie générale et à l’enregistrement. Désactivation et libération du périphérique. |
| Enregistrement | Démarrage/arrêt, compteur de durée, capture de la sortie générale incluant les réglages et le micro actif, écoute des prises et téléchargement. |
| Styles musicaux | Choix du style à l’import, reclassement des pistes et filtres sur la page courante. Les styles des imports sont mémorisés localement dans le navigateur. |
| Collection incluse | Six boucles originales accessibles dans Bibliothèque et Mixage, filtrables par style, chargeables directement sur A ou B sans import dans l’API. |

### Pistes musicales ajoutées et utilisables

Il s’agit de **boucles instrumentales originales de démonstration**, synthétisées
par un script Python sans extrait de chanson commerciale ni échantillon tiers.
Les styles sont des inspirations pour des boucles d’entraînement.

| Style | Titre | Tempo | Durée approximative |
|---|---|---|---|
| House | Lumière de nuit | 124 BPM | 15,48 s |
| Hip-hop | Promenade | 88 BPM | 21,82 s |
| Afrobeat | Soleil levant | 104 BPM | 18,46 s |
| Amapiano | Horizon | 112 BPM | 17,14 s |
| Reggae | Jardin tranquille | 78 BPM | 24,62 s |
| Blues | Route du soir | 96 BPM | 20,00 s |

Chaque piste contient huit mesures à quatre temps. Les fichiers sont des WAV
PCM mono, 16 bits, 22 050 Hz, servis depuis `public/audio/demos/`. Le catalogue
fournit le style, le BPM, la durée et l’adresse de chaque fichier.

Pour les utiliser : ouvrir « Pistes par style musical », sélectionner un style,
cliquer sur « Charger A » ou « Charger B », puis lancer la platine. Le bouton
« Boucle » permet de prolonger la lecture. Depuis la bibliothèque, les boutons
« Écouter » et « Mixer » ouvrent l’espace correspondant.

### Fonctionnement technique à expliquer

```text
Buffer audio de la platine A ou B
→ filtres graves / médiums / aigus
→ gain de platine et crossfader
→ sortie générale
→ analyseur et haut-parleurs

Micro autorisé
→ source MediaStream
→ gain de voix / mute
→ même sortie générale

Sortie générale
→ MediaStreamAudioDestinationNode
→ MediaRecorder
→ fichier téléchargeable
```

La transposition multiplie la vitesse du buffer par `2^(demi-tons / 12)`.
La position de lecture tient compte de cette vitesse effective. Le scratch
utilise le buffer normal ou un buffer dont les échantillons sont inversés.

Le thème repose sur des variables CSS partagées `--dj-*`, définies pour le mode
clair et redéfinies lorsque `data-theme="dark"` est présent sur la racine du
document. Les composants enfants héritent de cette palette. Cela corrige les
couleurs sombres autrefois imposées localement et les titres blancs en mode clair.

### Vérifications réellement effectuées par l’assistant

- `npm run build` dans `frontend-starter/` : **compilation réussie**.
- `npm test` dans `frontend-starter/` : **9 fichiers de tests, 30 tests réussis**.
- Tests du transport : lecture indépendante, crossfader, scratch inversé,
  conservation de la position, boucles, égalisation et transposition.
- Tests du micro et de l’enregistrement : branchement au master, mute, refus
  d’autorisation, annulation d’une demande, sauvegarde des prises et nettoyage.
- Tests de la collection : filtrage par style, sélection de la bonne platine,
  désactivation pendant le chargement, récupération des WAV locaux et maintien
  du chargement API pour les pistes importées.
- Contrôle des six WAV : structure valide, durée et taille conformes au catalogue,
  signal non silencieux et absence de saturation numérique des fichiers générés.
- Contrôle HTTP local : les six fichiers audio répondent **200** avec la taille
  attendue et un en-tête WAV valide.
- Dans le navigateur : chargement/décodage des six pistes sur les platines ;
  démarrage de la boucle House et progression de sa position de lecture.
- Dans le navigateur : bascule clair/sombre, vérification des couleurs calculées,
  inspection visuelle des deux thèmes et absence de débordement horizontal dans
  la fenêtre testée.

Les contrôles navigateur utilisent un serveur de test local isolé avec une
connexion et une liste de pistes simulées, sans utiliser de compte réel ni
modifier les données du backend. Les WAV et les composants audio testés sont
ceux du projet. Les tests du micro et de MediaRecorder utilisent des objets
simulés ; une validation avec un microphone physique et une écoute humaine de
l’enregistrement final restent à faire par l’utilisateur.

Captures conservées dans le dépôt :

- [Mixage en mode clair](preuves/mixage-clair-2026-10-14.png).
- [Mixage en mode sombre](preuves/mixage-sombre-2026-10-14.png).

### Limites actuelles et décisions prises

- La transposition modifie **aussi la vitesse** : le pitch shifting indépendant
  n’est pas encore implémenté.
- La boucle actuelle porte sur le morceau entier ; les boucles courtes calées
  sur les mesures et les Hot Cues ne sont pas encore présents sur les platines.
- Le CUE actuel revient au début ; il ne mémorise pas encore un point personnalisé.
- Le classement des imports par style est local au navigateur, sans synchronisation
  entre appareils ni stockage du genre dans l’API des pistes.
- Les recherches et filtres des pistes importées portent sur la page serveur
  actuellement chargée ; la collection de six démonstrations se filtre entièrement.
- Les prises d’enregistrement restent temporaires dans la page : il faut les
  télécharger avant de quitter le studio. Elles ne sont pas envoyées au serveur.
- Le format d’enregistrement dépend des formats pris en charge par le navigateur
  (WebM/Opus, OGG ou M4A selon la compatibilité) ; aucun export MP3 n’est promis.
- Le micro nécessite un contexte compatible (HTTPS ou localhost) et une autorisation.
  Le casque est conseillé puisque la voix est diffusée en direct dans le mix.
- Le fond Butterchurn dépend de WebGL ; les autres modèles restent disponibles
  en cas d’échec. Les préférences de réduction des animations sont respectées.
- La compilation conserve les avertissements CommonJS de Butterchurn et de ses
  presets ; ils ne font pas échouer le build.
- Le backend et le contrat HTTP n’ont pas été modifiés pour ces évolutions.

### Ce qui est prévu / proposé pour la suite

Les éléments suivants constituent une **feuille de route proposée**. Ils ne sont
pas encore réalisés et aucune date de livraison n’est annoncée.

| Priorité proposée | Amélioration à réaliser | Résultat attendu |
|---|---|---|
| 1 | Synchronisation automatique du tempo A/B | Régler la vitesse d’une platine à partir du BPM de l’autre, puis travailler l’alignement des battements. |
| 1 | Hot Cues et CUE personnalisé | Mémoriser plusieurs positions et revenir rapidement sur une introduction, un refrain ou un point de transition. |
| 1 | Boucles musicales courtes | Choisir une longueur en battements/mesures sur chaque platine. |
| 2 | Sauvegarde des réglages et des styles dans le compte | Retrouver ses paramètres entre sessions et appareils ; examiner le modèle de projet existant et les évolutions nécessaires du contrat API. |
| 2 | Transposition sans changement de vitesse | Ajouter un moteur DSP adapté, par exemple via AudioWorklet, puis vérifier la qualité et la latence. |
| 2 | Conservation des enregistrements | Ajouter une sauvegarde durable et un nom de prise choisi par l’utilisateur. |
| 3 | Effets et contrôle des niveaux | Réverbération, délai, filtres supplémentaires, vumètres et protection contre la saturation du mix. |
| 3 | Recherche globale et collection étendue | Rechercher sur toutes les pistes importées et compléter les boucles originales par d’autres styles. |

Avant toute évolution serveur, le contrat HTTP et les consignes backend devront
être examinés. Cette liste documente les prochaines pistes de travail, sans
modifier le backend dans la mission présente.

### Erreurs rencontrées et corrections apportées

- Les couleurs du studio étaient fixées en sombre : remplacement par une palette
  CSS commune qui suit le thème global, puis correction des titres héritant de
  la couleur blanche des en-têtes.
- L’export CommonJS de Butterchurn possède un niveau `default` supplémentaire :
  adaptation du chargement et vérification du véritable format dans les tests.
- Les erreurs d’autorisation micro ne se reconnaissent pas toujours avec
  `instanceof Error` : lecture défensive du nom de l’erreur, vérifiée par un test.
- Les tests du rendu devaient conserver la bonne fonction requestAnimationFrame
  pour vérifier le redimensionnement de Butterchurn.
- Le serveur de prévisualisation ne pouvait pas écouter dans le sandbox : il a
  été lancé avec l’autorisation d’exécution locale, puis arrêté après les contrôles.

### Principaux fichiers créés ou modifiés

- `frontend-starter/src/app/components/app/app.ts`, `app.html`, `app.css`.
- `frontend-starter/src/app/components/studio-page/` : TypeScript, HTML, CSS et tests.
- `frontend-starter/src/app/components/dj-deck/` : commandes et affichage des platines.
- `frontend-starter/src/app/components/mix-capture/` : commandes micro et enregistrement.
- `frontend-starter/src/app/components/demo-library/` : collection par style et test.
- `frontend-starter/src/app/components/tracks-page/` : import et classement par style.
- `frontend-starter/src/app/shared/services/dj-audio.service.ts` et son test.
- `frontend-starter/src/app/shared/services/mix-capture.service.ts` et son test.
- `frontend-starter/src/app/shared/services/track-style.service.ts`.
- `frontend-starter/src/app/shared/services/demo-track.service.ts`.
- `frontend-starter/src/app/shared/services/track.service.ts` et son test.
- `frontend-starter/src/app/shared/models/dj-deck.model.ts`, `demo-track.model.ts`,
  `demo-tracks.json`.
- `frontend-starter/src/styles.css` : palette commune du studio.
- `frontend-starter/scripts/generate-demo-tracks.py`.
- `frontend-starter/public/audio/demos/` : six WAV et notice d’origine.
- `preuves/mixage-clair-2026-10-14.png`, `preuves/mixage-sombre-2026-10-14.png`.
- `RAPPORT_IA_MODELE.md` : ce bilan et le lien vers l’état actuel.

### Ce que le binôme doit pouvoir expliquer sans l’agent

- La différence entre une piste importée depuis l’API et une boucle locale incluse.
- La chaîne audio des deux platines, l’égaliseur et le crossfader.
- Le principe du scratch inversé et les limites de la transposition actuelle.
- Comment le microphone et l’enregistrement rejoignent la sortie générale.
- Comment les variables CSS assurent le thème des composants imbriqués.
- Ce qui persiste dans le navigateur, dans un fichier téléchargé ou dans le backend.
- La différence entre tests avec objets simulés, vérifications navigateur et
  validation réelle du micro et du résultat sonore.

Ces points sont des objectifs de restitution, et non une attestation que le
binôme a déjà réalisé personnellement toutes les vérifications.


## Évolution du studio, du lecteur et de la collection — 14 octobre 2026

### Demande et périmètre

Réaliser les améliorations proposées : synchronisation du tempo, Hot Cues,
sauvegarde des réglages et styles dans le compte, transposition indépendante.
Harmoniser Pistes avec le studio, associer une couleur au style des imports,
passer le lecteur en fond musical, proposer dix boucles par style existant et
contrôler les parcours, la présentation et les points de sécurité concernés.

### Nouveautés effectivement réalisées

- **60 boucles originales** : dix variations pour chacun des six styles House,
  Hip-hop, Afrobeat, Amapiano, Reggae et Blues. Le catalogue fournit le BPM et les
  métadonnées ; les fichiers sont servis à la demande, sans téléchargement des
  60 sons au démarrage. Environ 50 Mo d’assets WAV dans le dépôt.
- **SYNC** : calcule la vitesse nécessaire pour suivre le BPM et la vitesse de
  l’autre platine. Les BPM des démos sont connus ; celui d’un import est estimé
  par analyse du signal et reste modifiable. La vitesse est bornée entre 0,5 et 2.
- **Quatre Hot Cues par platine** : premier clic pour mémoriser la position,
  clic suivant pour y revenir, bouton de suppression pour libérer le repère.
- **Tonalité indépendante** : SoundTouch AudioWorklet reçoit le tempo du buffer
  et applique la transposition en demi-tons indépendamment de cette vitesse.
  Le processeur est fourni localement par le build. En cas d’indisponibilité,
  la lecture reste possible et la commande de transposition est désactivée.
  Le scratch contourne le traitement de tonalité pour conserver une manipulation
  immédiate ; la lecture normale repasse ensuite dans le moteur DSP.
- **Sauvegarde dans le compte** : réutilisation de `POST /api/projects` et
  `GET /api/projects`, sans modifier le backend. Un snapshot versionné est placé
  dans `settings.effects` ; il conserve les deux sélections, les BPM, les Hot Cues,
  les volumes, la vitesse, la tonalité, l’EQ, la position, les boucles, le master,
  le crossfader et les styles. Les prises audio et les réglages du micro ne sont
  pas enregistrés dans le projet.
- **Restauration** : valeurs numériques bornées, chargement par ID de piste,
  arrêt des anciennes lectures et restauration sans activation du micro, de
  l’enregistrement ou de la lecture. Les sauvegardes sont listées depuis Mixage.
- **Styles des imports** : accent de couleur adapté au genre sélectionné ; cache
  isolé par compte et migration des anciennes préférences du navigateur. Une
  sauvegarde de mix permet de transférer ces préférences via le compte.
- **Pistes et Lecture** : palette commune clair/sombre, contrôles harmonisés,
  visualiseur fixe en arrière-plan de la page Lecture et modèles/presets modifiables.
- **Téléphone** : correction du menu qui débordait horizontalement ; contrôle
  navigateur à 390 px après correction, sans débordement horizontal constaté.

### Sécurité : corrections et limites

Le JWT est maintenant limité à l’API du même site. Il n’est plus ajouté aux
WAV locaux, au worklet ni aux requêtes vers un domaine tiers. Les identifiants
dans les URL sont encodés, les styles validés et les données restaurées bornées.
Les snapshots n’incluent aucun secret ni token. Les sélections locales invalides
sont gérées sans faire échouer la page Lecture.

Les dépendances frontend ont été mises à jour et Angular est aligné sur 22.2.2.
L’installation du verrou final rapporte **0 vulnérabilité npm connue** côté
frontend. Cela ne signifie pas que l’application entière est exempte de risque.

L’audit backend en lecture seule rapporte **deux vulnérabilités connues** :
`multer` (modérée) et `proxy-addr` (critique). Les consignes interdisent de modifier
le backend dans une mission frontend ; ces dépendances restent donc à corriger.
La politique CORS, la limitation des tentatives de connexion, la validation des
snapshots côté serveur et la stratégie de stockage des JWT restent aussi à
renforcer pour la production. Le détail figure dans [SECURITE_MIXAGE.md](SECURITE_MIXAGE.md).

### Vérifications effectuées

- Compilation Angular : réussie.
- Frontend : **11 fichiers, 36 tests réussis**.
- Backend, tests existants sans MongoDB réel : **8 tests réussis** ; refus de JWT
  absent/invalide, contrôles d’upload et refus d’accès à une piste d’un autre compte.
- Les **60 WAV** ont une structure valide, un signal non silencieux, aucune
  saturation numérique dans les fichiers et une taille conforme au catalogue.
- Requêtes HTTP locales : **60 WAV et le processeur AudioWorklet répondent 200**.
- Navigateur : attribution du style Reggae à une piste simulant un import et
  changement de l’accent visuel ; ouverture et lecture dans le lecteur avec fond.
- Navigateur : worklet chargé, commande de transposition active, lecture en cours,
  synchronisation House/Hip-hop à environ 71 %, mémorisation d’un Hot Cue,
  sauvegarde puis restauration de la tonalité et du repère.
- Contrôles navigateur réalisés sur une API isolée simulant une piste importée et
  les projets en mémoire : **pas de validation de la persistance MongoDB réelle**.
- Tests unitaires supplémentaires : token absent des ressources et domaines tiers,
  séparation des styles entre comptes, corps du snapshot et restauration valide,
  routage vers le worklet et maintien de la vitesse lors de la transposition.

Preuves : [lecteur en arrière-plan](preuves/lecteur-background-2026-10-14.png) et
[studio enrichi](preuves/mixage-evolution-2026-10-14.png).

### Prochaines améliorations non encore réalisées

- Alignement de phase des battements : SYNC ajuste le tempo, sans beatmatching
  automatique précis ; l’estimation BPM peut être incorrecte et doit être contrôlée.
- Boucles courtes calées sur les mesures, vumètres et limiteur de saturation.
- Sauvegarde automatique des styles dans les métadonnées des pistes : actuellement
  ils sont synchronisés avec les snapshots de projets sur action de l’utilisateur.
- Sauvegarde serveur des prises d’enregistrement et effets additionnels.
- Mise à jour des dépendances backend et durcissement serveur avant déploiement.
- Validation avec plusieurs comptes réels, microphone physique et écoute humaine
  pour apprécier la qualité du time stretching et de la transposition sur divers sons.

### Fichiers principalement concernés par cette évolution

- Composants `dj-deck`, `mix-account`, `studio-page`, `tracks-page`, `demo-library`, `app`.
- Services `dj-audio`, `track-style`, `project`, `track` et leurs tests concernés.
- Intercepteur d’authentification et test ; modèles de snapshot et projet.
- Script de génération, catalogue JSON, 60 fichiers WAV et notice d’origine.
- `package.json`, verrou npm et `angular.json` pour le processeur local.
- `API_CONTRACT.md` : format du snapshot dans le champ `effects` existant.
- `SECURITE_MIXAGE.md`, preuves et présent rapport.

Le binôme doit pouvoir distinguer la synchronisation de tempo de l’alignement des
battements, expliquer la chaîne DSP, le snapshot de projet, les préférences par
compte, et présenter les limites d’un contrôle de sécurité ciblé.


## Transformation MOST VIBE — 14 octobre 2026

### Demande et autorisation

Le texte fourni par l’utilisateur demande de transformer le projet existant en
mini réseau social musical MOST VIBE, en conservant les outils audio et les données.
Il précise l’identité azur/violet, la découverte publique, les publications,
les amis, la messagerie, les permissions serveur, la révocation et les crédits.
Cette demande autorise les modifications nécessaires de l’API et du backend,
malgré la consigne générale des missions frontend antérieures. Aucun secret
`.env` ni jeu de données réel n’a été modifié pour les tests.

### Réalisation

- Intégration de l’image fournie, initiales MV, palette demandée, navigation
  verticale et lecteur persistant ; conservation du thème sombre en option.
- Pages Accueil/Explorer sans connexion, recherche publique et albums publics.
- Publications privées par défaut ; choix public/amis, consultation et révocation
  des destinataires, métadonnées et styles persistés dans les pistes.
- Modèles Mongoose supplémentaires pour amitiés, blocages, messages, notifications,
  collections, réactions et signalements. Pas de tableau fictif tenant lieu de DB.
- Routes de droits, messagerie, likes/favoris, albums/playlists, compte et modération.
- Historique de messages autorisé aux deux amis uniquement ; envoi de pistes
  appartenant à l’émetteur, accès attribué sans publication et carte interrompue
  après révocation. Les nouvelles lectures vérifient l’accès actuel.
- Sources et crédits de remix collectés pendant l’enregistrement et calculés
  côté serveur après vérification de l’autorisation de chaque source. Les crédits
  et sources ne peuvent pas être retirés par un PATCH de fichier.
- Sauvegarde/reprise des brouillons, partage avec des amis et révocation ;
  conservation des permissions distinctes sur les fichiers source.
- Enregistrement du mix vers la bibliothèque privée, puis choix de publication.
- Paramètres persistants : profil, bio/avatar, notifications, profil découvrable,
  blocages et suppression après vérification du mot de passe.
- Administration de contenus publics, signalements et suspension de comptes ;
  le rôle est relu en base et ne permet pas de lire des conversations/fichiers privés.
- MP3/WAV/OGG/M4A/WebM, clips MP4/WebM et images PNG/JPEG/WebP : types et signatures
  vérifiés, durée audio extraite côté serveur, noms internes contrôlés, 25 Mo maximum.
- Mise à jour des dépendances backend vulnérables, Helmet, limites de requêtes,
  CORS ciblé et refus du secret JWT de développement en production.
- Documents de contrat et de livraison ; préparation Docker/Nginx avec volume
  persistant et guide de configuration, sans annonce de mise en ligne réalisée.

### Vérifications et preuves

Dernier contrôle de cette livraison : **42 tests frontend (13 fichiers) et
16 tests backend réussis**, build Angular réussi. Les deux avertissements
CommonJS de Butterchurn/presets concernent l’optimisation du bundle.
Les captures des sections antérieures documentent le studio précédent ;
elles ne prouvent pas le rendu final MOST VIBE.

Les tests frontend conservent les contrôles audio précédents et ajoutent la
reprise d’un favori ou d’un remix après connexion depuis l’accueil public.
Une autorisation de remix retirée est revérifiée avant d’ouvrir le studio.
Le lecteur efface le média précédent lors du chargement suivant, y compris
en cas d’accès refusé, et ignore les téléchargements obsolètes. Les tests backend
utilisent trois comptes fictifs et MongoDB éphémère, sans l’URI du `.env` réel.
Ils couvrent notamment les accès privés par lien direct, publication par un
non-propriétaire refusée, invitations acceptées/refusées par le destinataire,
messages réservés aux amis, attribution et révocation d’un accès musical,
crédits immuables sur deux générations de remixes, absence d’activité privée,
blocages, collections/favoris/notifications, projets, administration et rejet
d’un texte déguisé en WAV. Les anciens tests de l’API restent présents.

Les audits npm frontend/backend indiquent zéro vulnérabilité connue au contrôle.
La configuration Compose a été validée avec des valeurs fictives ; aucun site
n’a été déployé. Les contrastes principaux sont vérifiés numériquement : texte
`#18324F` sur blanc 13,06:1 ; texte secondaire sur fond clair 4,51:1 ; bouton azur
foncé/texte blanc 5,57:1. L’azur principal pur est réservé aux usages adaptés.

**Limite explicite :** l’ouverture de la prévisualisation locale a été refusée
par la sécurité du navigateur (autorisation déclinée). Aucun autre navigateur,
port de contournement ou automatisation équivalente n’a été utilisé. Le rendu
visuel final et le micro/vidéo sur périphérique réel ne sont donc pas attestés.

### Erreurs et corrections

- Les fonctionnalités sociales exigent de nouvelles routes : le contrat API
  a été complété avec authentification, corps, réponses et erreurs.
- Limitation des champs de création de projets pour empêcher un partage injecté
  dans le corps ; droits revérifiés après blocage ou retrait d’amitié.
- Validation binaire ajoutée après le filtre MIME Multer, avec nettoyage des
  fichiers temporaires si la validation ou l’écriture échoue.
- Retour après connexion limité aux chemins internes autorisés, avec reprise
  d’une action différée ; suppression des identifiants démo préremplis.
- Contrôle du rôle administrateur côté DB et refus des modifications du rôle
  depuis les préférences. Le premier rôle est attribué par script opérateur.
- Annulation des réponses de recherche/conversation obsolètes pour éviter
  de mélanger les résultats ou de montrer un ancien fil sous un autre ami.
- Recherche des pistes à envoyer effectuée côté serveur dans toute la
  bibliothèque personnelle, avant pagination ; recherche littérale et isolée
  entre comptes vérifiée dans les tests HTTP.
- Affichage de toute la chaîne de contributeurs dans les fiches, les lecteurs
  et les cartes partagées ; boutons/textes ajustés pour leur contraste.

### Services à configurer et contrôles restants

Configurer MongoDB réel, domaine/HTTPS, CORS, secret JWT, premier administrateur,
volume de fichiers et sauvegardes. Valider les conteneurs et le déploiement réel,
les navigateurs desktop/mobile, les codecs vidéo et le micro physique. Les
notifications sont en application avec polling ; ni SMTP, push hors application
ni présence instantanée ne sont annoncés. Les crédits concernent les sources
référencées ; l’application ne détecte pas automatiquement les droits juridiques
d’un fichier créé ailleurs. Un fichier déjà téléchargé ne peut pas être repris.

Le bilan complet figure dans [MOST_VIBE.md](MOST_VIBE.md) et les étapes de mise
en ligne dans [deployment/README.md](deployment/README.md). Le binôme doit expliquer
les ACL, leur révocation, les crédits dérivés par le serveur, la séparation des
privilèges d’administration et la différence entre tests DB isolés et production.

## Contrôle de sécurité — erreurs JSON (14 novembre 2026)

Objectif : vérifier que les requêtes invalides ne divulguent pas de données
privées. Un test de régression a confirmé que le gestionnaire renvoyait le
diagnostic brut du parseur ; l'objet erreur journalisé contenait aussi le corps
reçu. Le gestionnaire répond désormais avec un message générique pour le JSON
invalide et les corps trop volumineux ; ses logs se limitent au nom et au statut
de l'erreur. Fichiers : `backend/src/app.js`, `backend/test/api.test.js`,
`API_CONTRACT.md`. Le test vérifie le statut, la réponse et l'absence du marqueur
privé dans les logs. Le binôme doit expliquer pourquoi un objet Error de parseur
peut contenir des données sensibles, même si aucun log explicite de mot de passe
n'est écrit.

## Contrôle de sécurité — suspension et partage (14 novembre 2026)

Un test HTTP sur MongoDB éphémère a reproduit l'accès d'un ami au projet d'un
propriétaire suspendu. La fonction `friends(a,b)` ne vérifiait que le second
compte. Elle vérifie maintenant l'existence et l'état actif des deux comptes.
Le test couvre accès initial, suspension, refus du projet partagé et réactivation.
Fichiers : `backend/src/social/access.js`, `backend/test/social.test.js` et
`API_CONTRACT.md`. Le binôme doit expliquer pourquoi un contrôle d'autorisation
sur une relation doit être symétrique et revérifié à chaque lecture.

## Contrôle de sécurité — dépendances (14 novembre 2026)

L'audit des dépendances a signalé des avis de sécurité sur Mongoose, Multer,
body-parser, qs, Vite et Zod. Les correctifs sont enregistrés dans les fichiers
lock ; Angular CLI et Angular Build passent de 22.2.2 à 22.2.7 pour intégrer les
versions corrigées de leurs dépendances, sans changement de version majeure.
Versions retenues : Mongoose 9.12.1, Multer 2.5.0, body-parser 2.4.0, qs 6.17.1,
Vite 8.3.5 et Zod 4.6.6. Aucun `npm audit fix --force` n'a été utilisé.

Validation de cette session : 19 tests backend réussis après les corrections et
les mises à jour ; 50 tests frontend réussis et build Angular réussi avec les
nouveaux outils. Les deux audits npm complets (développement inclus) indiquent
zéro vulnérabilité connue. Les deux avertissements CommonJS Butterchurn restent
présents. Un audit npm sans avis connu ne prouve pas l'absence de toute
faille : cette revue couvre les erreurs JSON, les relations de partage et les
dépendances ; aucun audit exhaustif ni contrôle manuel navigateur n'est revendiqué.
Le binôme doit distinguer dépendances d'exécution et outils de développement,
et comprendre pourquoi les deux catégories nécessitent des mises à jour.
