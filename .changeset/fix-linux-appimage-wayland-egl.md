---
"ganymede-app": patch
---

Sur Linux : correction de la fenêtre vide au lancement de l'AppImage sous Wayland (erreur `EGL_BAD_PARAMETER` causée par la libwayland-client embarquée, incompatible avec le Mesa de l'hôte).
