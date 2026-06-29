---
"ganymede-app": patch
---

Corrige le dialogue de notifications qui pouvait bloquer toute interaction : le bouton « Marquer comme lu » reste désormais toujours visible même quand la fenêtre est réduite (footer fixe, contenu scrollable). Le minuteur est fiabilisé pour toujours débloquer le bouton, et un message au format invalide n'empêche plus de fermer le dialogue. La barre de titre (déplacement, réduction, fermeture de la fenêtre) reste cliquable lorsqu'un dialogue est ouvert.
