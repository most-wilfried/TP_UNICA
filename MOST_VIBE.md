# MOST VIBE — livraison locale

MOST VIBE adapte le projet musical existant en réseau social musical. Les fichiers
existants restent sur leur emplacement initial, les comptes et projets sont
conservés et les nouveaux champs sont ajoutés aux schémas. Aucune migration
destructive, publication automatique d’une piste privée ou connexion à une base
réelle pour les tests n’a été effectuée.

## Ce qui est disponible

- Identité azur `#007FFF`, violet doux `#A99BEF`, fond `#F5FAFF`, cartes blanches
  et texte `#18324F`. Logo fourni dans `public/brand/most-vibe.png`, initiales MV,
  navigation verticale sur ordinateur et menu adaptable. Le mode clair est
  proposé par défaut ; un thème sombre reste disponible.
- Accueil et Explorer publics : fichiers récents, musiques, mixes/remixes, albums
  publics, recherche par titre, auteur, style, album et tags. Boucles originales
  MOST VIBE disponibles en sélection, sans faux profils de communauté.
- Lecteur persistant avec lecture audio, visualisation vidéo et images des formats
  pris en charge. Le studio conserve A/B, scratch, SYNC, Hot Cues, transposition,
  égaliseur, micro, enregistrement et téléchargement.
- Bibliothèque personnelle : import privé par défaut, genre persisté, tags,
  pochette HTTPS, autorisation de remix, publication publique ou destinataires
  sélectionnés. Les signatures et durées des médias sont lues côté serveur.
- Albums et playlists personnels, favoris persistants et likes. Une playlist
  personnelle reste privée ; un album public ne publie pas ses fichiers privés.
- Amis : recherche de profils, invitation, acceptation/refus, retrait et blocage.
  Activité des pistes et albums autorisés d’amis. Pas d’email public dans un profil.
- Messages entre amis : historique, non-lus, notification et sélection recherchable
  dans toute la bibliothèque du propriétaire, avec pochette, durée et préécoute. Les pistes privées
  ne deviennent pas publiques à l’envoi. Une révocation affiche « Partage interrompu ».
- Brouillons : sauvegarde et reprise des snapshots de studio ; partage avec des
  amis et révocation. Les sources gardent leurs propres permissions. Un mix final
  enregistré peut être importé dans la bibliothèque puis publié avec son audience.
- Crédits de remix : les sources du studio sont collectées lors de l’enregistrement,
  contrôlées par le serveur, puis créditées avec les contributeurs précédents.
  Aucun champ client ne peut retirer cette chaîne d’un remix référencé.
- Paramètres : profil, bio/avatar, recherche du profil, notifications, blocages et
  suppression du compte après vérification du mot de passe.
- Administration : utilisateurs/suspension, signalements et modération des seuls
  contenus publics. Pas d’accès administratif automatique aux données privées.

## Permissions et limites à connaître

Les droits sont vérifiés sur les routes API de métadonnées et de médias,
y compris les liens directs. Les fichiers ne sont jamais servis par un dossier
statique ouvert. Les anciens documents sans visibilité explicite restent privés.
Les ACL d’un fichier ne sont visibles que par son propriétaire.

Un destinataire doit être un ami non bloqué et conserver un accès explicite.
La révocation, le retrait d’amitié ou le blocage coupe les nouveaux accès privés.
Un fichier déjà reçu dans un navigateur ou téléchargé ne peut pas être repris
à distance. Une publication publique reste consultable anonymement : le blocage
ne retire pas une publication du domaine public.

La messagerie et les notifications sont rafraîchies périodiquement (15–30 s).
Pas de présence instantanée, de serveur SMTP ni de push hors application dans cette
version. La recherche/pagination est limitée pour contenir le coût des requêtes.
Les formats et codecs lisibles dépendent du navigateur. SVG/HTML ne sont pas des
formats d’import acceptés. Les images se visualisent, elles ne passent pas dans
les platines audio. Les uploads restent limités à 25 Mo.

Les règles de remix protègent les sources référencées dans l’application et leurs
crédits. Elles ne détectent pas automatiquement l’origine juridique d’un fichier
créé hors de MOST VIBE. Les pistes externes doivent être utilisées avec les droits
appropriés. Les remixes issus du studio conservent automatiquement leurs sources.

## Vérifications

- Build Angular réussi ; **42 tests frontend réussis (13 fichiers)**. Découverte
  publique, reprise de favoris/remixes après connexion, permission de remix
  revérifiée et suppression du média précédent après un accès refusé.
  Deux avertissements CommonJS restent liés à Butterchurn et ses presets.
- **16 tests backend réussis** : HTTP avec trois comptes et une vraie base MongoDB isolée via
  mongodb-memory-server : défaut privé, recherche/lecture publique, permissions
  propriétaires, amis/messages, révocation, blocage, remixes/crédits, favoris,
  albums, notifications, projets, administration, fichiers déguisés et suppression.
- Audits npm : zéro vulnérabilité connue frontend et backend au contrôle de cette
  livraison ; ce résultat est daté, pas une garantie permanente ou exhaustive.
- Docker Compose : validation syntaxique avec variables fictives, sans lancement
  de déploiement ni accès à vos secrets.
- Contrastes contrôlés pour texte/fond et boutons ; un azur un peu plus foncé
  (`#0066CC`) est utilisé pour les petits textes blancs des boutons afin de respecter
  le contraste. Le bleu principal d’identité reste `#007FFF`.
- **Validation visuelle non effectuée** : l’ouverture de la prévisualisation
  locale a été refusée par la sécurité du navigateur. Aucun contournement n’a été
  tenté. Le rendu desktop/mobile, la vidéo et le micro physique restent à vérifier
  dans un navigateur dont l’accès est autorisé.

## Démarrer et préparer la mise en ligne

Voir [deployment/README.md](deployment/README.md). Deux terminaux sont nécessaires :
backend connecté à MongoDB, puis frontend Angular. Vos secrets `.env` ne sont pas
modifiés. Le premier administrateur est attribué par un outil opérateur sécurisé,
jamais via l’inscription ou les paramètres du client.

Les comptes utilisés dans les tests et la base éphémère ne sont pas des comptes
livrés en production. Les tests ne lisent pas votre URI MongoDB ni vos mots de passe.
Le site n’est **pas publié**. Domaine, HTTPS, origine CORS, secret JWT robuste,
stockage persistant, sauvegardes et validation réelle de déploiement restent à configurer.
