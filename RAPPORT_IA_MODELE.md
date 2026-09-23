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
