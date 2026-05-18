# CareNexus – Healthcare Delivery Platform

A 9-module, microservices-based healthcare platform delivering accessible, AI-powered care across Zimbabwe and Southern Africa.

## Platform Overview

| Module | Purpose | Port |
|--------|---------|------|
| **Direct** | Clinic booking & appointments | 8081 |
| **Connect** | Patient messaging & connectivity | 8082 |
| **Proxy** | Healthcare provider integration | 8083 |
| **Urgent** | Emergency response system | 8084 |
| **Companion** | AI patient support (RAG-based) | 8085 |
| **Engage** | Patient engagement & gamification | 8086 |
| **Manage** | Clinical team management | 8087 |
| **Record** | Medical records & EHR | 8088 |
| **Insights** | Analytics & reporting | 8089 |

**ML Services:**
- **Disease Detection** (5001): DenseNet-121 chest X-ray classifier (TB, pneumonia, etc.)
- **Clinical NLP** (5002): RAG-based treatment recommendations via EDLIZ guidelines

---

## Quick Start

```bash
# Clone
git clone https://github.com/costanho/carenexus.git
cd carenexus

# Start all services
docker-compose up --build

# Frontend: http://localhost:8081
# API Docs: http://localhost:8080/swagger-ui.html
# ML Docs: http://localhost:5001/docs
```

### .env Setup

Create `.env`:
