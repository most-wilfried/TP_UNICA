# Rapport d'usage de l'IA - TP1

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
