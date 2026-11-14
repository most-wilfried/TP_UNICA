# Contrôle ciblé de sécurité — 14 octobre 2026

> **Mise à jour MOST VIBE :** la nouvelle demande autorise les évolutions backend. Les vulnérabilités npm signalées ci-dessous dans l’état historique ont été corrigées. L’audit courant indique zéro vulnérabilité connue des deux côtés ; les nouveaux contrôles serveur sont décrits dans [MOST_VIBE.md](MOST_VIBE.md). La validation visuelle reste bloquée par le refus d’accès du navigateur.

Ce contrôle porte sur les évolutions du studio, du lecteur, des styles et des
sauvegardes. Il ne constitue pas un audit exhaustif ni une garantie de sécurité.

## Corrections frontend

- JWT envoyé uniquement à `/api/` sur l'origine courante, jamais aux WAV,
  au processeur AudioWorklet ou à un domaine tiers. Les routes publiques
  d'authentification et de santé sont identifiées par leur chemin.
- Identifiants audio encodés dans les URL ; restauration de pistes par ID
  validé, sans reprendre d'URL arbitraire provenant d'un snapshot.
- Valeurs restaurées bornées : BPM, vitesse, volume, transposition, EQ,
  position et Hot Cues. Les genres acceptés appartiennent à la liste connue.
- Cache de styles isolé par compte ; migration des anciennes préférences
  vers le compte actif. L'identifiant décodé du JWT sert uniquement au cache,
  jamais à autoriser une opération serveur.
- Aucun JWT, secret, flux micro ou fichier d'enregistrement dans les snapshots.
- Micro activé seulement par action explicite et autorisation navigateur ;
  périphérique arrêté lors de la désactivation et du démontage du composant.
- Restauration d'un mix sans démarrage automatique de la lecture, du micro
  ou de l'enregistrement.
- Textes de titres/noms affichés par les interpolations Angular ; aucun
  `innerHTML` ni contournement de sanitization ajouté.
- Dépendances frontend mises à jour, dont Angular 22.2.2. L'installation du
  verrou final a rapporté **0 vulnérabilité npm connue**. Les paquets restent
  à surveiller : cet état peut évoluer avec les nouveaux avis de sécurité.

## Points backend constatés, non corrigés dans cette mission

Les consignes `frontend-starter/AGENTS.md` interdisent de modifier `backend/`.
Son audit npm en lecture seule a signalé **2 vulnérabilités** : une modérée
sur `multer` et une critique sur `proxy-addr`. Les correctifs sont annoncés
comme disponibles par npm. Le backend n'a pas été modifié ; une mission de
mise à jour et de validation de l'API reste nécessaire avant un déploiement.

La lecture du code confirme une vérification JWT, des contrôles de propriété
pour les pistes et les modifications de projets, le hachage des mots de passe,
et une limite de taille d'upload. Points à renforcer : liste d'origines CORS,
limitation des tentatives d'authentification, validation stricte du corps des
projets (dont `settings.effects`) et contrôle du contenu réel des fichiers,
au-delà du type MIME déclaré.

Le JWT demeure dans localStorage, comme avant cette mission : une faille XSS
pourrait donc l'exposer. Une politique CSP et une stratégie d'authentification
appropriée à un déploiement de production doivent être étudiées séparément.

## Validation et portée

Tests automatisés sur l'intercepteur, l'isolation des styles, les snapshots,
le traitement audio et les ressources micro/enregistrement. Contrôles
navigateur avec une API locale simulée : ils valident le frontend, pas la
persistance réelle MongoDB ni l'autorisation de comptes réels. Le micro physique,
la qualité sonore perçue et les droits de projets entre plusieurs comptes réels
restent à vérifier en environnement intégré.
