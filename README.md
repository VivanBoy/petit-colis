# 📦 Petit Colis Doux

> Prépare une petite boîte virtuelle pleine d'attentions et envoie-la à quelqu'un avec un simple lien.

**🔗 Site en ligne : [petitcolis.netlify.app](https://petitcolis.netlify.app)**

On remplit la boîte (un mot, une photo, une chanson, un vocal, un dessin…), on la ferme, et on obtient un lien court comme `petitcolis.netlify.app/c/k7x2p9m`. La personne qui le reçoit ouvre le colis et découvre son contenu.

<!-- Ajoute une capture ou un GIF de la boîte qui s'ouvre :
![Aperçu de Petit Colis Doux](docs/apercu.gif)
-->

---

## ✨ Fonctionnalités

**10 types de contenu à glisser dans la boîte :**

- 📝 **Note** : un mot écrit à la main
- 📷 **Photo** avec légende, affichée en polaroïd
- 🎵 **Chanson** : lecteur Spotify ou YouTube intégré
- 🎬 **Vidéo** : fichier (25 Mo max.) ou lien YouTube
- 🎁 **Cadeau** : nom, petit mot et lien optionnel
- 🎙️ **Message vocal** : enregistré au micro (2 min max.) ou fichier audio
- 🎨 **Dessin** à main levée, 6 couleurs
- 📍 **Lieu** avec carte Google Maps
- 🎟️ **Coupon** « Bon pour… »
- 📰 **Nouvelle** façon journal

**Et aussi :**

- **12 petites attentions** à ajouter en quantité (thé chaud, fleurs, câlin, chocolat…)
- **Lien court** de 7 caractères pour partager le colis
- **Ouverture animée** de la boîte côté destinataire
- **Connexion sans mot de passe** : on entre son email et on reçoit un code à 6 chiffres. Un compte est nécessaire pour **envoyer** un colis, pas pour en **ouvrir** un.
- **Mes colis envoyés** : la liste suit ton compte sur tous tes appareils, avec le suivi d'ouverture (ouvert ♥ ou pas encore) et la possibilité de supprimer un colis
- **Responsive** et **mode sombre** automatique
- Bouton **☕ Soutenir** optionnel (Ko-fi, Buy Me a Coffee…)

## 🛠️ Technologies

- **HTML, CSS et JavaScript** (modules ES), sans framework, sans `npm install`, sans build
- **[Supabase](https://supabase.com)** : base de données PostgreSQL et stockage des fichiers
- **[Netlify](https://www.netlify.com)** : hébergement statique
- **Coût : 0 $** (offres gratuites)

## 🔒 Sécurité

- La table `packages` est **fermée en accès direct** (Row Level Security et `revoke all`).
- Tout passe par des fonctions SQL :
  - `get_package` et `mark_opened` (ouvrir un colis) : ouvertes à tous, mais il faut le **code exact**. **Personne ne peut lister les colis.**
  - `create_package`, `my_packages` et `delete_package` : réservées aux **comptes connectés**, et chacun ne voit et ne supprime que **ses propres colis**.
- Maximum **50 colis par jour** et par compte, pour limiter les abus.
- Fichiers : seulement pour les comptes connectés, chacun dans **son propre dossier**, **25 Mo** max., images, audio ou vidéo uniquement.
- La clé dans `config.js` est la clé **publishable / anon**, faite pour être publique. La clé `service_role` / `sb_secret_…` et le mot de passe de la base ne doivent **jamais** être mis dans ce projet.

## 📁 Structure du projet

| Fichier | Rôle |
|---|---|
| `index.html` | Une seule page pour créer **et** ouvrir un colis |
| `style.css` | Le design |
| `app.js` | La logique : création, envoi des fichiers, ouverture du colis |
| `config.js` | L'adresse et la clé du projet Supabase, et le lien Soutenir |
| `supabase/schema.sql` | Le script de la base de données |
| `supabase/auth.sql` | Les comptes : à lancer après `schema.sql` |
| `_redirects` | Netlify : fait marcher les liens `/c/CODE` |
| `vercel.json` | Pareil, si tu héberges sur Vercel |

---

## 🚀 Installer ton propre Petit Colis

### 1. Créer la base de données (Supabase)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Va dans **SQL Editor → New query**, colle tout le contenu de `supabase/schema.sql` et clique **Run**.
   Tu dois voir « Success. No rows returned ».
3. Fais pareil avec `supabase/auth.sql` (dans une nouvelle requête).
4. Va dans **Project Settings → API Keys** et copie la **Project URL** et la **publishable key** (`sb_publishable_…`). L'ancienne clé **anon** (`eyJ…`) marche aussi.
5. Colle-les dans `config.js` :

```js
export const SUPABASE_URL = "https://ton-projet.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_...";
export const SUPPORT_URL = ""; // optionnel : ton lien Ko-fi, sinon le bouton est caché
```

### 2. Configurer la connexion par code

**a) Mettre le code dans les emails.** Par défaut, Supabase envoie un lien, pas un code.
Va dans **Authentication → Emails → Templates** et modifie **Magic Link** et **Confirm signup** :

- **Subject** : `Ton code Petit Colis Doux`
- **Body** :

```html
<h2>Ton code Petit Colis Doux</h2>
<p>Voici ton code de connexion :</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Ce code expire bientôt. Si tu n'as rien demandé, ignore ce courriel.</p>
```

**b) Envoyer les emails avec ton Gmail (gratuit).** Le service d'email intégré de Supabase n'envoie que quelques emails par heure : c'est fait pour les tests.
1. Active la **validation en 2 étapes** sur ton compte Google.
2. Va sur **myaccount.google.com/apppasswords**, crée un mot de passe d'application (« Petit Colis ») et copie les 16 caractères.
3. Dans Supabase : **Authentication → Emails → SMTP Settings** → *Enable custom SMTP* :
   - Sender email : ton adresse Gmail · Sender name : `Petit Colis Doux`
   - Host : `smtp.gmail.com` · Port : `465`
   - Username : ton adresse Gmail · Password : le mot de passe d'application
4. **Authentication → Rate Limits** : monte la limite d'emails par heure (par exemple 30).

> Gmail permet environ 500 emails par jour. Si les codes arrivent dans les indésirables, c'est normal au début. Plus tard, un nom de domaine avec un service comme Resend améliorera la livraison.

**c) L'adresse du site.** **Authentication → URL Configuration** → *Site URL* : l'adresse de ton site Netlify.

### 3. Tester en local

1. Ouvre le dossier dans VS Code et installe l'extension **Live Server**.
2. Clic droit sur `index.html` → **Open with Live Server**.
3. En local, le lien d'un colis ressemble à `http://127.0.0.1:5500/?c=k7x2p9m`. Il ne marche que sur ton ordinateur : pour le partager, mets le site en ligne.

> Le micro (message vocal) marche en local (`127.0.0.1`) et en ligne (`https`), mais pas si tu ouvres le fichier en double-cliquant dessus.

### 4. Mettre en ligne (Netlify)

*Add new site → Import an existing project → GitHub* → choisis ce dépôt.
Laisse la **Build command** vide, et mets `.` comme **Publish directory**.

À chaque `git push`, le site se met à jour automatiquement.

> Vérifie que le site est **public** : *Site configuration → Access & security*, sans mot de passe. Sinon, les destinataires devront se connecter pour ouvrir leur colis.

---

## ⚙️ Comment ça marche

1. Les photos, dessins, vocaux et vidéos sont envoyés tout de suite dans **Supabase Storage** (bucket `colis-media`).
2. Quand tu fermes la boîte, le colis est enregistré dans la table `packages` avec un **code court** unique.
3. Le lien `/c/CODE` ouvre la même page, qui charge le colis à partir de ce code.
4. À la première ouverture, la date est enregistrée (`opened_at`).

## ⚠️ Limites de l'offre gratuite

- **Supabase** : environ 500 Mo de base de données et 1 Go de fichiers. Pour les longues vidéos, préfère un lien YouTube.
- Un projet Supabase gratuit **se met en pause après environ une semaine d'inactivité**. Il suffit alors de cliquer **Restore project** sur supabase.com.
- Les limites exactes peuvent changer : consulte les pages de prix de Supabase et Netlify.

## 🗺️ Idées pour la suite

- [ ] Date d'ouverture programmée (« à ouvrir le 14 février »)
- [ ] Thèmes de fêtes (Saint-Valentin, anniversaire, Noël)
- [x] Comptes par email + code (Supabase Auth)
- [ ] Connexion par numéro de téléphone (SMS, payant)
- [ ] Nom de domaine personnalisé

---

Fait avec ♥ par [VivanBoy](https://github.com/VivanBoy)