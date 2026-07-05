---
"ganymede-app": patch
---

Correction de la mise à jour automatique qui restait bloquée sur « l'application va redémarrer » sans rien faire (surtout macOS). Les erreurs de téléchargement/installation sont désormais remontées au lieu de faire paniquer l'app en silence, et un lien de téléchargement manuel (selon l'OS) est proposé en cas d'échec.

Sur macOS, un avertissement prévient désormais lorsque l'application n'est pas lancée depuis le dossier Applications (ex. Downloads ou emplacement en lecture seule via App Translocation), ce qui empêche les mises à jour automatiques de s'appliquer.
