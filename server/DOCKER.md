# Docker Deployment Guide

This directory contains everything needed to run the Shopping List API and MongoDB using Docker containers.

## Quick Start

1. **Copy environment file:**

   ```bash
   cp .env.docker .env
   ```

2. **Edit environment variables:**

   ```bash
   nano .env  # or your preferred editor
   ```

   **Important**: Change the `JWT_SECRET_KEY` value in production!

3. **Start the services:**

   ```bash
   docker-compose up -d
   ```

4. **Check service health:**
   ```bash
   docker-compose ps
   curl http://localhost:5000/health
   ```

## Services

### API Service

- **Port**: 5000
- **Health Check**: `http://localhost:5000/health`
- **API Info**: `http://localhost:5000/api`

### MongoDB Service

- **Port**: 27017
- **Database**: `shopping_list_db`
- **Data Persistence**: Docker volume `mongodb_data`

## Useful Commands

### View logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f mongodb
```

### Stop services

```bash
docker-compose down
```

### Stop and remove volumes (WARNING: This deletes all data!)

```bash
docker-compose down -v
```

### Rebuild API container

```bash
docker-compose build api
docker-compose up -d api
```

### Access MongoDB shell

```bash
docker-compose exec mongodb mongosh shopping_list_db
```

## Production Deployment

For production deployment:

1. Set `FLASK_ENV=production` in docker-compose.yml
2. Use strong, unique value for `JWT_SECRET_KEY`
3. Configure proper CORS settings in `FRONTEND_URL`
4. Set up proper logging and monitoring
5. Use Docker secrets for sensitive values
6. Set up SSL/TLS termination (reverse proxy like nginx)
7. Regular backups of MongoDB data

## Troubleshooting

### API won't start

- Check if MongoDB is healthy: `docker-compose ps`
- View API logs: `docker-compose logs api`
- Ensure environment variables are set correctly

### Database connection issues

- Verify MongoDB container is running: `docker-compose ps mongodb`
- Check MongoDB logs: `docker-compose logs mongodb`
- Test connection: `docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"`

### Port conflicts

- Change port mappings in docker-compose.yml if 5000 or 27017 are already in use
- Update FRONTEND_URL accordingly
