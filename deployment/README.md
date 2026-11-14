# Préparer la mise en ligne de MOST VIBE

Le site n’est **pas publié**. Les fichiers Docker/Nginx constituent une préparation,
pas une preuve de déploiement vérifié. Conserver une copie de la base et des
fichiers `backend/data/uploads` avant toute opération sur un environnement réel.

## Démarrage local

1. Conserver votre configuration `backend/.env` existante ; ne pas la committer.
2. `cd backend && npm ci && npm start` : connexion MongoDB obligatoire avant écoute.
3. Dans un autre terminal : `cd frontend-starter && npm ci && npm start`.
4. Ouvrir `http://localhost:4200`. Les anciennes pistes restent privées ; aucune
   publication automatique ni suppression des données existantes n’est effectuée.
5. Créer deux comptes de test, les inviter, partager une piste et révoquer le partage.

Les tests `npm test` du backend utilisent une base MongoDB **éphémère distincte**
via mongodb-memory-server, jamais l’URI de votre `.env`. Le premier lancement
peut télécharger le binaire MongoDB (environ 95 Mo).

## Configuration de production

- MongoDB/Atlas : droits minimaux, accès réseau restreint, sauvegardes et index.
- `JWT_SECRET` aléatoire d’au moins 32 caractères ; aucun secret de démonstration.
- `CORS_ORIGINS` : domaine HTTPS exact, sans ouverture générale.
- Certificat TLS et domaine devant le frontend. Le fichier Nginx livré écoute
  sur HTTP derrière un reverse proxy HTTPS à configurer ; seul localhost:8080 est
  exposé dans Compose, et le backend reste sur le réseau interne.
- Volume audio persistant avec permissions du compte système `node`. Restaurer
  vos fichiers existants dans le volume lors de la migration, sans les écraser.
- Planifier la sauvegarde conjointe MongoDB + fichiers et tester la restauration.
- Ne jamais servir `backend/data/uploads` directement : l’API vérifie les droits
  pour chaque nouveau flux. Ne pas mettre en cache les données privées.
- Ajuster la protection contre les abus pour le reverse proxy réel : le backend
  ne fait pas confiance aveuglément aux en-têtes X-Forwarded-For. À défaut d’une
  configuration de proxy de confiance, les limites sont partagées par les clients
  passant par le même proxy ; définir ce périmètre avant la mise en production.
- Politique CSP à adapter/tester pour Angular, WebGL et AudioWorklet ; ne pas
  l’assouplir aveuglément. Les couvertures HTTPS sont des ressources externes.

Exemple de préparation depuis ce dossier (secrets dans l’environnement, pas dans Git) :

```bash
docker compose -f compose.yml build
docker compose -f compose.yml up -d
```

Attribuer le premier rôle administrateur à un compte déjà créé, depuis un accès
opérateur sécurisé au backend :

```bash
node --env-file=.env scripts/set-admin.js adresse-du-compte
```

Aucune route HTTP ne permet à un utilisateur de s’accorder ce rôle. En production,
aucun compte de démo avec mot de passe connu n’est créé automatiquement.

## Contrôles avant d’annoncer le site publié

- HTTPS réel, santé API, accès MongoDB et fichier importé lisible après redémarrage.
- Recherche et écoute publique en session anonyme.
- Deux comptes distincts : invitations, acceptation/refus, messages et non-lus.
- Troisième compte : impossibilité de lire les fichiers/conversations privés.
- Révocation et blocage : nouveaux accès privés refusés, carte interrompue.
- Remix : accord du créateur et chaîne de crédits inchangée après modification.
- Administration : modération publique sans accès aux données privées.
- Micro, enregistrement, lecture multimédia et studio sur ordinateur/téléphone.
- Sauvegardes, restauration et traitement des alertes de sécurité.

## Services et limites

Notifications et messagerie persistées dans MongoDB, rafraîchies périodiquement
(15–30 s), sans serveur mail ni push nécessaire pour cette version. Pas d’envoi
SMTP, de présence instantanée ou de notifications hors application. Les fichiers
sont stockés sur disque ; un stockage objet serait une évolution ultérieure.
La lecture audio et les droits sont testés automatiquement ; les interactions
navigateur et le rendu final nécessitent encore une validation visuelle autorisée.
Un fichier déjà téléchargé ne peut pas être retiré de l’appareil du destinataire.
