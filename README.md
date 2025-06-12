# 📘 Documentation du module xcraft-contrib-peon

## Aperçu

Le module `xcraft-contrib-peon` est un système de workers backend pour l'écosystème Xcraft. Il fournit une infrastructure permettant d'exécuter diverses tâches de construction, de configuration et de déploiement de paquets logiciels. Son nom "peon" fait référence à un travailleur qui exécute des tâches spécifiques dans le contexte de la gestion de paquets et de la compilation.

## Sommaire

- [Structure du module](#structure-du-module)
- [Fonctionnement global](#fonctionnement-global)
- [Exemples d'utilisation](#exemples-dutilisation)
- [Interactions avec d'autres modules](#interactions-avec-dautres-modules)
- [Variables d'environnement](#variables-denvironnement)
- [Détails des sources](#détails-des-sources)

## Structure du module

Le module est organisé en plusieurs parties clés :

- **Backends** : Implémentations spécifiques pour différents types de tâches (bin, src)
- **Lib** : Bibliothèques utilitaires et fonctions de base
- **Outils d'interprétation** : Pour exécuter des scripts et des commandes
- **Utilitaires de gestion de chemins** : Pour manipuler les fichiers et répertoires

Le module expose différents backends qui peuvent être utilisés pour diverses tâches comme la compilation, la configuration, la copie de fichiers, etc.

## Fonctionnement global

Le module `xcraft-contrib-peon` agit comme un orchestrateur de tâches qui :

1. **Récupère des ressources** : Télécharge ou clone des fichiers depuis différentes sources (HTTP, FTP, Git, fichiers locaux)
2. **Met en cache** : Utilise un système de cache basé sur les hashes SHA256 pour éviter les téléchargements répétés
3. **Prépare l'environnement** : Configure les variables d'environnement et les placeholders
4. **Exécute des actions** : Compile, configure, déplace ou copie des fichiers selon le backend utilisé
5. **Applique des correctifs** : Corrige les chemins d'exécution (rpath) pour les bibliothèques dynamiques
6. **Déploie les résultats** : Installe les fichiers dans les emplacements cibles

Le module utilise un système de "backends" pour supporter différents types d'opérations. Chaque backend est spécialisé dans un type de tâche particulier et peut être appelé selon trois modes :

- `onlyInstall` : Pour les paquets binaires (installation uniquement)
- `onlyBuild` : Pour les paquets source (compilation uniquement)
- `always` : Pour les opérations qui s'exécutent dans tous les cas

## Exemples d'utilisation

Notez bien que le peon n'est pas destiné à être utilisé en dehors du module [xcraft-contrib-pacman].

### Téléchargement et configuration d'un paquet binaire

```javascript
const xPeon = require('xcraft-contrib-peon');

// Utilisation du backend bin/configure
await xPeon.bin.configure(
  {
    uri: 'https://example.com/package.tar.gz',
    out: 'package.tar.gz',
    $hash: 'sha256hash.tar.gz', // Hash optionnel pour la vérification
  },
  '/path/to/root',
  '/path/to/share',
  {
    env: process.env,
    args: {
      all: ['--prefix=/usr/local', '--enable-feature'],
    },
    distribution: 'ubuntu',
  },
  resp
);
```

### Compilation d'un paquet source avec Make

```javascript
// Utilisation du backend src/make
await xPeon.src.make(
  {
    uri: 'https://github.com/example/project.git',
    ref: 'main',
  },
  '/path/to/root',
  '/path/to/share',
  {
    env: {
      CC: 'gcc',
      CFLAGS: '-O2',
    },
    args: {
      all: ['-j4'],
      install: ['install', 'DESTDIR=/tmp/staging'],
    },
    configure: './configure --prefix=/usr',
    location: 'src',
  },
  resp
);
```

### Copie simple de fichiers

```javascript
// Utilisation du backend bin/copy
await xPeon.bin.copy(
  {
    uri: 'file:///local/path/to/files',
  },
  '/destination/path',
  '/path/to/share',
  {
    onlyPackaging: true,
  },
  resp
);
```

## Interactions avec d'autres modules

`xcraft-contrib-peon` interagit avec plusieurs autres modules de l'écosystème Xcraft :

- **[xcraft-core-fs]** : Pour les opérations sur le système de fichiers
- **[xcraft-core-extract]** : Pour extraire des archives (zip, tar, etc.)
- **[xcraft-core-process]** : Pour exécuter des processus externes
- **[xcraft-core-subst]** : Pour la substitution et le montage temporaire
- **[xcraft-core-scm]** : Pour les opérations de gestion de code source (Git)
- **[xcraft-contrib-pacman]** : Pour la gestion des paquets et des dépendances
- **[xcraft-core-platform]** : Pour la détection de la plateforme et de l'architecture
- **[xcraft-core-placeholder]** : Pour la gestion des variables d'environnement et placeholders
- **[xcraft-core-http]** : Pour les téléchargements HTTP/HTTPS
- **[xcraft-core-ftp]** : Pour les téléchargements FTP

## Variables d'environnement

| Variable            | Description                                                                     | Exemple                                     | Valeur par défaut |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------- | ----------------- |
| `PEON_DEBUG_PKG`    | Nom du paquet à déboguer (arrête l'exécution pour permettre le débogage manuel) | `PEON_DEBUG_PKG=mypackage`                  | -                 |
| `PEON_NORPATH`      | Désactive la correction automatique des chemins rpath                           | `PEON_NORPATH=1`                            | -                 |
| `PEON_UNIX_PATH`    | Force l'utilisation des chemins de style UNIX                                   | `PEON_UNIX_PATH=1`                          | -                 |
| `XCRAFT_CONFIG`     | Configuration JSON pour le bus Xcraft                                           | `XCRAFT_CONFIG='{"xcraft-core-bus":{...}}'` | -                 |
| `XCRAFT_TARGETROOT` | Répertoire racine pour les installations                                        | `/opt/xcraft`                               | -                 |

## Détails des sources

### `index.js`

Ce fichier est le point d'entrée du module. Il charge dynamiquement tous les backends disponibles dans le répertoire `backends` et les expose sous forme d'objet structuré. Les backends sont organisés par type (bin, src) et par commande, avec support pour les sous-types.

### `lib/base.js`

Fournit les fonctions de base pour les backends avec trois modes d'exécution :

- **`onlyInstall(proceedCb, getObj, root, share, extra, resp)`** — Exécute uniquement l'étape d'installation pour les paquets binaires. Utilisé par pacman.install.
- **`onlyBuild(proceedCb, getObj, root, share, extra, resp)`** — Exécute uniquement l'étape de compilation pour les paquets source. Utilisé par pacman.build et déclenché par wpkg->CMake.
- **`always(proceedCb, getObj, root, share, extra, resp)`** — Exécute à la fois l'installation et l'empaquetage selon le contexte.

Ces fonctions gèrent le cycle de vie complet d'une opération, incluant la préparation, l'exécution des tests, le déploiement et le nettoyage.

### `lib/interpreter.js`

Fournit un interpréteur pour exécuter des scripts dans un environnement contrôlé. Il supporte deux modes :

- **`sh`** : Exécute des commandes shell avec support pour différents shells (bash, cmd, etc.)
- **`vm`** : Exécute du code JavaScript dans une machine virtuelle avec accès aux commandes Xcraft

L'interpréteur détecte automatiquement le type de script basé sur la présence du préfixe `!` pour les commandes shell.

#### Méthodes publiques

- **`run(script, env, resp, callback)`** — Exécute un script en détectant automatiquement le type (shell ou VM) selon la présence du préfixe `!`.

### `lib/utils.js`

Contient des utilitaires essentiels pour :

- **Téléchargement de ressources** : Support pour HTTP, HTTPS, FTP, Git et fichiers locaux
- **Système de cache** : Cache basé sur SHA256 pour éviter les téléchargements répétés
- **Extraction d'archives** : Support automatique pour zip, tar, tar.gz, etc.
- **Correction rpath** : Correction automatique des chemins d'exécution pour Linux et macOS
- **Renommage WPKG** : Renommage des fichiers pour la compatibilité avec WPKG
- **Génération de scripts de débogage** : Création de scripts d'environnement pour le débogage

#### Méthodes publiques principales

- **`prepare(from, getObj, basePath, share, extra, resp)`** — Prépare l'environnement complet pour l'exécution d'un backend
- **`fileFromUri(getObj, share, dlOnly, resp)`** — Télécharge et extrait des ressources depuis une URI
- **`rpathFixup(prefix, resp, targetRoot)`** — Corrige les chemins rpath pour les bibliothèques dynamiques
- **`renameForWpkg(root)`** — Renomme les fichiers pour la compatibilité WPKG
- **`typeFromUri(getObj)`** — Détermine le type de protocole depuis une URI (git, http, ftp, file)
- **`cleanUri(getObj)`** — Nettoie une URI en supprimant les préfixes spéciaux comme ssh+
- **`rpathFixupDir(prefix, libDir, binDir, resp, targetRoot)`** — Corrige les chemins rpath pour des répertoires spécifiques

### `lib/cmds/cmds.js`

Expose des commandes utilitaires pour les scripts VM, incluant :

- **Opérations fichiers** : `cd`, `mv`, `cp`, `rm`, `ln`, `mkdir`, `chmod`
- **Archives** : `unzip` pour l'extraction
- **Modification de texte** : `sed` et `batch.sed` pour les modifications en lot
- **Exécution** : `exec` pour lancer des programmes externes
- **Communication** : `cmd` pour exécuter des commandes Xcraft via le bus
- **Bibliothèques** : `rpath` pour corriger les chemins d'exécution
- **Variables** : `exp` pour exporter des variables d'environnement
- **Listing** : `lsall` pour lister récursivement les fichiers

#### Méthodes publiques

- **`cd(dir)`** — Change le répertoire de travail courant
- **`mv(src, dst, regex)`** — Déplace des fichiers ou répertoires avec support pour les expressions régulières
- **`cp(src, dst, regex)`** — Copie des fichiers ou répertoires avec support pour les expressions régulières
- **`rm(location)`** — Supprime des fichiers ou répertoires
- **`ln(target, location)`** — Crée un lien symbolique
- **`mkdir(location)`** — Crée un répertoire
- **`chmod(location, mode)`** — Modifie les permissions d'un fichier
- **`unzip(src, dst)`** — Extrait une archive ZIP
- **`sed(location, regex, newValue)`** — Remplace du texte dans un fichier
- **`batch.sed(location, regex, newValue)`** — Applique sed récursivement sur tous les fichiers d'un répertoire
- **`cmd(busClient)(cmd, data)`** — Exécute une commande Xcraft via le bus
- **`rpath(prefix, libDir, binDir)`** — Corrige les chemins rpath pour des répertoires spécifiques
- **`exec(resp)(...args)`** — Exécute un programme externe avec gestion cross-platform
- **`exp(key, value)`** — Exporte une variable d'environnement
- **`lsall(location, followSymlink, filter)`** — Liste récursivement les fichiers avec filtrage optionnel

### Backends bin/

#### `backends/bin/configure.js`

Backend pour configurer des paquets binaires. Exécute les arguments `all` comme script de configuration dans l'environnement cible. Utilise le helper `injectPh` pour injecter les placeholders spécifiques à la distribution.

#### `backends/bin/copy.js`

Backend pour copier des fichiers ou répertoires vers une destination cible. Préserve la structure des répertoires et gère les fichiers individuels.

#### `backends/bin/exec.js`

Backend pour exécuter des programmes binaires avec des arguments spécifiques. Support pour les codes de retour personnalisés via la syntaxe `<=code1;code2`. Utilise `xcraft-core-subst` pour le montage temporaire.

#### `backends/bin/meta.js`

Backend pour gérer des méta-paquets (paquets qui ne contiennent pas de fichiers mais dépendent d'autres paquets).

#### `backends/bin/move.js`

Backend pour déplacer des fichiers ou répertoires vers une destination cible. Similaire à copy mais supprime la source.

### Backends src/

#### `backends/src/make.js`

Backend pour compiler des paquets source en utilisant le système de build Make. Exécute séquentiellement `make all` puis `make install` avec gestion des flags CFLAGS et LDFLAGS. Utilise `wrapTmp` pour créer un environnement de build temporaire.

#### `backends/src/msbuild-core.js` et `backends/src/msbuild-full.js`

Backends pour compiler des projets .NET :

- **msbuild-core** : Utilise `dotnet build` pour .NET Core
- **msbuild-full** : Utilise `msbuild` ou `xbuild` pour .NET Framework

#### `backends/src/script.js`

Backend pour exécuter des scripts personnalisés lors de la compilation. Exécute séquentiellement les arguments `all` puis `install` comme scripts. Utilise `wrapTmp` pour l'isolation de l'environnement de build.

### Tests

#### `backends/src/test/vstest.js`

Backend pour exécuter des tests unitaires .NET avec VSTest Console. Prend le premier argument comme fichier de test et passe les autres comme options.

#### `backends/src/test/xunit.js`

Backend pour exécuter des tests xUnit avec des options par défaut (`-parallel none -verbose`).

### `lib/backends/src/msbuild.js`

Module partagé pour les backends MSBuild, configurable pour .NET Core ou .NET Framework. Gère automatiquement la détection des outils disponibles et supporte les parsers spécialisés pour MSBuild.

## Fonctionnalités avancées

### Système de cache intelligent

Le module utilise un système de cache basé sur les hashes SHA256 qui :

- Évite les téléchargements répétés
- Vérifie l'intégrité des fichiers
- Support pour les mirrors de téléchargement avec fallback automatique
- Gestion des tentatives multiples en cas d'échec (jusqu'à 10 tentatives avec délai progressif)

### Correction automatique des chemins d'exécution

Le module inclut des fonctionnalités avancées pour corriger les chemins d'exécution des bibliothèques dynamiques :

- **Linux** : Utilise `patchelf` pour modifier les chemins RPATH avec support pour `$ORIGIN`
- **macOS** : Utilise `install_name_tool` pour modifier les ID et références avec support pour `@rpath`
- **Détection automatique** : Évite les binaires Go qui ne sont pas compatibles avec patchelf

### Gestion des environnements de débogage

Le module génère automatiquement des scripts d'environnement de débogage :

- Scripts shell (`.sh`) et batch (`.cmd`) avec toutes les variables d'environnement
- Informations complètes sur les commandes de configuration et compilation
- Payload YAML avec tous les paramètres du paquet

### Support multi-plateforme et multi-source

- **Sources** : HTTP/HTTPS, FTP, Git, fichiers locaux
- **Plateformes** : Windows, Linux, macOS avec adaptations spécifiques
- **Formats d'archives** : Support automatique pour zip, tar, tar.gz, tar.bz2, etc.
- **Systèmes de build** : Make, MSBuild, dotnet, scripts personnalisés

### Gestion des placeholders

Le module utilise un système sophistiqué de placeholders qui permet d'injecter dynamiquement des variables d'environnement et des chemins spécifiques à la plateforme :

- **Chemins Xcraft** : `XCRAFT.ROOT`, `XCRAFT.HOME`
- **Chemins POSIX** : Versions POSIX des chemins pour compatibilité cross-platform
- **Informations système** : `OS.NAME`, `OS.ARCH`, `CPUS.COUNT`
- **Répertoires de build** : `WPKG.STAG`, `ROOTDIR`, `PROD.ROOTDIR`

### Renommage intelligent pour WPKG

Le module inclut une fonctionnalité de renommage automatique pour assurer la compatibilité avec WPKG :

- Conversion des liens symboliques en fichiers texte
- Remplacement des caractères interdits sous Windows
- Gestion des noms de fichiers réservés
- Résolution des conflits de noms (insensible à la casse)

_Cette documentation a été mise à jour automatiquement._

[xcraft-core-fs]: https://github.com/Xcraft-Inc/xcraft-core-fs
[xcraft-core-extract]: https://github.com/Xcraft-Inc/xcraft-core-extract
[xcraft-core-process]: https://github.com/Xcraft-Inc/xcraft-core-process
[xcraft-core-subst]: https://github.com/Xcraft-Inc/xcraft-core-subst
[xcraft-core-scm]: https://github.com/Xcraft-Inc/xcraft-core-scm
[xcraft-contrib-pacman]: https://github.com/Xcraft-Inc/xcraft-contrib-pacman
[xcraft-core-platform]: https://github.com/Xcraft-Inc/xcraft-core-platform
[xcraft-core-placeholder]: https://github.com/Xcraft-Inc/xcraft-core-placeholder
[xcraft-core-http]: https://github.com/Xcraft-Inc/xcraft-core-http
[xcraft-core-ftp]: https://github.com/Xcraft-Inc/xcraft-core-ftp