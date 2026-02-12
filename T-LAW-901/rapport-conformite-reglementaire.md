# Rapport de Conformité Réglementaire — Cashou

**Version :** 1.0
**Date :** 12 février 2026
**Objet :** Traitement des réglementations dans l'application mobile et le site internet Cashou

---

## 1. Présentation de Cashou

Cashou est une application mobile d'éducation financière gamifiée, développée dans le cadre d'un projet Epitech. Son objectif est de rendre accessible la compréhension des mécanismes financiers (épargne, bourse, investissement) à un public large, notamment les jeunes adultes à partir de 15 ans, à travers un environnement ludique et sans risque.

L'application propose les fonctionnalités suivantes :

- **Apprentissage par le jeu :** des niveaux progressifs permettent de découvrir les concepts financiers étape par étape.
- **Portefeuille virtuel :** simulation de transactions boursières avec de l'argent fictif, permettant de comprendre les mécanismes d'achat et de vente sans aucun risque financier réel.
- **Système de progression :** points, étoiles et badges récompensent la régularité et les bonnes réponses.
- **Quiz quotidiens :** des questionnaires à choix multiples renforcent les connaissances acquises.
- **Dictionnaire financier :** glossaire intégré des termes de la finance.
- **Notifications push :** rappels personnalisables pour maintenir l'engagement de l'utilisateur.

Cashou ne constitue en aucun cas un service de conseil en investissement. L'application est strictement éducative et pédagogique. Aucun argent réel n'est manipulé. Une popup d'avertissement sera affichée avant le lancement du premier niveau de jeu, rappelant clairement à l'utilisateur que le contenu est simulé et ne doit pas être interprété comme un conseil financier.

L'écosystème Cashou comprend deux composantes numériques distinctes :

- **L'application mobile** (iOS et Android), développée avec React Native / Expo, qui constitue le coeur du service.
- **Le site internet vitrine**, hébergé sur Vercel, qui présente le projet et renvoie vers les stores de téléchargement.

Chacune de ces composantes est soumise à des obligations réglementaires spécifiques, détaillées dans ce rapport.

---

## 2. Documents Juridiques Obligatoires

La conformité de Cashou nécessite la rédaction et la mise à disposition de plusieurs documents juridiques distincts. Il est essentiel de bien séparer ces documents car ils ont des objets, des bases légales et des contenus différents.

### 2.1 Mentions Légales (LCEN)

Les mentions légales sont imposées par la **Loi pour la Confiance dans l'Économie Numérique (LCEN, Art. 6-III)**, renforcée par la **loi SREN de 2024**. Elles doivent être accessibles aussi bien sur le site internet que dans l'application mobile, via un menu dédié « Mentions légales ».

**Contenu obligatoire :**

| Information | Obligation |
|---|---|
| Dénomination sociale | Obligatoire |
| Forme juridique (SAS, SARL, etc.) | Obligatoire |
| Adresse du siège social | Obligatoire |
| Capital social | Obligatoire |
| Numéro RCS / SIRET | Obligatoire |
| Numéro de téléphone | Obligatoire |
| Adresse email de contact | Obligatoire |
| Nom du directeur de publication | Obligatoire |
| Numéro de TVA intracommunautaire | Si assujetti |

**Identification de l'hébergeur et des prestataires externes :**

La LCEN impose également l'identification complète de l'hébergeur. Or, Cashou fait appel à plusieurs prestataires techniques qu'il convient de lister :

| Prestataire | Rôle | Localisation | Données concernées |
|---|---|---|---|
| Hébergeur base de données (Scaleway / OVH / Infomaniak) | Hébergement des données applicatives | Union Européenne | Toutes les données utilisateurs |
| **Vercel Inc.** | Hébergement du site internet vitrine | USA (CDN mondial) | Données de navigation, cookies analytiques |
| **Expo (EAS) Inc.** | Service de notifications push et build de l'application | USA | Push tokens, identifiants techniques |
| **Apple (APNs)** | Relais des notifications push iOS | USA | Push tokens iOS |
| **Google (FCM)** | Relais des notifications push Android | USA | Push tokens Android |

Chaque prestataire doit être identifié dans les mentions légales avec au minimum son nom, son adresse et un moyen de contact. Les mentions légales doivent également figurer dans les descriptions des fiches App Store et Google Play Store, avant même le téléchargement de l'application.

**Sanctions encourues en cas d'absence :** 1 an d'emprisonnement et 75 000 euros d'amende pour les personnes physiques, 375 000 euros pour les personnes morales.

### 2.2 Conditions Générales d'Utilisation (CGU)

Les CGU constituent le contrat entre Cashou et ses utilisateurs. Elles sont distinctes des mentions légales et de la politique de confidentialité. Leur rédaction s'appuie sur le **Code de la consommation (Art. L111-1 et suivants)** et la **Directive OMNIBUS (2019/2161)** qui imposent une information précontractuelle claire et transparente.

**Contenu des CGU :**

**a) Objet du service et avertissement financier**
Description précise de Cashou comme application d'éducation financière gamifiée. Mention explicite que le service est une simulation pédagogique et ne constitue pas un conseil en investissement au sens du Code monétaire et financier. Renvoi vers les professionnels agréés AMF pour toute décision financière réelle.

**b) Conditions d'accès et confirmation d'âge**
L'accès au service est réservé aux personnes âgées de 15 ans et plus. En dessous de 15 ans, le consentement du titulaire de l'autorité parentale est requis (conformément à l'Art. 8 du RGPD, transposé en droit français). La confirmation de l'âge (15 ans minimum) doit être intégrée dans la case à cocher de consentement aux CGU lors de l'inscription, sous la forme :

> *"Je certifie avoir 15 ans ou plus (ou disposer de l'autorisation de mon représentant légal) et j'accepte les Conditions Générales d'Utilisation."*

**c) Règles du jeu**
Les CGU doivent inclure une section dédiée aux règles du jeu. Celle-ci précise :

- Le fonctionnement du système de niveaux et de progression.
- Les règles d'attribution des points, étoiles et badges.
- Le caractère fictif du portefeuille virtuel et des transactions simulées : aucun argent réel n'est engagé, les cours utilisés sont simulés à des fins pédagogiques.
- Les conditions de participation aux quiz quotidiens.
- *[Section à compléter avec les règles spécifiques de chaque mode de jeu.]*

**d) Limitations et exclusions de responsabilité**
Cashou décline toute responsabilité en cas de pertes financières réelles résultant de décisions prises par un utilisateur sur la base des connaissances acquises via l'application. Les contenus sont fournis « en l'état » et à titre strictement éducatif. Cashou ne garantit pas l'exactitude, l'exhaustivité ou l'actualité des informations financières présentées dans les simulations.

**e) Propriété intellectuelle**
L'ensemble des contenus de l'application (textes, graphismes, interface, code source, bases de données, logo, marque Cashou) sont protégés par le droit de la propriété intellectuelle. Toute reproduction, représentation ou exploitation non autorisée est interdite. Les contenus générés par l'utilisateur (pseudonyme, avatar) restent sa propriété, mais l'utilisateur concède à Cashou une licence d'utilisation non exclusive pour le fonctionnement du service.

**f) Résiliation et suppression de compte**
L'utilisateur peut résilier son compte à tout moment depuis les paramètres de l'application. La suppression effective intervient dans un délai maximum de 30 jours. Renvoi vers la politique de confidentialité pour le détail du traitement des données après suppression.

**g) Droit applicable**
Droit français. Tribunaux français compétents. Mention obligatoire du médiateur de la consommation pour les litiges B2C.

### 2.3 Politique de Confidentialité

La politique de confidentialité est un document autonome, distinct des CGU et des mentions légales. Elle est imposée par le **RGPD (Art. 12, 13, 14)** et doit informer de manière transparente les utilisateurs sur le traitement de leurs données personnelles.

**Contenu obligatoire :**

- Identité et coordonnées du responsable de traitement.
- Finalités et bases légales de chaque traitement (contrat, consentement, intérêt légitime).
- Catégories de données collectées (identité, email, âge, progression, données de connexion).
- Destinataires des données (équipe Cashou, hébergeur UE, Expo, Vercel).
- Transferts hors UE (détaillés en section 4 du présent rapport).
- Durées de conservation (détaillées en section 5).
- Droits des personnes : accès (Art. 15), rectification (Art. 16), effacement (Art. 17), portabilité (Art. 20), opposition (Art. 21).
- Modalités d'exercice des droits (adresse email dédiée, formulaire dans l'application).
- Droit d'introduire une réclamation auprès de la CNIL (www.cnil.fr).
- Politique de gestion des cookies (détaillée en section 3).

La politique de confidentialité doit être accessible depuis l'écran d'inscription (avant validation du compte), depuis le menu des paramètres de l'application et depuis le pied de page du site internet.

---

## 3. Gestion des Cookies et Consentement

### 3.1 Cookies sur le site internet (Vercel)

Le site internet vitrine de Cashou est hébergé sur **Vercel**. La plateforme Vercel intègre nativement un système d'analytics (Vercel Web Analytics / Speed Insights) qui permet de suivre les visites et les performances du site via le dashboard Vercel. Ce système dépose des **cookies analytiques** dans le navigateur des visiteurs.

Ces cookies ne sont **pas strictement nécessaires** au fonctionnement du site. Ils servent à collecter des données de fréquentation (nombre de visites, pages vues, durée des sessions, origine géographique approximative). Conformément à la **Directive ePrivacy (2002/58/CE)**, transposée en droit français par l'**Art. 82 de la Loi Informatique et Libertés**, le dépôt de ces cookies requiert le **consentement préalable** de l'utilisateur.

Cashou ne déploie aucun cookie publicitaire ni aucun traceur de ciblage marketing, que ce soit sur le site ou dans l'application.

**Obligation : bandeau cookie sur le site internet**

Un bandeau de recueil du consentement doit être affiché dès la première visite sur le site internet. Ce bandeau doit respecter les recommandations de la CNIL :

- Présenter les boutons « Accepter » et « Refuser » de manière **équivalente** (même taille, même visibilité, pas de biais visuel).
- Informer sur les finalités des cookies (mesure d'audience Vercel).
- Permettre un paramétrage fin si plusieurs catégories de cookies existent.
- Ne déposer aucun cookie non essentiel avant l'obtention du consentement.
- Permettre le retrait du consentement à tout moment, de manière aussi simple que son octroi.

La durée de validité du consentement cookie est de **13 mois maximum** (recommandation CNIL). Au-delà, le consentement doit être redemandé.

### 3.2 Cookie technique dans l'application mobile

L'application mobile Cashou utilise un **cookie de session technique** (ou mécanisme équivalent de type token JWT stocké localement) pour maintenir l'authentification de l'utilisateur. Ce cookie est **strictement nécessaire** au fonctionnement du service et bénéficie de l'**exemption ePrivacy** : il ne requiert pas de consentement préalable.

Ce cookie technique a pour seules finalités :

- Maintenir la session authentifiée de l'utilisateur.
- Assurer la sécurité de la connexion (token signé, expiration automatique).

Aucun cookie analytique, publicitaire ou de tracking n'est déposé dans l'application mobile.

### 3.3 Gestion du consentement multi-appareil (multidevice)

**Problématique :** un utilisateur accepte les cookies et les conditions sur un appareil Android, puis se connecte à son compte depuis un appareil iOS. Comment gérer la cohérence du consentement ?

**Recommandation :** le consentement aux CGU et à la politique de confidentialité doit être **lié au compte utilisateur** et stocké en base de données (côté serveur), et non localement sur l'appareil. Ainsi, lorsqu'un utilisateur se connecte depuis un nouvel appareil, le système vérifie en base de données si le consentement a déjà été enregistré pour la version en vigueur des documents juridiques.

Fonctionnement recommandé :

1. **Inscription sur l'appareil A (Android) :** l'utilisateur coche la case de consentement aux CGU et à la politique de confidentialité. Ce consentement est stocké en base de données avec horodatage, version des documents et adresse IP.
2. **Connexion sur l'appareil B (iOS) :** le système détecte que le consentement pour la version en cours des CGU/politique est déjà enregistré. Aucune action supplémentaire n'est requise.
3. **Mise à jour des CGU/politique :** si une nouvelle version des documents est publiée, le consentement est redemandé sur **le premier appareil où l'utilisateur se connecte** après la mise à jour, quel qu'il soit. Le nouveau consentement est enregistré en base et vaut pour tous les appareils.

Pour le consentement aux cookies du site internet, celui-ci reste **local au navigateur** (cookie de consentement stocké côté client), car le site vitrine ne nécessite pas d'authentification.

Cette architecture garantit la conformité RGPD en assurant la traçabilité du consentement (date, version, preuve) tout en offrant une expérience utilisateur fluide sur tous les appareils.

---

## 4. Transferts de Données Hors Union Européenne

### 4.1 Cartographie des transferts

La base de données principale de Cashou est hébergée au sein de l'Union Européenne (Scaleway, OVH ou Infomaniak). Les données personnelles des utilisateurs (profil, progression, historique) ne quittent donc pas l'UE pour le stockage principal.

Cependant, certains prestataires techniques impliquent un transfert de données vers les États-Unis :

| Prestataire | Données transférées | Pays | Sensibilité |
|---|---|---|---|
| **Expo Inc.** | Push tokens (identifiants techniques de notification) | USA | Faible — identifiant technique uniquement |
| **Vercel Inc.** | Données de navigation du site (IP, User-Agent, pages vues) | USA (CDN mondial) | Faible — données de navigation anonymisables |
| **Apple (APNs)** | Push tokens iOS | USA | Faible — identifiant technique |
| **Google (FCM)** | Push tokens Android | USA | Faible — identifiant technique |

### 4.2 Cadre juridique des transferts UE-US

Depuis l'arrêt **Schrems II** de la Cour de Justice de l'Union Européenne (CJUE, 16 juillet 2020, affaire C-311/18), le Privacy Shield UE-US a été invalidé. Le **EU-US Data Privacy Framework (DPF)**, adopté le 10 juillet 2023 par la Commission Européenne, constitue la nouvelle décision d'adéquation permettant les transferts vers les entreprises américaines certifiées.

Toutefois, la pérennité du DPF reste incertaine (un recours « Schrems III » est en cours devant la CJUE). Il est donc recommandé de ne pas se reposer uniquement sur le DPF et de mettre en place des garanties complémentaires.

### 4.3 Actions de conformité RGPD pour les transferts

**a) Data Processing Agreement (DPA)**

Un DPA doit être signé avec chaque sous-traitant qui traite des données personnelles pour le compte de Cashou. Ce contrat, exigé par l'**Art. 28 du RGPD**, doit préciser :

- La nature et la finalité du traitement.
- Les catégories de données concernées.
- Les obligations du sous-traitant (sécurité, confidentialité, suppression en fin de contrat).
- Les droits d'audit du responsable de traitement.

**État des DPA à formaliser :**

| Prestataire | DPA disponible | Action requise |
|---|---|---|
| Expo Inc. | Disponible sur expo.dev/legal | Télécharger, vérifier la présence des SCCs, signer et archiver |
| Vercel Inc. | Disponible dans les conditions de service Vercel | Vérifier l'inclusion du DPA et des SCCs, archiver |
| Apple (APNs) | Couvert par l'Apple Developer Agreement | Vérifier les clauses de traitement des données |
| Google (FCM) | Couvert par les Google Cloud Terms | Vérifier les clauses de traitement des données |

**b) Standard Contractual Clauses (SCCs)**

En complément du DPF (ou en remplacement si celui-ci est invalidé), les **Clauses Contractuelles Types** (version adoptée par la Commission Européenne le 4 juin 2021) doivent être annexées aux DPA. Les SCCs constituent la garantie juridique de référence pour les transferts hors UE.

Il convient de vérifier que les DPA d'Expo et de Vercel intègrent bien les SCCs dans leur version 2021 (et non l'ancienne version, qui n'est plus valide).

**c) Transfer Impact Assessment (TIA)**

Une évaluation d'impact du transfert doit être réalisée pour chaque flux de données vers les États-Unis. Cette analyse, recommandée par le Comité Européen de la Protection des Données (CEPD), doit documenter :

1. **Nature des données transférées :** pour Expo, il s'agit uniquement de push tokens (identifiants techniques), qui ne contiennent aucune donnée personnelle sensible. Pour Vercel, il s'agit de données de navigation (adresse IP, User-Agent).
2. **Législation américaine applicable :** le Cloud Act permet aux autorités américaines de requérir l'accès aux données détenues par des entreprises US. Le FISA Section 702 autorise la surveillance de personnes non américaines. Ces risques doivent être évalués au regard de la nature des données transférées.
3. **Mesures techniques supplémentaires :** chiffrement TLS en transit pour toutes les communications avec les prestataires US, minimisation des données transférées (aucun contenu utilisateur n'est envoyé à Expo, uniquement le push token), pseudonymisation des données de navigation sur le site.
4. **Conclusion de la TIA :** compte tenu de la nature purement technique et non sensible des données transférées (push tokens, données de navigation), et des mesures de protection mises en place (SCCs, chiffrement), le risque résiduel pour les droits et libertés des personnes concernées est évalué comme **acceptable**.

La TIA doit être documentée par écrit, datée et conservée pour pouvoir être présentée à la CNIL en cas de contrôle.

---

## 5. Mesures de Sécurité et Conservation des Données

### 5.1 Mesures techniques de sécurité (RGPD Art. 32)

L'Article 32 du RGPD impose la mise en oeuvre de mesures techniques et organisationnelles appropriées pour garantir un niveau de sécurité adapté au risque. Les mesures suivantes sont prévues pour Cashou :

**Mesures techniques :**

| Mesure | Description | Statut |
|---|---|---|
| Chiffrement HTTPS/TLS | Toutes les communications entre l'application et le serveur sont chiffrées via TLS 1.2 minimum | Obligatoire avant lancement |
| Hachage des mots de passe | Utilisation de bcrypt (via Better-Auth) pour le stockage sécurisé des mots de passe | En place |
| Tokens JWT signés | Authentification par tokens signés avec expiration automatique | En place |
| Sessions en base de données | Les sessions sont stockées côté serveur avec expiration configurable | En place |
| Rate limiting | Limitation du nombre de tentatives de connexion pour prévenir les attaques par force brute | À implémenter |
| Validation des entrées | Validation et assainissement de toutes les entrées utilisateur pour prévenir les injections (SQL, XSS) | À implémenter |
| Journalisation des connexions | Logs sécurisés des tentatives de connexion (réussies et échouées) | À implémenter |

**Mesures organisationnelles :**

| Mesure | Description |
|---|---|
| Principe du moindre privilège | Chaque membre de l'équipe n'a accès qu'aux données strictement nécessaires à sa mission |
| Gestion des accès | Les accès à la base de données de production et aux consoles d'administration sont restreints et tracés |
| Procédure de notification de violation | En cas de violation de données, la CNIL sera notifiée dans les 72 heures (Art. 33 RGPD). Si le risque est élevé pour les personnes concernées, celles-ci seront informées (Art. 34 RGPD) |
| Sensibilisation de l'équipe | L'équipe de développement est formée aux bonnes pratiques de sécurité (OWASP Top 10) et à la protection des données personnelles |
| Sauvegardes régulières | Sauvegardes chiffrées de la base de données, testées périodiquement, stockées dans l'UE |
| Revue de sécurité | Audit de sécurité du code et de l'infrastructure avant chaque mise en production majeure |

### 5.2 Durées de conservation des données

Le RGPD (Art. 5.1.e) impose de ne pas conserver les données personnelles plus longtemps que nécessaire pour la finalité du traitement. Les durées de conservation suivantes sont recommandées pour Cashou :

| Type de données | Durée de conservation | Justification | Action à l'expiration |
|---|---|---|---|
| Compte utilisateur actif | Durée de vie du compte | Exécution du contrat (Art. 6.1.b) | — |
| Compte utilisateur inactif | **3 ans** après la dernière activité | Intérêt légitime, conforme aux recommandations CNIL | Notification à l'utilisateur (email) 30 jours avant suppression, puis suppression automatique |
| Données de progression (niveaux, points, badges) | Durée de vie du compte + 1 an | Intérêt légitime (statistiques anonymisées) | Anonymisation des données statistiques, suppression des données nominatives |
| Historique des transactions simulées | Durée de vie du compte | Exécution du contrat | Suppression avec le compte |
| Résultats des quiz | Durée de vie du compte | Exécution du contrat | Suppression avec le compte |
| Sessions de connexion expirées | **30 jours** après expiration | Sécurité | Purge automatique |
| Logs de sécurité (adresses IP, tentatives de connexion) | **1 an** | Obligation légale (LCEN Art. 6-II) | Purge automatique |
| Preuves de consentement (CGU, politique, cookies) | **5 ans** après le dernier consentement | Preuve juridique en cas de litige | Archivage sécurisé |
| Données d'un compte supprimé | **30 jours** maximum (délai de suppression effective) | Permettre l'annulation de la demande | Suppression définitive et irréversible |

Un mécanisme automatisé (job CRON serveur) doit être mis en place pour appliquer ces durées de conservation de manière systématique et auditable.

### 5.3 Avertissement financier : popup avant le premier niveau

Conformément aux exigences de l'AMF et pour éviter toute requalification du service en conseil en investissement, une **popup d'avertissement** sera affichée avant le lancement du premier niveau de jeu. Cette popup contiendra :

> **Simulation éducative uniquement**
> Les informations présentées dans Cashou sont purement fictives et à but pédagogique. Elles ne constituent en aucun cas un conseil en investissement, une recommandation d'achat ou de vente, ni une incitation à investir. Pour toute décision d'investissement réelle, consultez un professionnel agréé par l'AMF (www.amf-france.org).

L'utilisateur devra confirmer avoir pris connaissance de cet avertissement avant de pouvoir accéder au contenu de jeu. Cet avertissement ne sera affiché qu'une seule fois (au premier lancement), mais un rappel sera accessible en permanence dans les paramètres de l'application et en pied de page des écrans de simulation.

---

## 6. Synthèse des Réglementations Applicables

| Réglementation | Applicable | Priorité | Traitement dans Cashou |
|---|---|---|---|
| **RGPD** (UE 2016/679) | Oui | Critique | Politique de confidentialité, droits utilisateurs, consentement, transferts hors UE encadrés, durées de conservation |
| **ePrivacy** (Directive 2002/58/CE) | Oui | Haute | Bandeau cookie sur le site, consentement notifications push opt-in, cookie technique exempté dans l'app |
| **LCEN** (Loi n°2004-575) | Oui | Haute | Mentions légales complètes (éditeur, hébergeur, prestataires externes), accessibles dans l'app et sur le site |
| **Code de la consommation / OMNIBUS** | Oui | Moyenne | CGU claires et lisibles, information précontractuelle, médiation, droit de rétractation si services payants |
| **AMF / ACPR** | Vigilance | Critique | Disclaimers financiers permanents, popup d'avertissement, posture strictement éducative |
| **Data Act** (UE 2023/2854) | Partiel | Moyenne | Portabilité étendue des données (export JSON), y compris données de progression |
| **CRA** (Cyber Resilience Act) | Potentiel | Basse | Anticipation via les mesures de sécurité (Art. 32 RGPD) |
| **DSA** (Digital Services Act) | Exemption probable | Basse | Cashou reste sous les seuils (< 50 salariés, < 10 M euros CA) |

---

## 7. Bibliographie et Sources

### Textes de loi

- Règlement (UE) 2016/679 du 27 avril 2016 (RGPD) — EUR-Lex : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32016R0679
- Directive 2002/58/CE du 12 juillet 2002 (ePrivacy) — EUR-Lex : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32002L0058
- Loi n°2004-575 du 21 juin 2004 (LCEN) — Légifrance : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164
- Loi n°78-17 du 6 janvier 1978 modifiée (Loi Informatique et Libertés) — Légifrance : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000886460
- Règlement (UE) 2023/2854 du 13 décembre 2023 (Data Act) — EUR-Lex : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R2854
- Code de la consommation — Légifrance : https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006069565/

### Jurisprudence

- CJUE, 16 juillet 2020, Schrems II, affaire C-311/18
- CNIL, Délibération SAN-2022-008 (Google, cookies/consentement)

### Guides et recommandations

- CNIL, Recommandations sur les cookies et autres traceurs : https://www.cnil.fr/fr/cookies-et-autres-traceurs
- CNIL, FAQ AI Act : https://www.cnil.fr/fr/entree-en-vigueur-du-reglement-europeen-sur-lia-les-premieres-questions-reponses-de-la-cnil
- Commission Européenne, Décision d'adéquation EU-US Data Privacy Framework, 10 juillet 2023
