# ganymede-app

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
