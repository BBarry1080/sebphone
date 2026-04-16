# SebPhone — Setup sur nouveau PC

## Prérequis

- [Node.js 18+](https://nodejs.org) — vérifier avec `node -v`
- [Git](https://git-scm.com) (si le projet est sur GitHub)
- [VS Code](https://code.visualstudio.com) (recommandé)

---

## Installation

### 1. Copier le projet

Copiez le dossier `SebPhone` sur le nouveau PC,
ou clonez depuis GitHub si le repo est en ligne :

```bash
git clone https://github.com/VOTRE_USER/sebphone.git
cd sebphone
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Créer le fichier .env.local

Créez un fichier `.env.local` à la racine du projet :

```
VITE_SUPABASE_URL=https://VOTRE_PROJET.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Où trouver ces clés :
> Supabase → votre projet → Settings → API → Project URL & anon/public key

### 4. Lancer le projet

```bash
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173)

---

## Mode mock (sans Supabase)

Si `.env.local` est absent ou que les clés sont invalides,
le site fonctionne en **mode mock** avec 12 téléphones de démonstration.
Un avertissement apparaît dans la console.

---

## Back-office admin

- URL : [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
- Email : `admin@sebphone.be`
- Mot de passe : défini dans Supabase Auth → Users

> Le back-office nécessite Supabase configuré.

---

## Scripts disponibles

| Commande         | Description                        |
|------------------|------------------------------------|
| `npm run dev`    | Démarrer en développement          |
| `npm run build`  | Build de production (dossier dist) |
| `npm run preview`| Prévisualiser le build             |

---

## Notes importantes

- `.env.local` n'est **pas** dans git (protégé par `.gitignore`)
- Recréez-le sur chaque nouveau PC
- `.env.example` montre la structure attendue (commitable)
