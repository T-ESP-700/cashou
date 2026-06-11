# Tuto — Déployer Cashou sur l'App Store (Expo / EAS)

> Tutoriel pas à pas adapté à **ce** projet (`apps/mobile`).
> Valeurs réelles du projet :
> - **Nom** : Cashou
> - **Bundle ID iOS** : `com.cashou.mobile`
> - **Notifications** : oui (`expo-notifications`) → capability *Push Notifications* requise
> - **Owner Expo actuel** : `soso7` (à remplacer par le tien)
> - **eas.json** : vide (à remplir)
>
> Tu as besoin de **deux comptes** : ton **compte Apple Developer** (déjà OK) et un **compte Expo** (à créer).

---

## Prérequis

- [ ] Un **Mac** (recommandé ; pas strictement obligatoire avec EAS, mais utile).
- [ ] **Node.js** installé.
- [ ] **eas-cli** installé :
  ```bash
  npm install -g eas-cli
  eas --version
  ```
- [ ] Ton **compte Apple Developer** actif (fait ✅).

---

## Étape 1 — Créer ton compte Expo et te connecter

1. Va sur **https://expo.dev** → *Sign Up*, crée ton compte (gratuit). Note bien ton **pseudo** (username) : il servira de `owner`.
2. Dans le terminal, à la racine du projet :
   ```bash
   eas login
   ```
   Connecte-toi avec ton nouveau compte.
3. Vérifie :
   ```bash
   eas whoami
   ```
   Ça doit afficher **ton** pseudo (pas `soso7`).

---

## Étape 2 — Détacher le projet de `soso7` et le relier à ton compte

> Rappel : changer `owner` à la main ne suffit pas — c'est le `projectId` qui fait foi. On le régénère.

1. Ouvre `apps/mobile/app.json`.
2. **Supprime** (ou remplace) la ligne :
   ```json
   "owner": "soso7",
   ```
3. **Supprime** l'identifiant de projet existant dans `extra` :
   ```json
   "eas": { "projectId": "b1c1daac-96e7-4097-8723-6fa1e7621615" }
   ```
   (tu peux retirer juste la valeur `projectId`).
4. Depuis `apps/mobile`, lance :
   ```bash
   cd apps/mobile
   eas init
   ```
   → Choisis **ton compte**, accepte la création d'un nouveau projet.
   → EAS réécrit automatiquement `owner` et un **nouveau** `projectId` dans `app.json`.
5. Vérifie que `app.json` contient bien ton pseudo et un nouveau `projectId`.

✅ À ce stade, le projet « appartient » à ton compte Expo.

---

## Étape 3 — Remplir `eas.json`

Le fichier `apps/mobile/eas.json` est vide. Remplis-le avec ce contenu de base :

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "TON_EMAIL_APPLE@exemple.com",
        "ascAppId": "À_REMPLIR_APRÈS_ÉTAPE_5",
        "appleTeamId": "MC599YHU6T"
      }
    }
  }
}
```

- **`appleId`** : l'e-mail de ton compte Apple Developer.
- **`appleTeamId`** : ton identifiant d'équipe Apple (vu sur tes captures : `MC599YHU6T` / « OXY Development » — à confirmer dans developer.apple.com → *Membership*).
- **`ascAppId`** : tu l'obtiendras à l'**étape 5** (c'est l'« Apple ID » numérique de l'app dans App Store Connect). Laisse le placeholder pour l'instant.

> Les 3 profils `development` / `preview` / `production` : le premier sert à tester sur ton tel, le dernier sert au build envoyé à Apple.

---

## Étape 4 — L'App ID côté Apple (Bundle ID)

Tu as deux possibilités, **choisis-en une** :

- **Option simple (recommandée)** : ne crée rien à la main. À l'étape 6, `eas build` **crée automatiquement** l'App ID `com.cashou.mobile`, les certificats et le profil de provisioning sur ton compte Apple.
- **Option manuelle** (l'écran où tu étais) : Apple Developer → *Identifiers* → **+** → *App IDs* → *App* →
  - **Description** : `Cashou`
  - **Bundle ID** : *Explicit* → `com.cashou.mobile`
  - **Capabilities** : coche **Push Notifications**
  - → *Register*.

⚠️ Dans les deux cas, le Bundle ID doit être **exactement** `com.cashou.mobile`.

---

## Étape 5 — Créer la fiche de l'app dans App Store Connect

1. Va sur **https://appstoreconnect.apple.com** → *My Apps* → **+** → *New App*.
2. Renseigne :
   - **Platform** : iOS
   - **Name** : `Cashou` (nom public, doit être unique sur l'App Store)
   - **Primary language** : Français
   - **Bundle ID** : sélectionne `com.cashou.mobile`
   - **SKU** : un code interne libre, ex. `cashou-001`
3. Crée l'app. Puis va dans **App Information** : tu y trouveras l'**Apple ID** de l'app (un numéro, ex. `6499999999`).
4. **Reporte ce numéro** dans `eas.json` → `ascAppId`.

---

## Étape 5 bis — Authentification Apple par clé API (recommandé, évite la 2FA)

> **Pourquoi cette étape ?** Si tu te connectes à Apple avec ton mot de passe, EAS doit
> passer la **double authentification (2FA)** par SMS. Or l'envoi du code échoue souvent
> (erreur *« Verification codes can't be sent to this phone number »*). La **clé API App
> Store Connect** remplace ce login : Apple l'accepte sans 2FA, une fois pour toutes.

### 1. Créer la clé (sur le web)
1. App Store Connect → **Users and Access** → onglet **Integrations** (section *App Store Connect API* / *Team Keys*).
2. Clique **+** (*Generate API Key*).
3. **Name** : `EAS`.
4. **Access / Role** : **Admin** ⚠️ indispensable — un rôle plus faible (*Developer*) ne pourra pas créer les certificats de distribution.
5. **Generate**.
6. **Télécharge le fichier `.p8`** ⚠️ *téléchargeable une seule fois* → range-le en lieu sûr (jamais dans Git).
7. Note les deux identifiants affichés sur la page :
   - le **Key ID** (sur la ligne de ta clé),
   - l'**Issuer ID** (en haut de la section, commun à toute l'équipe).

> Tu as donc 3 infos : le **fichier `.p8`**, le **Key ID**, l'**Issuer ID**.

### 2. Donner la clé à EAS
Depuis `apps/mobile` :
```bash
eas credentials
```
- choisis **iOS**,
- profil **production** (ou *all*),
- trouve l'entrée **App Store Connect API Key** → **Add new** (ou *Set up*),
- renseigne le **chemin du fichier `.p8`**, le **Key ID** et l'**Issuer ID**.

EAS stocke la clé **côté serveur** : tu n'auras pas à la redonner à chaque build.

### 3. (Sécurité) Ne versionne jamais la clé
Vérifie que le fichier `.p8` n'est pas suivi par Git. Au besoin, ajoute à `.gitignore` :
```
*.p8
```

---

## Étape 6 — Fabriquer le build de production

Depuis `apps/mobile` :

```bash
eas build --platform ios --profile production
```

- À la question *« Do you want to log in to your Apple account? »* → réponds **non** : EAS utilisera la **clé API** (étape 5 bis) pour générer les certificats, **sans 2FA**.
- Laisse EAS **gérer les certificats automatiquement** (réponds *yes* aux questions de credentials de signature).
- Le build se fait **dans le cloud** (≈ 10-20 min). À la fin, tu obtiens un fichier `.ipa` hébergé chez Expo.

> Si tu n'as pas fait l'étape 5 bis, EAS te proposera le login Apple classique (mot de passe + 2FA) — c'est là que l'erreur SMS apparaît. La clé API contourne tout ça.

---

## Étape 7 — Envoyer le build à Apple

```bash
eas submit --platform ios --profile production
```

- EAS prend le dernier build et l'**envoie à App Store Connect** (grâce aux infos `submit.ios` de `eas.json`).
- Après quelques minutes de traitement Apple, le build apparaît dans App Store Connect (onglet **TestFlight** puis disponible pour la version App Store).

---

## Étape 8 — Tester via TestFlight (recommandé)

1. Dans App Store Connect → onglet **TestFlight**.
2. Ajoute-toi comme testeur, installe l'app **TestFlight** sur ton iPhone, vérifie que tout marche en conditions réelles.
3. C'est l'occasion de détecter les crashs **avant** la review Apple.

---

## Étape 9 — Compléter la fiche et soumettre à la review

Dans App Store Connect, onglet de la **version 1.0** :

- [ ] **Captures d'écran** (obligatoire) : au minimum iPhone 6.7" et 6.5".
- [ ] **Description**, sous-titre, mots-clés, URL de support.
- [ ] **Catégorie** + **classification d'âge**.
- [ ] **App Privacy** : déclarer les données collectées (l'app a un backend avec authentification → sois précis et honnête).
- [ ] **Compte de test** : comme l'app a un écran de connexion, fournis des identifiants de démo à l'examinateur (champ *App Review Information*).
- [ ] Rattache le **build** (celui envoyé à l'étape 7).
- [ ] **Submit for Review**.

Délai habituel : **24-48 h**. Tu peux choisir une publication **automatique** ou **manuelle**.

---

## ⚠️ Points spécifiques à Cashou (éviter les rejets)

- **App financière/éducative** : précise bien dans la description que c'est une **simulation pédagogique**, pas un vrai service d'investissement réglementé. Apple est vigilant sur la finance.
- **Notifications** : capability *Push* bien activée (cf. étape 4) sinon les notifs ne marcheront pas en prod.
- **Privacy cohérente** : la déclaration App Privacy doit correspondre à ce que l'app collecte réellement via le backend.

---

## Récap express des commandes

```bash
# 1. Installer l'outil
npm install -g eas-cli

# 2. Se connecter à SON compte Expo
eas login
eas whoami

# 3. (après avoir vidé owner + projectId dans app.json)
cd apps/mobile
eas init

# 4. Enregistrer la clé API App Store Connect (évite la 2FA)
eas credentials

# 5. Fabriquer le build de prod (répondre NON au login Apple)
eas build --platform ios --profile production

# 6. L'envoyer à Apple
eas submit --platform ios --profile production
```

---

## Tableau « qui sert à quoi »

| Élément | Rôle |
|---|---|
| Compte **Apple Developer** | Autorise la publication sur l'App Store + certificats |
| Compte **Expo** (le tien) | Fabrique l'app dans le cloud (EAS Build) |
| `app.json` (`owner`, `projectId`) | Rattache le projet à ton compte Expo |
| `eas.json` | Configure la fabrication (`build`) et l'envoi (`submit`) |
| **App Store Connect** | Fiche commerciale, TestFlight, soumission à la review |
| Bundle ID `com.cashou.mobile` | Identité unique de l'app, partout identique |
