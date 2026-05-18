# Carenexus AI Backend - Deployment Guide

## Overview

This guide covers deploying the Carenexus AI Backend to production environments. The system uses Docker Compose for orchestration with PostgreSQL, Ollama, ChromaDB, and FastAPI running as separate containerized services.

## Prerequisites

### Hardware Requirements

**Minimum for Development:**
- CPU: 4 cores
- Memory: 8GB RAM
- Storage: 50GB (for models and data)

**Recommended for Production:**
- CPU: 8+ cores
- Memory: 32GB RAM (Ollama models require 6-8GB)
- Storage: 200GB+ (SSD preferred)
- GPU: NVIDIA CUDA-capable (optional but recommended for vision/LLM)

### Software Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git
- SSL certificates (for HTTPS)

## Pre-Deployment Checklist

- [ ] Server with sufficient resources allocated
- [ ] SSL/TLS certificates obtained (Let's Encrypt or custom CA)
- [ ] Database credentials generated and stored securely
- [ ] Environment variables configured
- [ ] Firewall rules configured (ports 80, 443 open to internet)
- [ ] Backup strategy planned
- [ ] Monitoring setup prepared
- [ ] Load testing completed

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/yourorga/carenexus-ai-backend.git
cd carenexus-ai-backend
```

### 2. Configure Environment

Create `.env.prod` file with production values:

```bash
# Database
DB_USER=carenexus_user
DB_PASSWORD=$(openssl rand -base64 32)  # Generate secure password
DB_NAME=carenexus_prod_db

# Application
APP_ENV=production
LOG_LEVEL=INFO
SECRET_KEY=$(openssl rand -base64 64)

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Ollama
OLLAMA_HOST=http://ollama:11434

# File paths
XRAY_STORAGE_PATH=/data/xrays
MODEL_PATH=/data/models
KNOWLEDGE_BASE_PATH=/data/knowledge_base

# Timeouts (seconds)
REQUEST_TIMEOUT=300
VISION_TIMEOUT=60
LLM_TIMEOUT=120
```

**Security Tips:**
- Generate all passwords/secrets using `openssl rand -base64 N`
- Store credentials in secure vault (AWS Secrets Manager, HashiCorp Vault)
- Rotate credentials every 90 days
- Use different credentials for dev/staging/production

### 3. Prepare SSL Certificates

```bash
# For Let's Encrypt (requires domain)
docker run -it --rm --name certbot \
  -v "./ssl:/etc/letsencrypt" \
  certbot/certbot certonly --standalone -d yourdomain.com

# Or use existing certificates
mkdir -p ssl
cp /path/to/cert.pem ssl/cert.pem
cp /path/to/key.pem ssl/key.pem
chmod 600 ssl/key.pem
```

### 4. Create Data Directories

```bash
mkdir -p data/xrays data/models data/knowledge_base
chmod 755 data/
```

### 5. Deploy with Docker Compose

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services in background
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 6. Initialize Database

```bash
# Run migrations (if applicable)
docker-compose -f docker-compose.prod.yml exec backend \
  python -m alembic upgrade head

# Or initialize database
docker-compose -f docker-compose.prod.yml exec backend \
  python -c "from app.core.database import init_db; init_db()"
```

### 7. Pull LLM Models

```bash
# Pull Mistral model into Ollama
docker-compose -f docker-compose.prod.yml exec ollama \
  ollama pull mistral:7b-instruct-q4_K_M

# List available models
docker-compose -f docker-compose.prod.yml exec ollama ollama list
```

### 8. Load Knowledge Base

```bash
# Copy medical documents to data/knowledge_base/
cp /path/to/medical/documents/*.pdf data/knowledge_base/

# Ingest documents (runs on first request or manually)
docker-compose -f docker-compose.prod.yml exec backend \
  python app/ingestion/ingest_docs.py
```

### 9. Verify Deployment

```bash
# Check API health
curl https://yourdomain.com/health | jq

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-04-26T22:10:00.123456",
  "services": {
    "database": "ok",
    "chromadb": "ok",
    "ollama": "ok"
  }
}

# Test analysis endpoint
curl -X POST https://yourdomain.com/cases/{case_id}/analyse \
  -F "file=@/path/to/xray.dcm"
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | development | Application environment (development, staging, production) |
| `LOG_LEVEL` | INFO | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `DATABASE_URL` | localhost | PostgreSQL connection string |
| `OLLAMA_HOST` | localhost:11434 | Ollama service URL |
| `CHROMA_HOST` | localhost | ChromaDB host |
| `CHROMA_PORT` | 8001 | ChromaDB port |
| `CORS_ORIGINS` | * | Allowed CORS origins (comma-separated) |
| `SECRET_KEY` | (random) | Secret key for session management |
| `REQUEST_TIMEOUT` | 300 | HTTP request timeout in seconds |
| `VISION_TIMEOUT` | 60 | Vision model timeout in seconds |
| `LLM_TIMEOUT` | 120 | LLM service timeout in seconds |

### Database Configuration

PostgreSQL 15 is used for persistent storage. Key tables:

- `patients`: Patient demographic data
- `cases`: Clinical cases
- `xray_images`: Uploaded X-ray metadata
- `predictions`: Vision model predictions
- `rag_queries`: RAG retrieval results
- `llm_reports`: Generated clinical reports
- `audit_logs`: Action audit trail

**Backup Strategy:**

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/carenexus"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="carenexus-postgres-prod"

mkdir -p $BACKUP_DIR

docker exec $CONTAINER pg_dump -U carenexus_user carenexus_prod_db | \
  gzip > $BACKUP_DIR/carenexus_$DATE.sql.gz

# Keep 30 days of backups
find $BACKUP_DIR -name "carenexus_*.sql.gz" -mtime +30 -delete
```

### Storage Management

**X-ray Storage:**
- Location: `/data/xrays`
- Format: DICOM (.dcm), JPEG (.jpg), PNG (.png)
- Deduplication: SHA-256 file hash
- Retention: Configure based on regulatory requirements
- Backup: Daily snapshots to S3 or equivalent

**Model Storage:**
- Vision Model: `/data/models/best_model_5_diseases.pth` (requires ~200MB)
- Embeddings: Cached by sentence-transformers (~300MB)
- LLM: Ollama manages Mistral model (~4-8GB)

**Knowledge Base:**
- Location: `/data/knowledge_base`
- Format: PDF documents
- Processed by ChromaDB with vector embeddings
- Update strategy: Re-ingest documents when guidelines change

## Health Checks

### Application Health

```bash
# Check all services
curl https://yourdomain.com/health

# Returns status of:
# - PostgreSQL database
# - ChromaDB vector store
# - Ollama LLM service
```

### Service-Specific Checks

```bash
# PostgreSQL
docker-compose -f docker-compose.prod.yml exec postgres_db \
  pg_isready -U carenexus_user

# Ollama
curl http://localhost:11434/api/tags

# ChromaDB
curl http://localhost:8001/api/v1/heartbeat
```

### Container Logs

```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 backend
```

## Monitoring

### Prometheus

Prometheus is included for metrics collection. Access at `http://localhost:9090`

Key metrics:
- `http_requests_total`: API request count
- `http_request_duration_seconds`: Request latency
- `process_resident_memory_bytes`: Memory usage
- `pg_up`: PostgreSQL availability

### Alerting Rules

Create `alerts.yml` for alert conditions:

```yaml
groups:
  - name: carenexus
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"

      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        annotations:
          summary: "PostgreSQL is down"

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 / 1024 > 2
        for: 5m
        annotations:
          summary: "Backend memory usage exceeds 2GB"
```

## Scaling

### Horizontal Scaling

Run multiple backend instances with load balancing:

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3  # Run 3 instances
```

### Resource Limits

Set container resource constraints:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Performance Tuning

**Database Connection Pooling:**
```python
# app/core/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True
)
```

**Ollama Optimization:**
```bash
# Export environment variables before starting
export OLLAMA_NUM_PARALLEL=4        # Number of parallel requests
export OLLAMA_MAX_LOADED_MODELS=2   # Number of models to keep in memory
export OLLAMA_KEEP_ALIVE=5m         # Keep model in memory for 5 minutes
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common issues:
# - Port already in use: Change port in docker-compose
# - Out of disk space: Clean up old volumes
# - Permission denied: Check file permissions
```

### Database Connection Failed

```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.prod.yml ps postgres_db

# Check PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres_db

# Verify connection string in .env
echo $DATABASE_URL
```

### Ollama Model Download Fails

```bash
# Check internet connection
docker-compose -f docker-compose.prod.yml exec ollama ping 8.8.8.8

# Manually pull model with verbose output
docker-compose -f docker-compose.prod.yml exec ollama \
  ollama pull mistral:7b-instruct-q4_K_M
```

### High Memory Usage

```bash
# Check memory stats
docker stats carenexus-backend-prod

# Clear Ollama model cache
docker-compose -f docker-compose.prod.yml exec ollama \
  ollama ls | grep -v NAME | awk '{print $1}' | xargs -I {} \
  ollama rm {}

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

## Security Hardening

### Network Security

```bash
# Restrict access to internal ports
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable
```

### Secrets Management

```bash
# Never commit secrets to git
echo ".env*" >> .gitignore
echo "ssl/" >> .gitignore

# Use environment variables or secret manager
# Store in AWS Secrets Manager, HashiCorp Vault, etc.
```

### Database Security

```sql
-- Restrict database access
CREATE ROLE carenexus_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE carenexus_prod_db TO carenexus_user;

-- Revoke public access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO carenexus_user;
```

### API Security

- Enable rate limiting (configured in nginx.prod.conf)
- Implement API key authentication
- Use HTTPS/TLS only
- Set secure CORS headers
- Add request size limits

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Verify health checks pass
- Check disk space

**Weekly:**
- Review security logs
- Update container images if available
- Verify backups complete successfully

**Monthly:**
- Review performance metrics
- Update SSL certificates (if using Let's Encrypt)
- Rotate database credentials
- Run security scans

### Updates

```bash
# Update container images
docker-compose -f docker-compose.prod.yml pull

# Rebuild application
docker-compose -f docker-compose.prod.yml build

# Restart services with zero downtime
docker-compose -f docker-compose.prod.yml up -d
```

### Rollback Procedure

```bash
# Tag current working version
docker tag carenexus-backend:latest carenexus-backend:v1.0

# If issues occur, restart with previous version
docker image tag carenexus-backend:v1.0 carenexus-backend:latest
docker-compose -f docker-compose.prod.yml up -d
```

## Testing

### Load Testing

```bash
# Install Apache Bench
apt-get install apache2-utils

# Test endpoint performance
ab -n 1000 -c 10 https://yourdomain.com/health

# Test analysis endpoint
ab -n 100 -c 5 -p test_data.json \
  https://yourdomain.com/cases/{case_id}/analyse
```

### End-to-End Testing

```bash
# Run test suite
docker-compose -f docker-compose.prod.yml exec backend \
  pytest tests/ -v

# Generate coverage report
docker-compose -f docker-compose.prod.yml exec backend \
  pytest tests/ --cov=app --cov-report=html
```

## Support and Escalation

### When to Escalate

- Database corruption or data loss
- All services down for >1 hour
- Security breach or unauthorized access
- Complete disk space exhaustion

### Support Contacts

- **Development Team**: dev@yourorg.com
- **Operations**: ops@yourorg.com
- **Security**: security@yourorg.com

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [FastAPI Guide](https://fastapi.tiangolo.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [ChromaDB Documentation](https://docs.trychroma.com/)

## Appendix: Quick Reference

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Stop services
docker-compose -f docker-compose.prod.yml down

# View status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Execute command in container
docker-compose -f docker-compose.prod.yml exec backend bash

# Rebuild container
docker-compose -f docker-compose.prod.yml build --no-cache

# Remove all volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v

# Database backup
docker exec carenexus-postgres-prod pg_dump -U carenexus_user \
  carenexus_prod_db | gzip > backup.sql.gz

# Database restore
zcat backup.sql.gz | docker exec -i carenexus-postgres-prod \
  psql -U carenexus_user carenexus_prod_db
```
