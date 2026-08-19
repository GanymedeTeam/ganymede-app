---
"ganymede-app": patch
---

Correction de la perte des cases cochées au redémarrage lorsque la synchronisation est activée. Une progression modifiée localement est désormais marquée comme non synchronisée : elle n'est plus écrasée par la copie du serveur au démarrage, et elle est envoyée au serveur lors de la synchronisation suivante, même si l'application a été fermée avant l'envoi.
