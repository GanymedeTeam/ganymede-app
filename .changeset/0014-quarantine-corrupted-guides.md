---
"ganymede-app": patch
---

Les guides corrompus ne sont plus supprimés automatiquement mais mis en quarantaine (renommés avec le suffixe `.corrupted`) et ignorés au chargement. Un toast persistant les signale avec une action pour les supprimer définitivement.
