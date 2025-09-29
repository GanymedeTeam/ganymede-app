# ganymede-app

## 1.14.4

### Patch Changes

- 44c9561: La fonctionnalité de Report ne devrait plus crash.
- 6e893c5: Correction de l'affichage du texte d'attente de connexion à Ganymède sur petite fenêtre.

## 1.14.3

### Patch Changes

- d3d2c0b: Mise à jour du CLIENT_ID

## 1.14.2

### Patch Changes

- c285461: Fix au niveau du déploiement automatique

## 1.14.1

### Patch Changes

- c6abb47: Améliorations diverses
- f6b4c28: L'Almanax devrait toujours renvoyer le bon objet désormais.

## 1.14.0

### Minor Changes

- e7db4df: Meilleure gestion des erreurs et de leur affichage.
- 2cdfd99: Possibilité de se connecter sur l'app (les fonctionnalités liées à la connexion arrivera plus tard).
- 216b259: Possibilité d'ouvrir les derniers guides à l'ouverture de l'app automatiquement.
- 5a0b6a5: Ajout d'une petite alerte lorsque qu'une mise à jour des guides est disponible
- 216b259: Nouveau design des paramètres.
- 9333d09: Modification visuelle de la page de sélection de la catégorie de guide à télécharger.

### Patch Changes

- 5c68aad: Correction de la modal de report bug quand l'app était en très petit.
- 2886c67: Correction de l'affichage de long liens.
- 6af8dab: Correction d'alignement des onglets de guide quand la fenêtre est plus grande.
- 95ccaa8: Possibilité de déplacer la fenêtre si une notification est affichée.

## 1.13.1

### Patch Changes

- 7428077: Correction d'une erreur sur les anciennes versions de macOS concernant les notifications internes.

## 1.13.0

### Minor Changes

- ec3698b: Ajout d'un système de notifications interne.
- ec3698b: Une alerte apparait désormais à la suppression d'un profil en cas de mauvaise manip.
- 99a5174: Ajout d'une fonctionnalité pour pouvoir ouvrir l'application avec un bouton à travers le site web. Par exemple : ouvrir ce guide sur l'application. Cette fonctionnalité sera implémentée sur le site web ultérieurement.

## 1.12.3

### Patch Changes

- 54b4037: Il est désormais re-possible de report un problème dans un guide (un bug UI l'empêchait)
- 54b4037: Correction de la pagination dans la page téléchargement de guides.

## 1.12.2

### Patch Changes

- 7d9265d: Changement de nom de domaine à cause de certains blocages de FAI/serveur DNS.

## 1.12.1

### Patch Changes

- 5741d8f: Correction de certaines traductions.

## 1.12.0

### Minor Changes

- dc5a887: Possibilité via Alt+clic d'ouvrir les quêtes sur Dofus pour les noobs. Implémenté par @maner\_

## 1.11.4

### Patch Changes

- 5b7e6a6: Il est désormais possible de sélectionner du texte dans un guide. Par exemple, pouvoir copier le nom d'un zaap.

## 1.11.3

### Patch Changes

- 4a08129: L'application ne crashera plus si elle n'a pas pu vérifier les mises à jour.
- f4e2f6e: Petite correction lors de la copie de l'étape courante via le raccourci clavier.

## 1.11.2

### Patch Changes

- 9098298: Ajout d'un récap de votre report et une mention pour bien mettre à jour votre guide avant de report.
- 9098298: L'ordre des guides est corrigé.

## 1.11.1

### Patch Changes

- 609efed: Ajout d'un récap de votre report et une mention pour bien mettre à jour votre guide avant de report.

## 1.11.0

### Minor Changes

- 859ac39: Vous pouvez désormais supprimer des guides ou des dossiers directement dans l'application sans passer par l'Explorer Windows ou le Finder macOS.
- 33e343d: Les blocs de quête indiquent désormais si une quête commence, se poursuit ou se termine.
- efe17d7: Ajout d'un bouton en haut de la liste de vos guides pour tous les mettre à jour d'un seul coup.
- fa3222f: L’onglet actif a désormais un style différent, plus conforme à ce qu’il aurait dû être dès le départ.
- a552347: Un bouton pour nous soutenir a été ajouté.
- f62a471: Un nouveau bouton fait son apparition en bas de la liste de vos guides pour vous aider à trouver d'autres guides.
- fa3222f: Ajout d'un sommaire dans les guides, indiquant l'emplacement des quêtes et vous permettant de reprendre ou de commencer un guide, même si certaines quêtes ont déjà été entamées.

### Patch Changes

- 124dc9e: Ajout d'un raccourci clavier permettant de copier l'étape actuelle du guide affiché (CTRL + MAJ + C ou CMD + MAJ + C sur macOS). Ce raccourci ne fonctionne pas si une autre application écoute déjà sur ce raccourci avant le lancement de Ganymède (Chrome pourrait bloquer).
- 859ac39: Ajout d'un lien dans l'application pour nous soutenir via Ko-fi.
- 859ac39: Correction de problèmes supplémentaires concernants les positions, entraînant la disparition de certains caractères dans le contenu des guides.
- 651a8b1: Certains textes pouvaient disparaître après certaines positions dans le texte d'un guide
- a17e5d6: L'historique infini avec le lien vers les paramètres est corrigé.

## 1.10.0

### Minor Changes

- 553ad4b: Ajout du support de Linux via AppImage (merci à la communauté !)
- f1a4c65: Vous pouvez désormais faire un rapport de bug dans un guide. Utilisez-le pour nous retourner des problèmes au niveau des guides : par exemple, pour un mauvais PNJ, une mauvaise position.

### Patch Changes

- e2ca425: Si vous supprimiez un guide que vous aviez ouvert dans un onglet, vous pouviez avoir l'erreur "Guide with id xx not found". Ceci est corrigé. Merci @Wedge, et @LeVin's
- e1d7b92: Correction du problème de perte de progression à la fermeture d'un onglet de guide.
- 250f6a6: Certains blocs de quête étaient partiellement masqués en raison de la longueur excessive de certains noms de quêtes.
- d408393: Lorsqu'une erreur survient, l'application devrait donner plus d'infos sur la cause de l'erreur au lieu de ne rien afficher.

## 1.9.0

### Minor Changes

- f407a28: Ajout d'une nouvelle fonctionnalité pour l'écriture de guides, vous pouvez désormais ajouter des blocs de texte faisant référence à des quêtes pour aider les joueurs.
- f407a28: Vous pouvez désormais copier le nom de la ressource d'Almanax.
- 6112b6c: Vous pouvez désormais ouvrir plusieurs guides simultanément sous forme d'onglets.

## 1.8.1

### Patch Changes

- e334294: Petite amélioration au niveau des fuseaux horaires pour l'Almanax.
- 1c9443d: Le curseur de souris change bien au passage de la souris sur les positions.
- 1c9443d: La couleur de toutes les positions ont été figées sur du jaune.

## 1.8.0

### Minor Changes

- e571d7c: L'Almanax prend désormais en charge les différents fuseaux horaires de votre système. Les serveurs étant tous basés sur le fuseau horaire Europe/Paris, l'application prend donc également cette direction.
- 526f1b2: Vous pouvez désormais visualiser l'Almanax sur plusieurs jours. L'affichage de l'Almanax a légèrement changé.
- 526f1b2: Vous pouvez désormais choisir votre niveau lors du calcul des récompenses de l'Almanax.
- 85b47bd: Vous pouvez désormais annuler votre recherche de guide via la touche Échap.
- 85b47bd: Mise à jour de notre système d'affichage graphique de l'application, si vous observez des problèmes, n'hésitez pas à nous les retourner.

### Patch Changes

- 33b2a78: Un problème persistait concernant les positions, entraînant la disparition de certains caractères spéciaux dans le contenu des guides. Ce problème est corrigé.

## 1.7.1

### Patch Changes

- baebac2: Avec la version 1.7.0, les utilisateurs de macOS ne pouvaient plus mettre à jour l'application. Ceci est corrigé.

## 1.7.0

### Minor Changes

- f8a1041: Ajout du nombre de j'aime dans la liste des guides téléchargeables.
- 2f9c007: Ajout du nombre de téléchargements d'un guide dans la liste des guides téléchargeables.
- 8016a9a: Le système de dossiers refait surface.

  Organisez vos guides via des dossiers que vous retrouverez dans l'application. Actuellement, la gestion des dossiers se fait uniquement via l'Explorer Windows/Finder macOS.

- 50b715e: Ajout de plus d'informations lorsqu'une mise à jour est disponible. Cela s'affichera uniquement lors de la prochaine mise à jour.

### Patch Changes

- 63494c6: Quand vous aviez terminé un guide et que celui-ci recevait une mise à jour réduisant son nombre d'étapes, vous ne pouviez plus le consulter. Ceci est corrigé.
- 986195f: Les liens vers DofusDB (carte et chasses) utilisent la langue de l'application au lieu du français.
- 6526987: Avec la suppression de l'italien sur DofusDB (du fait que Dofus 3 ne gère plus l'italien), l'Almanax ne chargeait plus. Ceci est corrigé.
- 8495fb7: Certains liens étaient marqués masqués par erreur. Ceci est désormais corrigé.
- 986195f: Les liens vers les monstres, quêtes, donjons, objets utilisent la langue du guide au lieu du français.
- 8016a9a: Plus de logs devraient permettre un meilleur support.

## 1.6.0

### Minor Changes

- d54f2a9: Ajout d'un système de fichier de log permettant un meilleur support.

## 1.5.0

### Minor Changes

- 1ae14e2: Un guide tutoriel a été créé. Celui-ci expliquera comment utiliser l'application et ces différentes fonctionnalités. Il sera téléchargé automatiquement au premier lancement de l'application. Ce changement n'est pas rétroactif, même si utilisez déjà Ganymède, la prochaine fois que vous lancerez l'application, ce guide sera téléchargé.

### Patch Changes

- cb1b5bd: Certaines redirections vers un autre guide pouvaient rediriger vers la première étape, faisant perdre la progression potentielle. Ceci est désormais corrigé.
- 79fa816: La liste des liens autorisés dans un guide a été mise à jour. Tout lien détecté comme non valide sera transformé en "lien masqué".

## 1.4.0

### Minor Changes

- b67279a: Le changement d'étape du guide via le champ de texte se fait maintenant lorsque vous cliquez en dehors du champ (perte de focus).
- a572942: Vous pouvez désormais ouvrir la carte de DofusDB à travers Ganymède.
- cce3185: Vous avez désormais la possibilité de supprimer un profil directement dans l'application.
- 1c6bff0: Ajout d'un bouton pour revenir à la page précédente dans la page des paramètres. Si vous étiez en train de suivre un guide, et que vous vouliez revenir sur celui-ci après être passé par les paramètres, le nouveau bouton permet de revenir sur ce guide.

### Patch Changes

- 86e7e17: Les guides sont désormais organisés par numéro de GP. Il est nécessaire de les retélécharger.
- b97ee3f: Certaines erreurs sont désormais plus explicite pour un meilleur support.
- da2c709: La position d'une étape dans un guide affichait [0,0] lorsque celle-ci ne concernait pas une carte.
- a572942: La copie de la commande d'autopilotage sur DofusDB a été corrigée.

## 1.3.2

### Patch Changes

- 06cb6ff: L'opacité rendait l'application blanche au lieu d'ajouter de la transparence. Ceci est désormais corrigé.
- ab31143: Les liens vers d'autres étapes d'un guide renvoyaient toujours à la première étape. Ceci est désormais corrigé.
- ab31143: Lorsqu'il y avait plusieurs positions dans un paragraphe, seul la dernière position était cliquable. Ceci est désormais corrigé et toutes les positions devraient être cliquables.
