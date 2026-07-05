---
"ganymede-app": patch
---

Correction de la mise à jour automatique qui restait bloquée sur « l'application va redémarrer » sans rien faire (surtout macOS). Les erreurs de téléchargement/installation sont désormais remontées au lieu de faire paniquer l'app en silence, et un lien de téléchargement manuel (selon l'OS) est proposé en cas d'échec.
