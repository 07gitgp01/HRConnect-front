# 📋 Plan de Migration HRConnect-Front vers Supabase

**Date**: 2026-04-17  
**Projet**: HRConnect-Front  
**Base actuelle**: JSON (bd.json)  
**Cible**: Supabase (PostgreSQL)

---

## 1️⃣ ANALYSE DE LA STRUCTURE ACTUELLE

### Tables/Collections Identifiées (13)

| Table | Records | Status |
|-------|---------|--------|
| `users` | 2 | Active |
| `admins` | 1 | Active |
| `volontaires` | 1 | Active |
| `projets` | 1 | Active |
| `partenaires` | 3 | Active |
| `candidatures` | 0 | Vide |
| `candidaturesRecues` | 0 | Vide |
| `affectations` | 0 | Vide |
| `alertes` | 0 | Vide |
| `contactMessages` | 1 | Active |
| `parametres` | 0 | Vide |
| `offresMission` | 0 | Vide |
| `rapports` | 0 | Vide |
| `types` | 0 | Vide |
| `rapports-ptf` | 0 | Vide |

---

## 2️⃣ ÉTAPES DE MIGRATION - CHECKLIST RAPIDE

### Phase 1: Préparation (1-2 jours)
- [ ] Créer un compte Supabase gratuit
- [ ] Créer un nouveau projet Supabase
- [ ] Télécharger et sauvegarder les credentials
- [ ] Créer une branche Git pour la migration
- [ ] Installer les dépendances Supabase

### Phase 2: Infrastructure BD (1 jour)
- [ ] Exécuter les scripts SQL dans Supabase SQL Editor
- [ ] Vérifier que toutes les tables sont créées
- [ ] Vérifier les indexes et relations
- [ ] Configurer les RLS (optionnel)

### Phase 3: Sécurité (1 jour)
- [ ] Hasher tous les passwords (bcrypt/argon2)
- [ ] Migrer les données de manière sécurisée
- [ ] Supprimer le fichier bd.json du versioning
- [ ] Ajouter .env.local au .gitignore
- [ ] Mettre en place l'authentification Supabase Auth

### Phase 4: Migration des Données (1-2 jours)
- [ ] Créer le script de migration
- [ ] Tester avec quelques enregistrements
- [ ] Migrer toutes les tables
- [ ] Vérifier l'intégrité des données

### Phase 5: Refactoring Angular (3-5 jours)
- [ ] Créer SupabaseService
- [ ] Refactorer AuthService
- [ ] Refactorer tous les services métier
- [ ] Tester chaque fonction

### Phase 6: Tests (2-3 jours)
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests de connexion/déconnexion
- [ ] Tests des relations

### Phase 7: Déploiement (1-2 jours)
- [ ] Configurer les variables d'environnement
- [ ] Build production
- [ ] Déployer en staging
- [ ] Tests en staging
- [ ] Déployer en production

### Phase 8: Nettoyage (1 jour)
- [ ] Supprimer les références à bd.json
- [ ] Optimiser les queries
- [ ] Documentation

---

## 3️⃣ STRUCTURE POSTGRESQL

Identique à la migration principale - voir `SQL_SCHEMA_SUPABASE.sql`

---

## ⚡ **QUICK START**

### 1. Créer projet Supabase
```bash
# Aller sur https://supabase.com
# Créer un nouveau projet
```

### 2. Exécuter le schéma SQL
```bash
# Copier tout le contenu de SQL_SCHEMA_SUPABASE.sql
# Le coller dans Supabase SQL Editor
# Exécuter
```

### 3. Configurer Angular
```bash
npm install @supabase/supabase-js bcryptjs
```

### 4. Créer environment.ts
```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'https://xxxx.supabase.co',
    key: 'eyJ...',
  }
};
```

### 5. Migrer les données
```bash
# Utiliser migration.service.ts
```

### 6. Refactorer les services
```typescript
# Remplacer JSON par Supabase
```

---

## 📞 RESSOURCES

- [Supabase Docs](https://supabase.com/docs)
- [Supabase + Angular](https://supabase.com/docs/guides/with-angular)

---

**Timeline totale**: 11-17 jours

**Status**: À démarrer
