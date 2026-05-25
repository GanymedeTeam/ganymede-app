Ganymède

Il s'agit d'une application faisant guise d'add-on 100% CGU pour Dofus (jeu par Ankama Games). Il faut noter que cette application n'est pas liée à votre client Dofus, ce programme est à part et est à utiliser en complément de Dofus!

Les fonctionnalités
Avec Ganymède, vous pouvez :
Suivre des guides de progression rédigés par nos experts en PVM 😎 ou bien lire ceux de n'importe quel utilisateur, dont vous
Stocker des messages que vous souhaiteriez garder pour votre prochaine session (par exemple un message de recrutement de guilde), et le copier en un seul clic
Garder sous la main vos positions préférées (par exemple des endroits où le poisson 🐟  est frais, comme dans certains spots de pêche de Frigost ❄️ ), et pouvoir les copier facilement
Effectuer des chasses au trésor 🪙 avec l'overlay DofusDB par dessus votre jeu!


Technologies utilisées:

- Tauri
- Rust
- React
- Tailwind
- Shadcn
- TypeScript
- ViteJS
- @tanstack/{router,react-query}

Nous utilisons Tauri, un outil qui nous permet de créer une application desktop avec le langage Rust et une webview utilisans notre application React.

Le code React se trouve dans src/
Le code Rust se trouve dans src-tauri/

Les fichiers sont au format snake_case. Certains sont encore en kebab-case mais ceux-ci devraient être changés en snake_case.

```
/src
  /components  # Composants réutilisables
  /routes # ce sont les routes
  /routes/**/-*.tsx # ce sont des composants qui ne sont pas mappés sur des routes qui sont utilisés par la route elle-même adjacentes
  /hooks # hooks réutilisables
  /mutations # @tanstack/react-query mutations
  /queries # @tanstack/react-query queries au format queryOptions()
  /locales # translations au format .po utilisés par @lingui/react/macro
  /ipc # IPC layer de taurpc pour communiquer entre tauri et la webview React
  /assets # images ou fonts importées
  /main.tsx # entrypoint
  /routeTree.gen.ts # mapping des routes généré par le plugin vite de @tanstack/router
```

# Convention de nommage

Tous nos imports en TypeScript ont cette forme -> `@/dossier/fichier.son_extension` ce qui peut donner `@/queries/conf.query.ts` par exemple, mais peut-être `.tsx` si c'est un composant React.

Tous les fichiers sont au format snake_case.
Tous les composants React exportent des functions et non pas des arrow functions nommés en PascalCase.

# Important

Nous utilisons React 19.

Nous utilisons la toolchain OXC pour formater et linter notre code. La configuration du formatter se trouve dans `/.oxfmtrc.json`, celle du linter dans `/.oxlintrc.json`.

Pour démarrer l'application `pnpm tauri dev` en mode dev. Pour compiler l'application `pnpm tauri build`, s'il faut les infos de debug `pnpm tauri build --debug`.

Les builds de l'app se trouvent dans `/src-tauri/target/release/bundle/nsis`.
# Git

Nous utilisons le format de la team angular. `feat(subject)` par exemple. Le sujet doit être inclu. Si nécessaire au contexte, un fichier changeset pourrait être nécessaire pour expliquer le changelog, celui-ci est en français.

Le commit en lui-même est écrit en anglais.

`git add --all` doit être utilisé pour indexer les fichiers.

- Avant de commit, vérifier la branche courante et ne pas commit sur `main`. Les branches sont nommées de la façon suivante : `fix`, `feat`, `docs` etc, suivi du numéro de l'issue GitHub s'il en existe, suivi d'un mini sommaire. Par exemple `feat/50/new-summary-feature`. Ici l'issue est `50`. Dans ces cas là, ajouter la mention `Close #50` dans le message.

- La première ligne d'un message de commit doit éviter d'être très long.

- Il ne faut pas indiquer dans le message du commit qu'il modifie les traductions si d'autres changements que des traductions sont détectés.

- Ne pas utiliser `\n` dans le message, mais utiliser plusieurs fois `-m` s'il faut sauter une ligne pour le support du multi-ligne.

- Proposer s'il faut créer un fichier changeset dans le commit pour mettre à jour le changelog en utilisant `pnpm changeset`.

- Vérifier s'il y a des console.log et indiquer s'il faut les supprimer.

# Traductions

Les traductions utilisent le format .po

`msgid` est la clé, le texte en français d'origine
`msgstr` est le contenu, en français, il s'agit de la même valeur que la clé, dans les autres langues, ce texte est à traduire.

Seule exception est la première traduction qui est vide pour toutes les langues.

Aucune traduction ne doit être manquées avant un commit.

Pour savoir s'il en manque, effectuez `pnpm i18n:extract --clean` dans le terminal. Il y aura une mention `Missing`.

Si `#~` se trouve avant un `msgid` ou `msgstr`, il s'agit d'une vielle traduction. Il faut donc la supprimer.

L'espagnol et le portugais sont parlé en Europe.
