# Système de Theming

Documentation du système de theming Tailwind CSS v4 pour Ganymede.

## Tokens de Couleur Disponibles

### Surfaces

| Token | Valeur | Usage |
|-------|--------|-------|
| `surface-page` | `#1D2730` | Background principal des pages |
| `surface-card` | `#21303C` | Cards, inputs, barres de tabs |
| `surface-inset` | `#3E4650` | Éléments enfoncés (progress bar bg) |

### Bordures

| Token | Valeur | Usage |
|-------|--------|-------|
| `border-muted` | `#3a4a5a` | Bordures subtiles |
| `border-inset` | `#121F2A` | Bordures d'éléments enfoncés |

### Sémantiques

| Token | Valeur | Usage |
|-------|--------|-------|
| `success` | `#6ABC65` | Progress, validations |

### Accent (Gold)

| Token | Valeur | Usage |
|-------|--------|-------|
| `accent-light` | `#fceaa8` | Début gradient gold |
| `accent` | `#e7c272` | Couleur accent principale |
| `accent-dark` | `#D7B363` | Fin gradient gold |

---

## Utilisation avec Tailwind

### Classes de base
```tsx
<div className="bg-surface-card border-border-muted">
```

### Avec opacité
```tsx
<div className="bg-surface-page/80">  // 80% opacité
<div className="bg-accent/50">        // 50% opacité
```

### Gradients
```tsx
<div className="bg-gradient-to-r from-accent-light via-accent to-accent-dark">
```

### États (hover, focus, etc.)
```tsx
<div className="bg-surface-card hover:bg-surface-card/90">
```

---

## Implémentation Future : Multi-Thèmes

### Architecture

1. **CSS** : Définir les variantes de thème
   ```css
   @layer base {
     [data-theme="dark"] {
       --color-surface-page: #1D2730;
       /* ... */
     }
     
     [data-theme="light"] {
       --color-surface-page: #f5f5f5;
       /* ... */
     }
   }
   ```

2. **Config App** : Stocker la préférence utilisateur
   ```typescript
   // Dans Conf (ipc/bindings.ts)
   theme: "dark" | "light" | "system"
   ```

3. **Hook React** : Changer de thème dynamiquement
   ```typescript
   // hooks/use_theme.ts
   export function useTheme() {
     const conf = useSuspenseQuery(confQuery);
     const setConf = useSetConf();
     
     const setTheme = (theme: "dark" | "light") => {
       document.documentElement.dataset.theme = theme;
       setConf.mutate({ ...conf.data, theme });
     };
     
     return { theme: conf.data.theme, setTheme };
   }
   ```

4. **Initialisation** : Appliquer au démarrage
   ```typescript
   // Dans App.tsx ou layout
   useEffect(() => {
     document.documentElement.dataset.theme = conf.data.theme;
   }, [conf.data.theme]);
   ```

### Créer un nouveau thème

1. Ajouter les variables dans `main.css` sous `[data-theme="nom"]`
2. Ajouter l'option dans le type TypeScript
3. Ajouter l'UI de sélection dans les settings
