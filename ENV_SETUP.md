# Configuration des Variables d'Environnement

Ce projet utilise deux fichiers d'environnement pour supporter le développement local et Docker :

## Fichiers d'environnement

### `.env` - Développement local
- Utilisé pour le développement local avec les bases de données tournant sur localhost
- Les URL de base de données pointent vers `localhost:5432` et `localhost:5433`

### `.env.docker` - Docker
- Utilisé automatiquement par Docker Compose
- Les URL de base de données pointent vers les services Docker (`db_cashou` et `db_backoffice`)

## Utilisation

### Développement local
1. Assurez-vous que les bases de données PostgreSQL sont démarrées :
   ```bash
   docker-compose up db_cashou db_backoffice -d
   ```

2. Utilisez le fichier `.env` par défaut (déjà configuré pour localhost)

3. Démarrez vos applications :
   ```bash
   # Backend
   cd apps/backend
   bun run dev

   # Backoffice
   cd apps/backoffice
   bun run dev
   ```

### Docker complet
1. Démarrez tous les services avec Docker Compose :
   ```bash
   docker-compose up
   ```

2. Docker Compose utilise automatiquement `.env.docker` pour configurer les variables d'environnement

## Configuration des URLs de base de données

### Pour le développement local (dans `.env`)
```bash
CASHOU_DB_URL="postgresql://postgres:password@localhost:5432/cashou_db"
BACKOFFICE_DB_URL="postgresql://postgres:password@localhost:5433/backoffice"
```

### Pour Docker (dans `.env.docker`)
```bash
CASHOU_DB_URL="postgresql://postgres:password@db_cashou:5432/cashou_db"
BACKOFFICE_DB_URL="postgresql://postgres:password@db_backoffice:5432/backoffice"
```

## Avantages de cette approche

1. **Simplicité** : Un seul fichier pour chaque environnement
2. **Flexibilité** : Facile de basculer entre local et Docker
3. **Clarté** : Chaque fichier a un rôle bien défini
4. **Maintenance** : Pas de duplication de configuration

## Aide mémoire

- **Bases de données seulement** : `docker-compose up db_cashou db_backoffice -d`
- **Tout en Docker** : `docker-compose up`
- **Arrêt complet** : `docker-compose down`
