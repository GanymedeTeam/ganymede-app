# ganymede-app

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
