# Plan de Mise en Conformité Réglementaire - Cashou

**Version:** 1.0
**Date:** 30 janvier 2026
**Statut:** En attente de validation
**Contrat gouvernemental en jeu:** OUI - Aucune non-conformité tolérée

---

## Avertissement Préliminaire

> **Ce document est CRITIQUE.** Chaque élément listé ci-dessous représente une obligation légale dont le non-respect expose Cashou à :
> - Des amendes pouvant atteindre **20M€ ou 4% du CA mondial** (RGPD)
> - Des amendes pouvant atteindre **35M€ ou 7% du CA mondial** (AI Act)
> - Des sanctions pénales personnelles pour les dirigeants (LCEN : 1 an + 75 000€)
> - La **perte du contrat gouvernemental** pour non-conformité réglementaire
>
> **Aucun raccourci. Aucune exception. Aucun "on verra plus tard".**

---

## Table des Matières

1. [Synthèse des Réglementations Applicables](#1-synthèse-des-réglementations-applicables)
2. [Décisions Stratégiques Validées](#2-décisions-stratégiques-validées)
3. [PHASE 1 : Application Sans Chatbot](#3-phase-1--application-sans-chatbot)
   - 3.1 Politique de Confidentialité
   - 3.2 CGU
   - 3.3 Disclaimers Financiers (AMF)
   - 3.4 Mentions Légales (LCEN)
   - 3.5 Système de Consentement
   - 3.6 Transferts Hors UE (Expo)
   - 3.7 Protection des Mineurs
   - 3.8 Droits des Personnes (RGPD Art. 15-22 + Data Act)
   - 3.9 Durées de Conservation
   - 3.10 Registre des Traitements
   - 3.11 Sécurité des Données
   - 3.12 Procédure Notification Violation
   - **3.13 Synthèse Globale Phase 1**
   - **3.14 Checklist Phase 1**
4. [PHASE 2 : Intégration du Chatbot IA](#4-phase-2--intégration-du-chatbot-ia)
   - 4.1 Classification AI Act
   - 4.2 Obligations de Transparence
   - 4.3 Filtres Anti-Conseil Financier (AMF/ACPR)
   - 4.4 Disclaimer Permanent Chatbot
   - 4.5 Documentation Technique IA
   - 4.6 Mécanisme de Feedback
   - 4.7 Journalisation des Conversations
   - 4.8 Obligation AI Literacy
   - **4.9 Synthèse Globale Phase 2**
   - **4.10 Checklist Phase 2**
5. [Matrice de Traçabilité Réglementaire](#5-matrice-de-traçabilité-réglementaire)
6. [Bibliographie et Sources Officielles](#6-bibliographie-et-sources-officielles)

---

## 1. Synthèse des Réglementations Applicables

### 1.1 Vue d'ensemble

| # | Réglementation | Applicable | Priorité | Phase | Sections |
|---|----------------|------------|----------|-------|----------|
| 1 | **RGPD** (UE 2016/679) | ✅ OUI | 🔴 CRITIQUE | 1+2 | 3.1, 3.5-3.12, 4.5, 4.7 |
| 2 | **LIL** (Loi Informatique et Libertés) | ✅ OUI | 🔴 CRITIQUE | 1 | 3.5, 3.7 |
| 3 | **ePrivacy** (Directive 2002/58/CE) | ✅ OUI | 🔴 HAUTE | 1 | 3.5 |
| 4 | **LCEN** (Loi n°2004-575) | ✅ OUI | 🔴 HAUTE | 1 | 3.4 |
| 5 | **Code de la consommation** | ✅ OUI | 🟠 MOYENNE | 1 | 3.2 |
| 6 | **RIA / AI Act** (UE 2024/1689) | ✅ OUI | 🔴 CRITIQUE | 2 | 4.1-4.8 |
| 7 | **AMF/ACPR** | ✅ OUI | 🔴 CRITIQUE | 1+2 | 3.3, 4.3, 4.4 |
| 8 | **OMNIBUS** (Directive 2019/2161) | ✅ OUI | 🟠 MOYENNE | 1 | 3.2 |
| 9 | **Data Act** (UE 2023/2854) | ⚠️ PARTIEL | 🟡 BASSE | 1 | 3.8.4 |
| 10 | **CRA** (Cyber Resilience Act) | ⚠️ POTENTIEL | 🟡 BASSE | 1 | 3.11 |
| 11 | **DSA** (Digital Services Act) | ⚠️ EXEMPTION | 🟢 BASSE | - | - |
| 12 | **NIS2** | ❌ NON | - | - | - |
| 13 | **DORA** | ❌ NON | - | - | - |

> **Note sur les phases :**
> - **Phase 1** = Application sans chatbot IA
> - **Phase 2** = Intégration du chatbot IA (suppose Phase 1 terminée)
> - **1+2** = Obligations dès Phase 1, renforcées en Phase 2

### 1.2 Pourquoi cette priorisation ?

**CRITIQUE** = Applicable dès le jour 1, sanctions immédiates possibles, bloquant pour le lancement.

**HAUTE** = Applicable dès le jour 1, mais délai de grâce ou contrôle moins fréquent.

**MOYENNE** = Important mais sanctions moins sévères ou application progressive.

**BASSE** = Anticipation, pas encore pleinement applicable ou seuils non atteints.

---

## 2. Décisions Stratégiques Validées

Les choix suivants ont été validés et **ne doivent pas être remis en question** sans nouvelle analyse juridique :

| Élément | Décision | Impact |
|---------|----------|--------|
| **Hébergement base de données** | Hébergeur EU (Scaleway/OVH/Infomaniak) | Aucun transfert hors UE pour les données principales |
| **Notifications push** | Expo avec DPA/SCCs + TIA documentée | Transfert encadré vers Expo (US) |
| **Granularité consentement notifications** | 4 types distincts (quiz, actualités, rappels, marketing) | Conformité CNIL |
| **Classification chatbot IA** | Risque limité strict (éducatif uniquement) | Obligations AI Act allégées |
| **Protection des mineurs** | 15+ sans parental, <15 ans consentement parental | Conformité Art. 8 RGPD / Art. 45 LIL |

---

## 3. PHASE 1 : Application Sans Chatbot

Cette phase couvre la mise en conformité de l'application Cashou **avant** l'ajout du chatbot IA. Toutes les actions ci-dessous sont des **prérequis au lancement**.

---

### 3.1 Politique de Confidentialité

#### 3.1.1 Création de la Politique de Confidentialité

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | RGPD Art. 12, 13, 14 |
| **Sanction si absent** | Jusqu'à 20M€ ou 4% CA mondial |

**Pourquoi c'est obligatoire :**

L'Article 13 du RGPD impose de fournir aux utilisateurs, **au moment de la collecte**, les informations suivantes :
- Identité du responsable de traitement
- Coordonnées du DPO (si applicable)
- Finalités et base légale de chaque traitement
- Destinataires des données
- Transferts hors UE (le cas échéant)
- Durées de conservation
- Droits des personnes (accès, rectification, effacement, etc.)
- Droit de réclamation auprès de la CNIL

**Contenu obligatoire du document :**

```
POLITIQUE DE CONFIDENTIALITÉ - CASHOU

1. Identité du responsable de traitement
   - Dénomination sociale : [À COMPLÉTER]
   - Siège social : [À COMPLÉTER]
   - Contact : [À COMPLÉTER]

2. Données collectées et finalités
   [Tableau détaillé : donnée | finalité | base légale | durée]

3. Base légale de chaque traitement
   - Création de compte : Exécution du contrat (Art. 6.1.b)
   - Notifications push : Consentement (Art. 6.1.a)
   - IP/User-Agent : Intérêt légitime - sécurité (Art. 6.1.f)
   [...]

4. Durées de conservation
   [Tableau détaillé]

5. Destinataires des données
   - Hébergeur : [Nom] (UE)
   - Service notifications : Expo Inc. (USA) - encadré par SCCs

6. Transferts hors UE
   - Expo Inc. : Standard Contractual Clauses signées le [DATE]
   - Transfer Impact Assessment disponible sur demande

7. Vos droits
   - Droit d'accès (Art. 15)
   - Droit de rectification (Art. 16)
   - Droit à l'effacement (Art. 17)
   - Droit à la portabilité (Art. 20)
   - Droit d'opposition (Art. 21)
   - Contact : [EMAIL DPO ou PRIVACY]

8. Réclamation
   - CNIL : www.cnil.fr

9. Modifications de la politique
   - Version : X.X
   - Date : JJ/MM/AAAA
```

**Emplacement obligatoire :**
- [ ] Écran d'inscription (avant validation)
- [ ] Menu paramètres de l'application
- [ ] Description App Store / Play Store

---

### 3.2 Conditions Générales d'Utilisation (CGU)

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | Code de la consommation Art. L111-1 et suivants, Directive OMNIBUS |
| **Sanction si absent** | Amende administrative + nullité potentielle des contrats |

**Pourquoi c'est obligatoire :**

Le Code de la consommation impose une **information précontractuelle** claire avant tout engagement. La Directive OMNIBUS (2019/2161) renforce ces obligations de transparence.

**Contenu obligatoire :**

```
CONDITIONS GÉNÉRALES D'UTILISATION - CASHOU

1. Objet du service
   - Description : Application d'éducation financière gamifiée
   - IMPORTANT : Simulation uniquement, PAS de conseil en investissement

2. Acceptation des conditions
   - Case à cocher obligatoire lors de l'inscription

3. Accès au service
   - Conditions d'âge : 15 ans minimum (ou consentement parental)
   - Création de compte obligatoire

4. Propriété intellectuelle
   - Contenus Cashou : [Licence]
   - Contenus utilisateur : [Licence accordée]

5. Responsabilités
   - Clause de non-conseil financier (OBLIGATOIRE - voir 3.3)
   - Limitation de responsabilité

6. Données personnelles
   - Renvoi vers la Politique de Confidentialité

7. Résiliation
   - Droit de résiliation à tout moment
   - Procédure de suppression de compte

8. Droit de rétractation
   - Si services payants : 14 jours (Code conso. Art. L221-18)

9. Médiation
   - Nom du médiateur de la consommation : [À DÉSIGNER]
   - Obligation légale pour tout professionnel B2C

10. Droit applicable et juridiction
    - Droit français
    - Tribunaux français compétents
```

---

### 3.3 Disclaimers Financiers

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | Code monétaire et financier, Réglementation AMF |
| **Sanction si absent** | Requalification en service financier non agréé |

**Pourquoi c'est obligatoire :**

Même si Cashou est une **simulation éducative**, l'AMF surveille tout service pouvant être confondu avec du conseil en investissement. Sans disclaimer explicite, Cashou risque :
- Une requalification en service de conseil en investissement (agrément obligatoire)
- Des poursuites pour exercice illégal de la profession de conseiller financier

**Textes obligatoires à intégrer :**

```
DISCLAIMER PRINCIPAL (visible sur chaque écran de simulation) :

⚠️ SIMULATION ÉDUCATIVE UNIQUEMENT
Les informations présentées dans Cashou sont purement fictives
et à but pédagogique. Elles ne constituent en aucun cas :
- Un conseil en investissement
- Une recommandation d'achat ou de vente
- Une incitation à investir

Pour toute décision d'investissement réelle, consultez un
professionnel agréé par l'AMF (www.amf-france.org).
```

**Emplacements obligatoires :**
- [ ] Écran d'accueil (première utilisation)
- [ ] Pied de page de chaque écran de simulation/trading
- [ ] Avant chaque "transaction" simulée
- [ ] Description App Store / Play Store

---

### 3.4 Mentions Légales (LCEN)

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | LCEN Art. 6-III, Loi SREN 2024 |
| **Sanction si absent** | 1 an emprisonnement + 75 000€ (personne physique) / 375 000€ (personne morale) |

**Pourquoi c'est obligatoire :**

La LCEN impose à tout éditeur de service en ligne de rendre accessibles des informations permettant de l'identifier. La Loi SREN (2024) a élargi ces obligations.

**Checklist OBLIGATOIRE :**

| Information | Obligatoire | Statut |
|-------------|-------------|--------|
| Dénomination sociale | ✅ OUI | [ ] À ajouter |
| Forme juridique (SAS, SARL...) | ✅ OUI | [ ] À ajouter |
| Siège social | ✅ OUI | [ ] À ajouter |
| Capital social | ✅ OUI | [ ] À ajouter |
| RCS / SIRET | ✅ OUI | [ ] À ajouter |
| Numéro de téléphone | ✅ OUI | [ ] À ajouter |
| Email de contact | ✅ OUI | [ ] À ajouter |
| Directeur de publication | ✅ OUI | [ ] À ajouter |
| Hébergeur (nom, adresse, tel) | ✅ OUI | [ ] À ajouter |
| Numéro TVA intracommunautaire | Si assujetti | [ ] À vérifier |

**Emplacement obligatoire :**
- [ ] Section "Mentions légales" accessible depuis le menu principal
- [ ] Description App Store / Play Store

---

### 3.5 Système de Consentement

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | RGPD Art. 7, ePrivacy Art. 5(3), LIL Art. 82 |
| **Sanction si absent** | Jusqu'à 20M€ (RGPD) + sanctions CNIL |

**Pourquoi c'est obligatoire :**

L'Article 7 du RGPD impose que le consentement soit :
- **Libre** : pas de case pré-cochée, pas de "tout accepter" mis en avant
- **Spécifique** : un consentement par finalité
- **Éclairé** : information claire sur ce qui est accepté
- **Univoque** : action positive claire (clic, toggle)
- **Retirable** : aussi facile à retirer qu'à donner

La CNIL exige une **symétrie des choix** : "Accepter" et "Refuser" doivent être visuellement équivalents.

#### 3.5.1 Consentement aux CGU/Politique (inscription)

**Implémentation requise :**

```
□ J'ai lu et j'accepte les Conditions Générales d'Utilisation [lien]
□ J'ai lu et j'accepte la Politique de Confidentialité [lien]

[CRÉER MON COMPTE] (grisé tant que non coché)
```

**Stockage obligatoire (preuve) :**
- Date/heure du consentement
- Version des CGU/Politique acceptée
- Adresse IP (pour preuve)

#### 3.5.2 Consentement aux Notifications Push (granularité fine)

**Décision validée :** 4 types de notifications distincts.

**Implémentation requise :**

```
NOTIFICATIONS

Choisissez les notifications que vous souhaitez recevoir :

□ Rappels de quiz quotidien
  Recevez un rappel pour maintenir votre série

□ Actualités marché (éducatives)
  Informations sur les tendances financières

□ Rappels d'activité
  Si vous n'avez pas utilisé l'app depuis 7 jours

□ Communications promotionnelles
  Offres et nouveautés Cashou

[TOUT ACTIVER]  [TOUT DÉSACTIVER]  [VALIDER]
```

**Règles CNIL à respecter :**
- Boutons "Tout activer" et "Tout désactiver" de même taille/couleur
- Chaque type indépendant
- Modification possible à tout moment dans les paramètres

#### 3.5.3 Modèle de données pour le consentement

**Schéma Prisma à ajouter :**

```prisma
model UserConsent {
  id        String      @id @default(cuid())
  userId    String      @map("user_id")
  type      ConsentType
  granted   Boolean
  grantedAt DateTime?
  revokedAt DateTime?
  version   String      // Version du document accepté
  ipAddress String?     // Preuve
  userAgent String?     // Preuve
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_consents")
}

enum ConsentType {
  TERMS_OF_SERVICE      // CGU
  PRIVACY_POLICY        // Politique de confidentialité
  PUSH_QUIZ             // Notifications quiz
  PUSH_NEWS             // Notifications actualités
  PUSH_REMINDER         // Notifications rappels
  PUSH_MARKETING        // Notifications marketing
}
```

---

### 3.6 Gestion des Transferts Hors UE (Expo)

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | RGPD Art. 44-49 (transferts internationaux) |
| **Sanction si absent** | Jusqu'à 20M€ + interdiction du transfert |

**Pourquoi c'est obligatoire :**

Expo Inc. est une société américaine. L'envoi de push tokens à leurs serveurs constitue un **transfert de données personnelles hors UE**. Depuis l'arrêt Schrems II (2020), ces transferts nécessitent des garanties supplémentaires.

**Actions obligatoires :**

#### 3.6.1 Data Processing Agreement (DPA) avec Expo

- [ ] Télécharger et signer le DPA Expo : https://expo.dev/legal
- [ ] Vérifier que les Standard Contractual Clauses (SCCs) 2021 sont incluses
- [ ] Conserver une copie signée

#### 3.6.2 Transfer Impact Assessment (TIA)

Document obligatoire analysant :
- Nature des données transférées (push tokens uniquement)
- Législation US applicable (Cloud Act, FISA 702)
- Mesures supplémentaires mises en place
- Conclusion sur l'adéquation de la protection

**Template TIA à créer :**

```
TRANSFER IMPACT ASSESSMENT - EXPO PUSH NOTIFICATIONS

1. Données transférées
   - Type : Expo Push Token
   - Volume : 1 token par utilisateur
   - Sensibilité : Faible (identifiant technique)

2. Destinataire
   - Expo Inc., USA
   - Certifications : [À vérifier]

3. Analyse du droit US
   - Cloud Act : Risque d'accès gouvernemental
   - Atténuation : Données non sensibles, chiffrées en transit

4. Mesures supplémentaires
   - SCCs 2021 signées
   - Chiffrement TLS en transit
   - Pas de données sensibles transférées

5. Conclusion
   - Risque résiduel : ACCEPTABLE
   - Raison : Données techniques uniquement, pas de contenu
```

---

### 3.7 Protection des Mineurs

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | RGPD Art. 8, LIL Art. 45 |
| **Sanction si absent** | Nullité du traitement + sanctions CNIL |

**Pourquoi c'est obligatoire :**

L'Article 8 du RGPD (transposé à l'Art. 45 LIL) fixe à **15 ans** (en France) l'âge à partir duquel un mineur peut consentir seul au traitement de ses données. En dessous de 15 ans, le consentement du titulaire de l'autorité parentale est obligatoire.

**Décision validée :** 15+ sans parental, <15 ans avec consentement parental.

**Implémentation requise :**

#### 3.7.1 Écran de vérification d'âge

```
BIENVENUE SUR CASHOU

Pour créer un compte, merci d'indiquer votre date de naissance :

[JJ] / [MM] / [AAAA]

ℹ️ Pourquoi cette information ?
La loi française exige le consentement parental pour les
utilisateurs de moins de 15 ans.
```

#### 3.7.2 Si utilisateur < 15 ans

```
CONSENTEMENT PARENTAL REQUIS

Tu as moins de 15 ans. Pour utiliser Cashou, un parent ou
tuteur légal doit donner son accord.

Envoie ce lien à ton parent : [LIEN UNIQUE]

OU

[ENTRER L'EMAIL D'UN PARENT]
```

#### 3.7.3 Workflow parental

1. Email envoyé au parent avec :
   - Explication du service
   - Lien vers Politique de Confidentialité
   - Bouton de validation

2. Stockage de la preuve :
   - Email du parent
   - Date/heure de validation
   - IP de validation

---

### 3.8 Droits des Personnes Concernées

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | RGPD Art. 15-22 |
| **Sanction si absent** | Jusqu'à 20M€ + plaintes CNIL |

**Pourquoi c'est obligatoire :**

Le RGPD accorde aux utilisateurs des droits **exerçables à tout moment**. L'absence de mécanisme pour les exercer est une violation directe.

#### 3.8.1 Droit d'accès (Art. 15)

**Obligation :** Fournir, sur demande, toutes les données détenues sur l'utilisateur.

**Implémentation requise :**
- Endpoint API : `GET /api/user/data-export`
- Format : JSON ou PDF
- Délai légal : 1 mois maximum

**Contenu de l'export :**
```json
{
  "exportDate": "2026-01-30T12:00:00Z",
  "user": {
    "email": "...",
    "name": "...",
    "createdAt": "..."
  },
  "gameProgress": {
    "level": 5,
    "points": 1250,
    "badges": ["..."]
  },
  "quizHistory": [...],
  "transactions": [...],
  "consents": [...]
}
```

#### 3.8.2 Droit de rectification (Art. 16)

**Obligation :** Permettre la modification des données inexactes.

**Implémentation requise :**
- Écran "Modifier mon profil" accessible
- Champs modifiables : nom, email (avec vérification), image

#### 3.8.3 Droit à l'effacement (Art. 17)

**Obligation :** Supprimer toutes les données sur demande (sauf obligation légale de conservation).

**Implémentation requise :**
- Bouton "Supprimer mon compte" dans les paramètres
- Confirmation en 2 étapes
- Suppression effective sous 30 jours
- Email de confirmation

**Logique de suppression :**
```typescript
async function deleteUserAccount(userId: string) {
  // 1. Anonymiser les données statistiques (conservation intérêt légitime)
  await anonymizeUserStats(userId);

  // 2. Supprimer les données personnelles
  // La cascade Prisma supprime : sessions, consents, notifications
  await prisma.user.delete({ where: { id: userId } });

  // 3. Logger la suppression (obligation légale - 1 an)
  await logAccountDeletion(userId, new Date());

  // 4. Révoquer le push token chez Expo
  await revokeExpoPushToken(userId);
}
```

#### 3.8.4 Droit à la portabilité (Art. 20 RGPD + Data Act)

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 HAUTE |
| **Réglementation** | RGPD Art. 20 + Data Act (UE 2023/2854) Art. 4-5 |
| **Échéance Data Act** | 12 septembre 2025 |

**Pourquoi c'est obligatoire :**

Le RGPD (Art. 20) garantit la portabilité des **données personnelles**. Le Data Act (Art. 4-5) étend cette obligation aux **données générées par l'utilisation** du service, y compris les données non personnelles.

**Différences clés :**

| Aspect | RGPD Art. 20 | Data Act Art. 4-5 |
|--------|--------------|-------------------|
| Données couvertes | Personnelles uniquement | Personnelles + non-personnelles générées |
| Délai de réponse | 1 mois | Sans retard indu (30 jours max recommandé) |
| Format | Structuré, courant, machine-readable | Idem + facilement utilisable |
| Coût | Gratuit | Gratuit pour l'utilisateur |
| Transfert direct | Si techniquement possible | Obligatoire si demandé |

**Implémentation requise :**

```
Endpoint : GET /api/user/data-export?format=portable

Headers :
- Content-Type: application/json
- Content-Disposition: attachment; filename="cashou-export-{userId}-{date}.json"
```

**Contenu de l'export (RGPD + Data Act combinés) :**

```json
{
  "exportInfo": {
    "date": "2026-01-30T12:00:00Z",
    "format": "JSON",
    "version": "1.0",
    "regulations": ["RGPD Art. 20", "Data Act Art. 4-5"]
  },

  "personalData": {
    "_comment": "Données personnelles (RGPD Art. 20)",
    "email": "user@example.com",
    "name": "Jean Dupont",
    "username": "jeandupont",
    "createdAt": "2025-06-15T10:00:00Z"
  },

  "generatedData": {
    "_comment": "Données générées par l'utilisation (Data Act Art. 4)",

    "gameProgress": {
      "level": 5,
      "points": 1250,
      "currentStreak": 7,
      "maxStreak": 15,
      "badges": ["first_trade", "quiz_master", "streak_7"]
    },

    "quizHistory": [
      {
        "quizId": 12,
        "completedAt": "2026-01-15T14:30:00Z",
        "score": 8,
        "maxScore": 10
      }
    ],

    "simulatedTransactions": [
      {
        "date": "2026-01-20T09:15:00Z",
        "type": "BUY",
        "asset": "AAPL (simulé)",
        "quantity": 10,
        "price": 185.50
      }
    ],

    "wallets": [
      {
        "name": "Portefeuille principal",
        "virtualBalance": 10000,
        "holdings": [...]
      }
    ]
  },

  "consents": {
    "_comment": "Historique des consentements",
    "records": [
      {
        "type": "PRIVACY_POLICY",
        "granted": true,
        "grantedAt": "2025-06-15T10:00:00Z",
        "version": "1.0"
      }
    ]
  }
}
```

**Obligations Data Act spécifiques :**

| Obligation | Implémentation |
|------------|----------------|
| Format interopérable | JSON standard, schéma documenté |
| Accès continu | Export disponible 24/7 via l'app |
| Gratuité | Aucun frais pour l'export |
| Transfert direct | Bouton "Envoyer à une autre app" (si demandé) |
| Métadonnées | Inclure date, format, réglementations |

**Interface utilisateur requise :**

```
EXPORTER MES DONNÉES

Vous pouvez récupérer toutes vos données Cashou à tout moment.

📋 Données incluses :
• Informations de profil
• Progression et badges
• Historique des quiz
• Transactions simulées
• Historique des consentements

📁 Format : JSON (lisible par d'autres applications)

[TÉLÉCHARGER MES DONNÉES]

⏱️ Délai : Téléchargement immédiat
💰 Coût : Gratuit
```

#### 3.8.5 Droit d'opposition (Art. 21)

**Obligation :** Permettre de s'opposer aux traitements basés sur l'intérêt légitime.

**Implémentation requise :**
- Opposition aux notifications : écran paramètres
- Opposition à la collecte IP/User-Agent : formulaire de contact

---

### 3.9 Durées de Conservation

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 HAUTE |
| **Réglementation** | RGPD Art. 5(1)(e) - Limitation de la conservation |
| **Sanction si absent** | Violation du principe de minimisation |

**Pourquoi c'est obligatoire :**

L'Article 5(1)(e) du RGPD impose de ne pas conserver les données **plus longtemps que nécessaire** pour la finalité déclarée. L'absence de politique de conservation est une violation.

**Politique de conservation à implémenter :**

| Type de données | Durée | Base légale | Action automatique |
|-----------------|-------|-------------|-------------------|
| Compte actif | Durée d'utilisation | Contrat | - |
| Compte inactif | 3 ans après dernière activité | Intérêt légitime | Notification puis suppression |
| Sessions expirées | 30 jours | Sécurité | Purge CRON |
| Transactions de jeu | Durée du compte + 1 an | Intérêt légitime | Anonymisation |
| Logs de sécurité (IP) | 1 an | Obligation légale (LCEN) | Purge CRON |
| Preuves de consentement | 5 ans | Preuve juridique | Archivage |
| Compte supprimé | Anonymisation immédiate | - | - |

**Jobs CRON à implémenter :**

```typescript
// À exécuter quotidiennement
async function cleanupExpiredData() {
  // Purger les sessions expirées > 30 jours
  await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: subDays(new Date(), 30) }
    }
  });

  // Notifier les comptes inactifs > 2 ans
  await notifyInactiveUsers(subYears(new Date(), 2));

  // Supprimer les comptes inactifs > 3 ans (après notification)
  await deleteInactiveUsers(subYears(new Date(), 3));

  // Purger les logs IP > 1 an
  await purgeOldSecurityLogs(subYears(new Date(), 1));
}
```

---

### 3.10 Registre des Traitements

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 HAUTE |
| **Réglementation** | RGPD Art. 30 |
| **Sanction si absent** | Amende + incapacité à prouver la conformité |

**Pourquoi c'est obligatoire :**

L'Article 30 du RGPD impose de tenir un registre documentant tous les traitements de données personnelles. Ce registre doit être **disponible sur demande** de la CNIL.

**Document à créer (exemple pour un traitement) :**

```yaml
# REGISTRE DES TRAITEMENTS - CASHOU

traitement_1:
  nom: "Gestion des comptes utilisateurs"
  responsable: "[Nom de l'entité]"
  finalite: "Permettre l'accès et l'utilisation de l'application Cashou"
  base_legale: "Exécution du contrat (RGPD Art. 6.1.b)"
  categories_personnes:
    - "Utilisateurs de l'application mobile"
  categories_donnees:
    - "Données d'identification (email, nom)"
    - "Données d'authentification (hash mot de passe)"
    - "Données de connexion (IP, User-Agent)"
  destinataires:
    - "Équipe technique Cashou"
    - "Hébergeur : [Nom], [Pays UE]"
    - "Expo Inc. (notifications) - USA, SCCs signées"
  transferts_hors_ue:
    - destinataire: "Expo Inc."
      pays: "USA"
      garanties: "SCCs 2021 + TIA"
  duree_conservation: "Durée du compte + 3 ans d'inactivité"
  mesures_securite:
    - "Chiffrement des mots de passe (bcrypt)"
    - "HTTPS obligatoire"
    - "Tokens JWT signés"
    - "Sessions en base de données avec expiration"
```

**Traitements à documenter :**
1. Gestion des comptes utilisateurs
2. Authentification et sessions
3. Progression de jeu et gamification
4. Quiz et suivi pédagogique
5. Notifications push
6. Logs de sécurité

---

### 3.11 Sécurité des Données

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 HAUTE |
| **Réglementation** | RGPD Art. 32, CRA (anticipation) |
| **Sanction si absent** | Responsabilité en cas de violation |

**Pourquoi c'est obligatoire :**

L'Article 32 du RGPD impose des mesures de sécurité **appropriées au risque**. Le Cyber Resilience Act (CRA) imposera bientôt des obligations de sécurité pour les produits numériques.

**Mesures déjà en place (à vérifier) :**
- [x] Hash des mots de passe (Better-Auth)
- [x] Tokens JWT signés avec expiration
- [x] Sessions en base de données

**Mesures à ajouter :**

| Mesure | Priorité | Réglementation |
|--------|----------|----------------|
| HTTPS obligatoire en production | 🔴 BLOQUANT | RGPD Art. 32 |
| Rate limiting sur authentification | 🔴 HAUTE | RGPD Art. 32 |
| Validation des entrées utilisateur | 🔴 HAUTE | OWASP / CRA |
| Audit log des connexions | 🟠 MOYENNE | RGPD Art. 32 |
| 2FA optionnel | 🟡 RECOMMANDÉ | Bonnes pratiques |
| Politique de mots de passe robustes | 🟠 MOYENNE | RGPD Art. 32 |

---

### 3.12 Procédure de Notification de Violation

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 HAUTE |
| **Réglementation** | RGPD Art. 33-34 |
| **Sanction si absent** | Sanctions aggravées en cas de violation non notifiée |

**Pourquoi c'est obligatoire :**

L'Article 33 du RGPD impose de notifier la CNIL dans les **72 heures** suivant la découverte d'une violation de données. L'Article 34 impose de notifier les personnes concernées si le risque est élevé.

**Procédure à documenter :**

```
PROCÉDURE DE GESTION DES VIOLATIONS DE DONNÉES

1. DÉTECTION (T0)
   - Source : monitoring, signalement utilisateur, audit
   - Action immédiate : isoler la faille si possible

2. ÉVALUATION (T0 à T+24h)
   - Nature de la violation (confidentialité, intégrité, disponibilité)
   - Données concernées
   - Nombre de personnes affectées
   - Risque pour les droits et libertés

3. NOTIFICATION CNIL (si risque) - DÉLAI : 72h MAX
   - Via téléservice : https://notifications.cnil.fr
   - Informations à fournir :
     - Nature de la violation
     - Catégories et nombre de personnes
     - Conséquences probables
     - Mesures prises

4. NOTIFICATION PERSONNES (si risque élevé)
   - Communication claire et en langage simple
   - Description de la violation
   - Mesures prises et recommandations

5. DOCUMENTATION
   - Toute violation doit être consignée
   - Même si non notifiée à la CNIL
```

---

### 3.13 Synthèse Globale - Phase 1

#### Vue d'ensemble

La Phase 1 vise à rendre l'application Cashou **juridiquement opérationnelle** avant tout lancement public, même sans chatbot IA. Elle couvre les obligations fondamentales applicables à toute application mobile collectant des données personnelles en France/UE.

#### Réglementations couvertes en Phase 1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1 - SANS CHATBOT                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROTECTION DES DONNÉES                    OBLIGATIONS LÉGALES FRANÇAISES   │
│  ─────────────────────                     ─────────────────────────────────│
│  • RGPD (Art. 5-34, 44-49)                • LCEN (mentions légales)         │
│  • LIL (Art. 45, 82)                      • Code de la consommation         │
│  • ePrivacy (notifications)               • OMNIBUS (transparence CGU)      │
│  • Data Act (portabilité)                                                   │
│                                                                             │
│  SECTEUR FINANCIER                         SÉCURITÉ                         │
│  ────────────────────                      ────────────────────             │
│  • AMF : Disclaimers simulation           • CRA (anticipation)              │
│    (PAS de conseil, PAS de trading réel)  • RGPD Art. 32 (sécurité)         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Livrables juridiques Phase 1

| Document | Format | Responsable | Validation |
|----------|--------|-------------|------------|
| Politique de confidentialité | Markdown/HTML dans l'app | Juridique | Obligatoire |
| CGU | Markdown/HTML dans l'app | Juridique | Obligatoire |
| Mentions légales LCEN | Page dans l'app | Juridique | Obligatoire |
| Disclaimers financiers | Textes intégrés UI | Juridique + Produit | Obligatoire |
| DPA Expo signé | PDF archivé | Juridique | Obligatoire |
| Transfer Impact Assessment | Document interne | DPO/Tech | Obligatoire |
| Registre des traitements | YAML/Excel | DPO/Tech | 30 jours post-launch |
| Procédure violation données | Document interne | DPO | 30 jours post-launch |

#### Livrables techniques Phase 1

| Fonctionnalité | Endpoint/Écran | Priorité |
|----------------|----------------|----------|
| Écran consentement inscription | UI mobile | 🔴 Bloquant |
| Écran consentement notifications (4 types) | UI mobile | 🔴 Bloquant |
| Vérification d'âge | UI mobile | 🔴 Bloquant |
| Workflow consentement parental | UI + Email | 🔴 Bloquant |
| Table `user_consents` | Schema Prisma | 🔴 Bloquant |
| Export données utilisateur | `GET /api/user/data-export` | 🟠 30 jours |
| Suppression compte | `DELETE /api/user` + UI | 🟠 30 jours |
| CRON purge données expirées | Job serveur | 🟠 30 jours |
| Rate limiting authentification | Middleware | 🟠 30 jours |

#### Risques si Phase 1 incomplète

| Élément manquant | Risque | Sanction potentielle |
|------------------|--------|---------------------|
| Politique de confidentialité | Traitement illicite | 20M€ / 4% CA (RGPD) |
| Mentions légales | Infraction pénale | 75K€ + 1 an (LCEN) |
| Consentement notifications | Violation ePrivacy | Sanctions CNIL |
| Disclaimers AMF | Requalification en service financier | Exercice illégal |
| DPA Expo manquant | Transfert illicite hors UE | Interdiction + amende |

---

### 3.14 Checklist Phase 1

**BLOQUANTS AVANT LANCEMENT :**

- [ ] Politique de confidentialité rédigée et publiée
- [ ] CGU rédigées et publiées
- [ ] Disclaimers financiers intégrés
- [ ] Mentions légales LCEN complètes
- [ ] Écran de consentement (CGU + Politique) à l'inscription
- [ ] Écran de consentement notifications (4 types)
- [ ] DPA Expo signé
- [ ] Transfer Impact Assessment rédigée
- [ ] Vérification d'âge implémentée
- [ ] Workflow consentement parental (<15 ans)
- [ ] HTTPS activé en production

**À IMPLÉMENTER RAPIDEMENT (30 jours post-lancement) :**

- [ ] Endpoint export données (Art. 15)
- [ ] Bouton suppression compte (Art. 17)
- [ ] Registre des traitements créé
- [ ] Durées de conservation implémentées (CRON)
- [ ] Rate limiting authentification
- [ ] Procédure violation documentée

---

## 4. PHASE 2 : Intégration du Chatbot IA

Cette phase s'applique **uniquement après la complétion de la Phase 1**. Elle couvre les obligations supplémentaires liées à l'intégration d'un chatbot IA.

**Décision validée :** Chatbot à risque limité strict (éducatif uniquement).

---

### 4.1 Classification AI Act

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 CRITIQUE |
| **Réglementation** | AI Act (UE 2024/1689) Art. 50 |
| **Sanction si non-conformité** | Jusqu'à 15M€ ou 3% CA mondial |

**Pourquoi c'est obligatoire :**

Le Règlement sur l'Intelligence Artificielle (AI Act) classe les systèmes IA par niveau de risque. Un chatbot **éducatif** relève de la catégorie **"risque limité"** (Art. 50) et est soumis aux obligations de transparence.

**ATTENTION :** Si le chatbot donne des conseils personnalisés ou influence des décisions financières, il pourrait être requalifié en **"haut risque"** (Annexe III), avec des obligations drastiquement plus lourdes.

**Classification validée :**

| Critère | Évaluation | Conséquence |
|---------|------------|-------------|
| Conseils personnalisés | ❌ NON | Risque limité |
| Analyse de portefeuille | ❌ NON | Risque limité |
| Recommandations d'achat/vente | ❌ NON | Risque limité |
| Influence sur décisions financières | ❌ NON | Risque limité |
| Explications de concepts | ✅ OUI | Autorisé |
| Définitions générales | ✅ OUI | Autorisé |

**Conclusion :** Classification **RISQUE LIMITÉ** confirmée.

---

### 4.2 Obligations de Transparence (Art. 50)

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | AI Act Art. 50 |
| **Échéance** | 2 août 2026 |

**Pourquoi c'est obligatoire :**

L'Article 50 du AI Act impose que les utilisateurs sachent qu'ils interagissent avec une IA. C'est une obligation de **transparence minimale** pour tous les chatbots.

**Implémentations requises :**

#### 4.2.1 Mention d'interaction avec une IA

**Texte obligatoire (au premier message du chatbot) :**

```
🤖 Bonjour ! Je suis l'assistant IA de Cashou.

Je suis un système d'intelligence artificielle conçu pour
vous aider à comprendre les concepts financiers.

Mes réponses sont générées automatiquement et ne constituent
pas des conseils en investissement.
```

#### 4.2.2 Marquage du contenu généré

**Chaque réponse du chatbot doit inclure :**

```
[Réponse du chatbot...]

───────────────────────────────
ℹ️ Réponse générée par IA
Cette information est à but éducatif uniquement.
```

#### 4.2.3 Bouton d'information permanent

**Dans l'interface du chatbot :**

```
[ℹ️] → Ouvre une modal :

À PROPOS DE L'ASSISTANT IA

• Cet assistant utilise l'intelligence artificielle
• Ses réponses sont générées automatiquement
• Il est conçu pour expliquer des concepts financiers
• Il ne fournit PAS de conseils en investissement
• Pour des décisions financières, consultez un professionnel AMF
```

---

### 4.3 Filtres Anti-Conseil Financier (AMF/ACPR)

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 CRITIQUE |
| **Réglementation** | Code monétaire et financier, Réglementation AMF |
| **Sanction si absent** | Requalification en conseiller financier non agréé |

**Pourquoi c'est obligatoire :**

L'ACPR (Autorité de Contrôle Prudentiel et de Résolution) sera l'autorité de surveillance AI Act pour le secteur financier en France. Un chatbot donnant des recommandations financières personnalisées serait requalifié en service de conseil en investissement, nécessitant un agrément.

**Implémentation OBLIGATOIRE :**

#### 4.3.1 Patterns interdits (à filtrer en entrée et sortie)

```typescript
// Patterns à bloquer dans les réponses du chatbot
const FORBIDDEN_OUTPUT_PATTERNS = [
  /tu devrais (acheter|vendre|investir)/i,
  /je te (conseille|recommande) d(e|')/i,
  /c'est le bon moment pour (acheter|vendre)/i,
  /cette action va (monter|baisser|exploser)/i,
  /investis dans/i,
  /achète (des?|du)/i,
  /vends (tes?|ton)/i,
  /ton portefeuille devrait/i,
  /je te suggère de placer/i,
  /mise sur/i,
  /fonce sur/i,
];

// Patterns à détecter dans les questions utilisateur
const ADVICE_REQUEST_PATTERNS = [
  /qu('est-ce que |e )je (devrais|dois) (acheter|vendre|investir)/i,
  /dans quoi (investir|placer)/i,
  /quelle action (acheter|recommandes)/i,
  /c'est le moment (d'acheter|de vendre)/i,
  /analyse mon portefeuille/i,
];
```

#### 4.3.2 Réponse standard aux demandes de conseil

```typescript
const ADVICE_REFUSAL_RESPONSE = `
Je comprends que vous cherchez des conseils d'investissement,
mais je ne suis pas autorisé à vous en fournir.

🎓 Ce que je peux faire :
• Vous expliquer des concepts financiers
• Vous définir des termes boursiers
• Vous présenter le fonctionnement des marchés

💼 Pour des conseils personnalisés :
Consultez un conseiller en investissement agréé par l'AMF.
Liste officielle : www.amf-france.org

⚠️ Rappel : Cashou est une simulation éducative.
`;
```

#### 4.3.3 Matrice de risque des fonctionnalités

| Fonctionnalité chatbot | Risque AMF | Risque AI Act | Statut |
|------------------------|------------|---------------|--------|
| Explique "qu'est-ce qu'une action" | ✅ Nul | ✅ Limité | AUTORISÉ |
| Explique le fonctionnement du CAC40 | ✅ Nul | ✅ Limité | AUTORISÉ |
| Définit "diversification" | ✅ Nul | ✅ Limité | AUTORISÉ |
| "Tu devrais diversifier" | ⚠️ Conseil générique | ⚠️ Modéré | INTERDIT |
| "Achète X car..." | 🔴 Conseil en investissement | 🔴 Haut | INTERDIT |
| Analyse le portefeuille utilisateur | 🔴 Gestion de portefeuille | 🔴 Haut | INTERDIT |

---

### 4.4 Disclaimer Permanent dans le Chatbot

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🔴 BLOQUANT |
| **Réglementation** | AI Act Art. 50, Code monétaire et financier |
| **Sanction si absent** | Non-conformité AI Act + risque AMF |

**Implémentation requise :**

**Footer permanent de chaque réponse :**

```
───────────────────────────────
⚠️ Information générée par IA à but éducatif uniquement.
Ne constitue pas un conseil en investissement.
Pour toute décision financière, consultez un professionnel agréé AMF.
```

---

### 4.5 Documentation Technique du Système IA

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 HAUTE |
| **Réglementation** | AI Act Art. 50, RGPD Art. 13 |
| **Échéance** | Avant déploiement |

**Pourquoi c'est obligatoire :**

Même pour un système à risque limité, une documentation minimale est requise. Elle sera nécessaire en cas de contrôle CNIL/ACPR et pour répondre aux questions des utilisateurs.

**Document à créer :**

```
DOCUMENTATION TECHNIQUE - ASSISTANT IA CASHOU

1. DESCRIPTION GÉNÉRALE
   - Nom : Assistant IA Cashou
   - Fonction : Explication de concepts financiers
   - Classification AI Act : Risque limité (Art. 50)

2. MODÈLE SOUS-JACENT
   - Fournisseur : [OpenAI / Anthropic / Mistral / etc.]
   - Modèle : [GPT-4 / Claude / Mistral / etc.]
   - Mode d'utilisation : API

3. DONNÉES D'ENTRAÎNEMENT
   - Fine-tuning : [OUI/NON]
   - Si OUI : description des données utilisées

4. LIMITES DU SYSTÈME
   - Ne fournit PAS de conseils personnalisés
   - Ne fournit PAS de prédictions de marché
   - Ne connaît PAS le portefeuille de l'utilisateur
   - Peut produire des erreurs factuelles

5. MESURES DE SÉCURITÉ
   - Filtrage des prompts
   - Filtrage des réponses
   - Patterns interdits documentés

6. SUPERVISION HUMAINE
   - Logs des conversations : [OUI/NON]
   - Revue périodique : [Fréquence]
   - Escalade : [Procédure]
```

---

### 4.6 Mécanisme de Feedback/Signalement

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 HAUTE |
| **Réglementation** | AI Act (bonnes pratiques) |
| **Échéance** | Au déploiement |

> **Note DSA :** Le Digital Services Act impose des mécanismes de signalement pour les plateformes dépassant 50 salariés ou 10M€ CA. Cashou est actuellement **exempté** de ces obligations (voir section 1.1). Ce mécanisme est néanmoins recommandé comme bonne pratique AI Act.

**Pourquoi c'est recommandé :**

Un mécanisme de signalement permet de :
- Détecter les réponses problématiques
- Améliorer le système
- Démontrer une démarche de conformité proactive

**Implémentation requise :**

**Bouton sur chaque réponse du chatbot :**

```
[👍] [👎] [⚠️ Signaler]

→ Si [⚠️ Signaler] :

Pourquoi signalez-vous cette réponse ?

○ Information incorrecte
○ Ressemble à un conseil d'investissement
○ Contenu inapproprié
○ Autre : [____________]

[ENVOYER LE SIGNALEMENT]
```

**Stockage :**
```prisma
model ChatbotFeedback {
  id          String   @id @default(cuid())
  userId      String
  messageId   String
  type        FeedbackType // POSITIVE, NEGATIVE, REPORT
  reason      String?
  createdAt   DateTime @default(now())
  reviewed    Boolean  @default(false)
  reviewedAt  DateTime?
  reviewedBy  String?

  @@map("chatbot_feedback")
}
```

---

### 4.7 Journalisation des Conversations

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 HAUTE |
| **Réglementation** | RGPD Art. 5, AI Act (traçabilité) |
| **Attention** | Équilibre vie privée / traçabilité |

**Pourquoi c'est nécessaire :**

La journalisation permet de :
- Répondre aux demandes d'accès (RGPD Art. 15)
- Investiguer les signalements
- Démontrer la conformité en cas de contrôle

**Règles de journalisation :**

| Élément | Stocker | Durée | Justification |
|---------|---------|-------|---------------|
| Question utilisateur | OUI | 1 an | Traçabilité AI Act |
| Réponse chatbot | OUI | 1 an | Traçabilité AI Act |
| Timestamp | OUI | 1 an | Audit |
| UserId | OUI | 1 an | Droit d'accès |
| Conversation complète | NON | - | Minimisation |

**Modèle de données :**
```prisma
model ChatbotInteraction {
  id           String   @id @default(cuid())
  userId       String
  userMessage  String
  botResponse  String
  wasFiltered  Boolean  @default(false) // Si un filtre anti-conseil a été appliqué
  createdAt    DateTime @default(now())

  @@map("chatbot_interactions")
}
```

---

### 4.8 Obligation de Maîtrise IA (AI Literacy)

| Attribut | Valeur |
|----------|--------|
| **Priorité** | 🟠 MOYENNE |
| **Réglementation** | AI Act Art. 4 |
| **Échéance** | 2 février 2025 (déjà applicable) |

**Pourquoi c'est obligatoire :**

L'Article 4 du AI Act impose que les **personnes manipulant des systèmes IA** aient un niveau de compétence suffisant. Cela concerne l'équipe Cashou.

**Actions requises :**

- [ ] Formation de l'équipe technique sur les principes de l'IA
- [ ] Formation sur les risques des chatbots financiers
- [ ] Documentation des compétences acquises
- [ ] Mise à jour régulière (veille AI Act)

---

### 4.9 Synthèse Globale - Phase 2

#### Vue d'ensemble

La Phase 2 ajoute les obligations spécifiques à l'**intelligence artificielle** et renforce les mesures AMF pour le chatbot. Elle **suppose la Phase 1 entièrement terminée** - le chatbot ne peut pas être déployé sur une application non conforme.

#### Réglementations couvertes en Phase 2

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 2 - AVEC CHATBOT IA                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INTELLIGENCE ARTIFICIELLE                 SECTEUR FINANCIER (RENFORCÉ)     │
│  ────────────────────────────              ────────────────────────────────│
│  • AI Act Art. 4 (AI Literacy)            • AMF : Filtres anti-conseil      │
│  • AI Act Art. 50 (Transparence)          • ACPR : Surveillance IA finance  │
│  • Classification : RISQUE LIMITÉ         • Code monétaire et financier     │
│                                                                             │
│  PROTECTION DES DONNÉES (ÉTENDU)           BONNES PRATIQUES                 │
│  ───────────────────────────────           ──────────────────               │
│  • RGPD Art. 5 (journalisation)           • Mécanisme de feedback           │
│  • RGPD Art. 13 (info sur l'IA)           • Documentation technique         │
│                                                                             │
│  ⚠️  CONDITION PRÉALABLE : PHASE 1 COMPLÈTE                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Stratégie chatbot validée : RISQUE LIMITÉ STRICT

| Ce que le chatbot PEUT faire | Ce que le chatbot NE PEUT PAS faire |
|------------------------------|-------------------------------------|
| ✅ Expliquer "qu'est-ce qu'une action" | ❌ "Tu devrais acheter X" |
| ✅ Définir des termes financiers | ❌ "C'est le bon moment pour investir" |
| ✅ Expliquer le fonctionnement des marchés | ❌ Analyser le portefeuille utilisateur |
| ✅ Répondre à des questions générales | ❌ Donner des prédictions de cours |
| ✅ Renvoyer vers des professionnels AMF | ❌ Recommander des actifs spécifiques |

> **Pourquoi cette stratégie ?**
> - Maintient le chatbot en classification **risque limité** (AI Act)
> - Évite toute requalification en **conseiller financier** (AMF)
> - Réduit drastiquement les obligations de conformité
> - Protège Cashou contre les poursuites pour conseil non agréé

#### Livrables juridiques Phase 2

| Document | Format | Responsable | Validation |
|----------|--------|-------------|------------|
| Documentation technique IA | Document interne | Tech + Juridique | Obligatoire |
| Classification AI Act | Document interne | Juridique | Obligatoire |
| Liste des patterns interdits | Code + Documentation | Tech | Obligatoire |
| Procédure supervision humaine | Document interne | Produit | Recommandé |

#### Livrables techniques Phase 2

| Fonctionnalité | Implémentation | Priorité |
|----------------|----------------|----------|
| Mention "Vous parlez à une IA" | Premier message chatbot | 🔴 Bloquant |
| Marquage "Réponse générée par IA" | Footer chaque réponse | 🔴 Bloquant |
| Filtres patterns interdits (entrée) | Middleware chatbot | 🔴 Bloquant |
| Filtres patterns interdits (sortie) | Post-processing | 🔴 Bloquant |
| Réponse standard refus conseil | Template chatbot | 🔴 Bloquant |
| Disclaimer permanent | UI chatbot | 🔴 Bloquant |
| Bouton feedback/signalement | UI chatbot | 🟠 Haute |
| Table `chatbot_interactions` | Schema Prisma | 🟠 Haute |
| Table `chatbot_feedback` | Schema Prisma | 🟠 Haute |

#### Risques si Phase 2 incomplète

| Élément manquant | Risque | Sanction potentielle |
|------------------|--------|---------------------|
| Mention "interaction avec IA" | Non-conformité AI Act | 15M€ / 3% CA |
| Filtres anti-conseil absents | Requalification conseiller financier | Exercice illégal + sanctions AMF |
| Chatbot donne des conseils | Responsabilité civile si perte utilisateur | Dommages-intérêts |
| Pas de journalisation | Impossible de prouver la conformité | Présomption de non-conformité |
| Documentation IA absente | Échec audit ACPR | Sanctions administratives |

#### Calendrier AI Act à respecter

| Date | Obligation | Impact Cashou |
|------|------------|---------------|
| 2 février 2025 | AI Literacy obligatoire | Former l'équipe |
| 2 août 2026 | Transparence chatbots obligatoire | Mention IA + marquage |
| 2 août 2027 | Fin clause grand-père | Conformité complète exigée |

---

### 4.10 Checklist Phase 2

**BLOQUANTS AVANT DÉPLOIEMENT DU CHATBOT :**

- [ ] Classification AI Act documentée (risque limité)
- [ ] Mention "Vous interagissez avec une IA" implémentée
- [ ] Marquage "Réponse générée par IA" sur chaque message
- [ ] Filtres anti-conseil financier actifs
- [ ] Disclaimer permanent dans le chatbot
- [ ] Réponse standard aux demandes de conseil
- [ ] Documentation technique créée
- [ ] Mécanisme de signalement implémenté
- [ ] Journalisation des conversations active

**POST-DÉPLOIEMENT (30 jours) :**

- [ ] Formation AI Literacy de l'équipe
- [ ] Revue des premiers signalements
- [ ] Ajustement des filtres si nécessaire

---

## 5. Matrice de Traçabilité Réglementaire

Ce tableau permet de vérifier que chaque exigence réglementaire est couverte par une action du plan.

### 5.1 RGPD

| Article | Exigence | Action Plan | Phase |
|---------|----------|-------------|-------|
| Art. 5 | Principes de traitement | Politique confidentialité, durées conservation, journalisation IA (4.7) | 1+2 |
| Art. 6 | Base légale | Politique confidentialité (tableau bases légales) | 1 |
| Art. 7 | Conditions du consentement | Système de consentement (3.5) | 1 |
| Art. 8 | Mineurs | Vérification âge + workflow parental (3.7) | 1 |
| Art. 12-14 | Information des personnes | Politique confidentialité (3.1), Documentation IA (4.5) | 1+2 |
| Art. 15 | Droit d'accès | Endpoint export données (3.8.1) | 1 |
| Art. 16 | Droit de rectification | Écran modification profil (3.8.2) | 1 |
| Art. 17 | Droit à l'effacement | Bouton suppression compte (3.8.3) | 1 |
| Art. 20 | Droit à la portabilité | Export JSON (3.8.4) | 1 |
| Art. 21 | Droit d'opposition | Paramètres notifications (3.8.5) | 1 |
| Art. 25 | Privacy by Design | Architecture consentement | 1 |
| Art. 30 | Registre des traitements | Document registre (3.10) | 1 |
| Art. 32 | Sécurité | Mesures techniques (3.11) | 1 |
| Art. 33-34 | Notification violation | Procédure documentée (3.12) | 1 |
| Art. 44-49 | Transferts hors UE | DPA Expo + TIA (3.6) | 1 |

### 5.2 AI Act

| Article | Exigence | Action Plan | Phase |
|---------|----------|-------------|-------|
| Art. 4 | AI Literacy | Formation équipe (4.8) | 2 |
| Art. 50 | Transparence (risque limité) | Mention IA + marquage (4.2) | 2 |
| Annexe III | Classification haut risque | Évitée par design (4.1) | 2 |

### 5.3 Autres réglementations

| Réglementation | Article/Exigence | Action Plan | Phase |
|----------------|------------------|-------------|-------|
| LCEN | Art. 6-III (mentions légales) | Section mentions légales (3.4) | 1 |
| LIL | Art. 45 (mineurs) | Workflow parental (3.7) | 1 |
| LIL | Art. 82 (traceurs) | Consentement notifications (3.5.2) | 1 |
| ePrivacy | Art. 5(3) (stockage terminal) | Consentement push (3.5.2) | 1 |
| Code conso. | Art. L111-1 (info précontract.) | CGU (3.2) | 1 |
| Code conso. | Médiation | Mention médiateur dans CGU | 1 |
| AMF | Non-conseil | Disclaimers (3.3) + Filtres (4.3) | 1+2 |
| OMNIBUS | Transparence | CGU claires (3.2) | 1 |
| **Data Act** | Art. 4-5 (portabilité étendue) | Portabilité RGPD + Data Act (3.8.4) | 1 |
| CRA | Sécurité produit numérique | Mesures sécurité (3.11) | 1 |

---

## 6. Bibliographie et Sources Officielles

### 6.1 Textes de loi

| Réglementation | Référence officielle | Lien |
|----------------|---------------------|------|
| RGPD | Règlement (UE) 2016/679 | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32016R0679) |
| AI Act | Règlement (UE) 2024/1689 | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32024R1689) |
| **Data Act** | Règlement (UE) 2023/2854 | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R2854) |
| LIL | Loi n°78-17 modifiée | [Légifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460) |
| LCEN | Loi n°2004-575 | [Légifrance](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164) |
| ePrivacy | Directive 2002/58/CE | [EUR-Lex](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32002L0058) |
| Code conso. | Code de la consommation | [Légifrance](https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006069565/) |

### 6.2 Autorités de contrôle

| Autorité | Domaine | Site |
|----------|---------|------|
| CNIL | Protection des données | [cnil.fr](https://www.cnil.fr) |
| AMF | Marchés financiers | [amf-france.org](https://www.amf-france.org) |
| ACPR | Banque/Assurance + AI Act finance | [acpr.banque-france.fr](https://acpr.banque-france.fr) |

### 6.3 Guides et recommandations

| Source | Document | Lien |
|--------|----------|------|
| CNIL | FAQ AI Act | [cnil.fr/fr/entree-en-vigueur-du-reglement-europeen-sur-lia](https://www.cnil.fr/fr/entree-en-vigueur-du-reglement-europeen-sur-lia-les-premieres-questions-reponses-de-la-cnil) |
| CNIL | Recommandations cookies | [cnil.fr/cookies](https://www.cnil.fr/fr/cookies-et-autres-traceurs) |
| ACPR | AI Act secteur financier | [acpr.banque-france.fr/ai-act](https://acpr.banque-france.fr/fr/reglementation/focus-sur-la-reglementation/transverse/reglement-europeen-sur-lia-ai-act) |
| Dastra | Obligations AI Act 2025 | [dastra.eu/ai-act-2025](https://www.dastra.eu/fr/article/ai-act-quelles-obligations-sappliquent-des-le-2-fevrier-2025/58851) |

### 6.4 Jurisprudence clé

| Décision | Impact | Référence |
|----------|--------|-----------|
| Schrems II (CJUE 2020) | Transferts UE-US | C-311/18 |
| Google CNIL (2022) | Cookies/Consentement | Délibération SAN-2022-008 |

---

## Validation du Plan

| Rôle | Nom | Date | Signature |
|------|-----|------|-----------|
| Responsable Juridique | | | |
| Directeur Technique | | | |
| DPO (si désigné) | | | |
| Direction Générale | | | |

---

*Document généré le 30 janvier 2026*
*Prochaine révision obligatoire : avant chaque mise à jour majeure de l'application*
