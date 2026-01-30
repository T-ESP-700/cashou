# Rapport d'Analyse - Protection des Données et Conformité Réglementaire

## Projet Cashou - Plateforme d'Éducation Financière Gamifiée

**Date d'analyse:** 15 janvier 2026
**Version:** 1.0

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Cartographie des données personnelles](#2-cartographie-des-données-personnelles)
3. [Réglementations applicables](#3-réglementations-applicables)
4. [Analyse RGPD](#4-analyse-rgpd)
5. [Recommandations techniques](#5-recommandations-techniques)
6. [Plan d'action de mise en conformité](#6-plan-daction-de-mise-en-conformité)
7. [Annexes](#7-annexes)

---

## 1. Résumé exécutif

### 1.1 Contexte

Cashou est une application mobile d'éducation financière gamifiée permettant aux utilisateurs de simuler des investissements et d'apprendre la gestion financière via des quiz et des simulations de marché.

### 1.2 Périmètre de l'analyse

- **Application mobile** (React Native/Expo)
- **Backend API** (Bun + tRPC + Better-Auth)
- **Backoffice administratif** (React + Supabase Auth)
- **Bases de données** PostgreSQL (app + backoffice)

### 1.3 Enjeux critiques identifiés

| Priorité | Enjeu | Impact |
|----------|-------|--------|
| 🔴 Haute | Absence de politique de confidentialité | Non-conformité RGPD |
| 🔴 Haute | Gestion du consentement non implémentée | Violation Art. 7 RGPD |
| 🟠 Moyenne | Données de session (IP, User-Agent) | Justification requise |
| 🟠 Moyenne | Notifications push (Expo token) | Consentement explicite requis |
| 🟡 Basse | Durée de conservation non définie | Documentation requise |

---

## 2. Cartographie des données personnelles

### 2.1 Données collectées - Application principale

#### Données d'identification

| Donnée | Table | Obligatoire | Sensibilité |
|--------|-------|-------------|-------------|
| Email | `user.email` | Oui | Élevée |
| Nom | `user.name` | Non | Moyenne |
| Username | `user.username` | Non | Basse |
| Discriminator | `user.discriminator` | Non | Basse |
| Image de profil | `user.image` | Non | Moyenne |

#### Données d'authentification

| Donnée | Table | Finalité | Durée suggérée |
|--------|-------|----------|----------------|
| Mot de passe (hashé) | `account.password` | Authentification | Durée du compte |
| Access Token | `account.accessToken` | OAuth | Jusqu'à expiration |
| Refresh Token | `account.refreshToken` | OAuth | Jusqu'à expiration |
| Token de session | `session.token` | Session active | 7 jours (configurable) |

#### Données techniques (sensibles)

| Donnée | Table | Finalité déclarée | Justification RGPD |
|--------|-------|-------------------|-------------------|
| Adresse IP | `session.ipAddress` | Sécurité/Audit | Intérêt légitime (à documenter) |
| User-Agent | `session.userAgent` | Sécurité/Audit | Intérêt légitime (à documenter) |
| Expo Push Token | `user.expoPushToken` | Notifications | Consentement requis |

#### Données comportementales et de progression

| Donnée | Table | Finalité | Conservation |
|--------|-------|----------|--------------|
| Points | `user.points` | Gamification | Durée du compte |
| Niveau | `user.levelId` | Progression | Durée du compte |
| Streak (série) | `user.currentStreak`, `maxStreak` | Gamification | Durée du compte |
| Dernière activité | `user.lastActivity` | Analytique | À définir |
| Badges | `user.badges` | Gamification | Durée du compte |

#### Données de jeu et transactions (simulées)

| Table | Données | Volume potentiel |
|-------|---------|------------------|
| `game_instances` | Historique des parties | Élevé |
| `transactions` | Transactions simulées | Très élevé |
| `wallets` | Portefeuilles virtuels | Moyen |
| `holdings` | Positions détenues | Moyen |

#### Données éducatives

| Table | Données | Sensibilité |
|-------|---------|-------------|
| `user_quiz` | Participation aux quiz | Basse |
| `user_answers` | Réponses aux questions | Moyenne (profilage possible) |
| `notifications` | Historique des notifications | Basse |

### 2.2 Données collectées - Backoffice

| Donnée | Table | Utilisateurs concernés |
|--------|-------|----------------------|
| Email | `User.email` | Administrateurs |
| Mot de passe | `User.password` | Administrateurs |
| Nom | `User.name` | Administrateurs |
| Rôles | `UserRole` | Administrateurs |

---

## 3. Réglementations applicables

### 3.1 RGPD (Règlement Général sur la Protection des Données)

**Applicable si:**
- Utilisateurs dans l'Union Européenne
- Traitement de données de résidents UE

**Articles clés:**

| Article | Sujet | Statut Cashou |
|---------|-------|---------------|
| Art. 5 | Principes de traitement | ⚠️ À documenter |
| Art. 6 | Base légale | ⚠️ À définir |
| Art. 7 | Conditions du consentement | ❌ Non implémenté |
| Art. 12-14 | Information des personnes | ❌ Politique absente |
| Art. 15-22 | Droits des personnes | ⚠️ Partiellement |
| Art. 25 | Privacy by Design | ⚠️ À améliorer |
| Art. 30 | Registre des traitements | ❌ Non créé |
| Art. 32 | Sécurité du traitement | ✅ Partiel (JWT, hash) |
| Art. 33-34 | Notification de violation | ❌ Procédure absente |
| Art. 35 | Analyse d'impact (AIPD) | ⚠️ Potentiellement requis |

### 3.2 Loi Informatique et Libertés (France)

**Obligations spécifiques françaises:**
- Déclaration CNIL si nécessaire
- Délégué à la Protection des Données (DPO) si critères atteints
- Hébergement des données de santé (non applicable ici)

### 3.3 ePrivacy / Directive Cookie

**Applicable pour:**
- Stockage local (`AsyncStorage`, `SecureStore`)
- Tokens d'authentification
- Notifications push

### 3.4 Réglementations financières

**Attention particulière:**
Bien que Cashou soit une simulation éducative et non un service financier réel, certaines précautions s'imposent:

| Réglementation | Applicabilité | Action |
|----------------|---------------|--------|
| DSP2 | ❌ Non (simulation) | Mentionner clairement le caractère fictif |
| MiFID II | ❌ Non (éducation) | Disclaimer requis |
| AMF | ⚠️ Attention | Éviter toute confusion avec conseil financier |

**Recommandation:** Ajouter des disclaimers explicites indiquant que l'application ne fournit pas de conseil financier réel.

### 3.5 Protection des mineurs

**Si l'application cible des mineurs (<16 ans en France):**
- Consentement parental obligatoire (Art. 8 RGPD)
- Interface de vérification d'âge
- Traitement restreint des données

---

## 4. Analyse RGPD détaillée

### 4.1 Bases légales des traitements

| Traitement | Base légale recommandée | Justification |
|------------|------------------------|---------------|
| Création de compte | Exécution du contrat (Art. 6.1.b) | Nécessaire au service |
| Authentification | Exécution du contrat | Accès sécurisé |
| Progression de jeu | Exécution du contrat | Cœur du service |
| Quiz et réponses | Exécution du contrat | Fonctionnalité principale |
| Notifications push | Consentement (Art. 6.1.a) | Opt-in requis |
| IP/User-Agent | Intérêt légitime (Art. 6.1.f) | Sécurité (documenter) |
| Analytics/Métriques | Consentement ou intérêt légitime | Selon granularité |

### 4.2 Principes de traitement (Art. 5)

#### Licéité, loyauté, transparence
- **Statut:** ⚠️ À améliorer
- **Action:** Créer une politique de confidentialité claire

#### Limitation des finalités
- **Statut:** ⚠️ À documenter
- **Action:** Définir explicitement chaque finalité

#### Minimisation des données
- **Analyse des champs:**
  - `user.discriminator` : Finalité à clarifier
  - `session.ipAddress` : Nécessaire pour sécurité?
  - `session.userAgent` : Nécessaire pour sécurité?

#### Exactitude
- **Statut:** ✅ OK (données saisies par l'utilisateur)
- **Action:** Permettre la modification du profil

#### Limitation de conservation
- **Statut:** ❌ Non défini
- **Action requise:** Définir des durées de conservation

| Type de données | Durée recommandée |
|-----------------|-------------------|
| Compte actif | Durée d'utilisation + 3 ans |
| Sessions expirées | 30 jours après expiration |
| Transactions de jeu | Durée de la partie + 1 an |
| Logs de sécurité | 1 an (obligation légale) |
| Compte supprimé | Anonymisation immédiate |

#### Intégrité et confidentialité
- **Statut:** ✅ Partiel
- **Points positifs:**
  - Mots de passe hashés (Better-Auth)
  - Tokens JWT signés
  - HTTPS recommandé en production

### 4.3 Droits des personnes concernées

| Droit | Article | Implémentation Cashou | Priorité |
|-------|---------|----------------------|----------|
| Information | Art. 13-14 | ❌ Aucune | 🔴 Haute |
| Accès | Art. 15 | ⚠️ Via API (non documenté) | 🔴 Haute |
| Rectification | Art. 16 | ⚠️ `user.updateProfile` | 🟠 Moyenne |
| Effacement | Art. 17 | ❌ Non implémenté | 🔴 Haute |
| Limitation | Art. 18 | ❌ Non implémenté | 🟡 Basse |
| Portabilité | Art. 20 | ❌ Non implémenté | 🟠 Moyenne |
| Opposition | Art. 21 | ❌ Non implémenté | 🟠 Moyenne |

---

## 5. Recommandations techniques

### 5.1 Authentification et sécurité

#### Améliorations recommandées

```
✅ Déjà en place:
- Hash des mots de passe (Better-Auth)
- Tokens JWT avec expiration
- Sessions en base de données

⚠️ À améliorer:
- Rotation des tokens
- Rate limiting sur l'authentification
- 2FA optionnel
- Politique de mots de passe robustes

❌ À implémenter:
- Audit log des connexions
- Détection des connexions suspectes
- Notifications de nouvelle connexion
```

### 5.2 Gestion du consentement

**Architecture recommandée:**

```prisma
// À ajouter au schema.prisma

model UserConsent {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  type      ConsentType
  granted   Boolean
  grantedAt DateTime?
  revokedAt DateTime?
  version   String   // Version des CGU/politique
  ipAddress String?  // Pour preuve
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_consents")
}

enum ConsentType {
  TERMS_OF_SERVICE
  PRIVACY_POLICY
  PUSH_NOTIFICATIONS
  ANALYTICS
  MARKETING
}
```

### 5.3 Droit à l'effacement

**Implémentation recommandée:**

1. **Suppression complète** - Pour les données non nécessaires légalement
2. **Anonymisation** - Pour les données statistiques à conserver
3. **Cascade de suppression** - Déjà configurée (`onDelete: Cascade`)

```typescript
// Exemple de service de suppression
async function deleteUserData(userId: string) {
  // 1. Anonymiser les données de jeu (stats agrégées)
  await anonymizeGameData(userId);

  // 2. Supprimer les données personnelles
  await prisma.user.delete({ where: { id: userId } });
  // Cascade: sessions, accounts, notifications, etc.

  // 3. Logger la suppression (obligation légale)
  await logDeletionRequest(userId);
}
```

### 5.4 Droit à la portabilité

**Format recommandé:** JSON structuré

```typescript
interface UserDataExport {
  exportDate: string;
  user: {
    email: string;
    name: string;
    createdAt: string;
  };
  gameProgress: {
    level: number;
    points: number;
    badges: string[];
  };
  quizHistory: Array<{
    quizId: number;
    completedAt: string;
    score: number;
  }>;
  transactions: Array<{
    date: string;
    type: string;
    asset: string;
    amount: number;
  }>;
}
```

### 5.5 Notifications push

**Gestion conforme:**

1. **Consentement explicite** avant activation
2. **Option de désactivation** accessible
3. **Stockage sécurisé** du token Expo
4. **Suppression** du token lors du retrait du consentement

---

## 6. Plan d'action de mise en conformité

### 6.1 Actions immédiates (0-30 jours)

| # | Action | Responsable | Livrable |
|---|--------|-------------|----------|
| 1 | Rédiger la politique de confidentialité | Juridique | Document `.md` + écran app |
| 2 | Créer les CGU | Juridique | Document + acceptation |
| 3 | Implémenter l'écran de consentement | Dev Mobile | PR code |
| 4 | Ajouter les disclaimers financiers | Juridique | Textes dans l'app |
| 5 | Documenter les finalités de traitement | DPO/Tech | Registre interne |

### 6.2 Actions à court terme (30-90 jours)

| # | Action | Responsable | Livrable |
|---|--------|-------------|----------|
| 6 | Implémenter la suppression de compte | Dev Backend | API + UI |
| 7 | Créer l'export des données (portabilité) | Dev Backend | API endpoint |
| 8 | Définir les durées de conservation | DPO | Politique + CRON jobs |
| 9 | Mettre en place le registre des traitements | DPO | Document Art. 30 |
| 10 | Sécuriser les notifications (opt-in) | Dev Mobile | Écran paramètres |

### 6.3 Actions à moyen terme (90-180 jours)

| # | Action | Responsable | Livrable |
|---|--------|-------------|----------|
| 11 | Audit de sécurité | Externe | Rapport |
| 12 | Tests de pénétration | Externe | Rapport |
| 13 | Formation RGPD équipe | DPO | Sessions |
| 14 | Procédure de violation de données | DPO | Document procédure |
| 15 | Analyse d'impact (AIPD) si nécessaire | DPO | Document AIPD |

### 6.4 Maintenance continue

- Revue trimestrielle des consentements
- Mise à jour annuelle de la politique
- Audit annuel de conformité
- Formation continue de l'équipe

---

## 7. Annexes

### 7.1 Glossaire

| Terme | Définition |
|-------|------------|
| **RGPD** | Règlement Général sur la Protection des Données (UE 2016/679) |
| **DPO** | Délégué à la Protection des Données |
| **AIPD** | Analyse d'Impact relative à la Protection des Données |
| **Données personnelles** | Toute information permettant d'identifier une personne |
| **Traitement** | Toute opération sur des données personnelles |
| **Responsable de traitement** | Entité déterminant les finalités et moyens du traitement |

### 7.2 Modèle de registre des traitements (Art. 30)

```yaml
traitement:
  nom: "Gestion des comptes utilisateurs"
  finalite: "Permettre l'accès à l'application Cashou"
  base_legale: "Exécution du contrat"
  categories_personnes: "Utilisateurs de l'application"
  categories_donnees:
    - "Données d'identification (email, nom)"
    - "Données d'authentification (hash mot de passe)"
    - "Données de connexion (IP, User-Agent)"
  destinataires:
    - "Équipe technique Cashou"
    - "Hébergeur (à préciser)"
  transferts_hors_ue: "Non / À documenter si hébergement cloud"
  duree_conservation: "Durée du compte + 3 ans"
  mesures_securite:
    - "Chiffrement des mots de passe"
    - "HTTPS obligatoire"
    - "Tokens JWT signés"
```

### 7.3 Template de politique de confidentialité

**Structure recommandée:**

1. Identité du responsable de traitement
2. Données collectées et finalités
3. Base légale de chaque traitement
4. Durée de conservation
5. Destinataires des données
6. Transferts hors UE (le cas échéant)
7. Droits des utilisateurs
8. Contact DPO
9. Réclamation auprès de la CNIL
10. Cookies et traceurs
11. Modifications de la politique

### 7.4 Checklist de conformité

```
PRÉ-LANCEMENT:
[ ] Politique de confidentialité publiée
[ ] CGU publiées et acceptées
[ ] Écran de consentement implémenté
[ ] Disclaimers financiers visibles
[ ] HTTPS activé en production

POST-LANCEMENT:
[ ] Registre des traitements créé
[ ] Procédure de suppression de compte
[ ] Export des données disponible
[ ] Durées de conservation implémentées
[ ] Procédure de notification de violation

MAINTENANCE:
[ ] Revue trimestrielle
[ ] Mise à jour annuelle des documents
[ ] Formation de l'équipe
[ ] Audit de sécurité
```

---

## Conclusion

Le projet Cashou collecte et traite des données personnelles qui le soumettent au RGPD et aux réglementations françaises sur la protection des données.

**Points positifs:**
- Architecture technique moderne avec authentification sécurisée
- Cascade de suppression configurée dans le schéma
- Séparation des bases de données (app/backoffice)

**Points d'amélioration prioritaires:**
1. Créer et publier la politique de confidentialité
2. Implémenter le système de consentement
3. Ajouter les fonctionnalités de suppression et export
4. Documenter les durées de conservation

La mise en conformité complète nécessite un effort coordonné entre les équipes juridiques, techniques et produit, avec un suivi régulier pour maintenir la conformité dans le temps.

---

*Document généré le 15 janvier 2026*
*À réviser lors de toute modification significative du traitement des données*
