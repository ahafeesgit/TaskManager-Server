# Monitoring & Observability Documentation

This directory contains comprehensive documentation for the TaskManager-Server monitoring and observability system.

## 📋 Documentation Index

### 📊 [Comprehensive Monitoring System](./comprehensive-monitoring-system.md)

**Main Documentation** - Complete guide covering:

- **Health Check System** (NestJS Terminus)
  - Comprehensive health checks (`/health`)
  - Readiness probes (`/health/ready`)
  - Liveness probes (`/health/live`)

- **Metrics Collection** (@willsoto/nestjs-prometheus)
  - HTTP request metrics
  - System resource monitoring
  - Application performance metrics

- **Production Deployment**
  - Kubernetes integration
  - Prometheus configuration
  - Grafana dashboards
  - Alerting rules

- **Performance Optimization**
  - Minimal overhead configuration
  - Route normalization
  - Efficient data collection

## 🚀 Quick Start

### Local Development

```bash
# Start the application
npm run start:dev

# Check health endpoints
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
curl http://localhost:3000/health

# View metrics
curl http://localhost:3000/metrics
curl http://localhost:3000/metrics/summary  # Debug info
```

### Production Setup

```bash
# Enable metrics collection
export METRICS_ENABLED=true
export METRICS_MEMORY_MONITORING=true

# Configure health check thresholds
export HEALTH_MEMORY_HEAP_THRESHOLD=157286400  # 150MB
export HEALTH_MEMORY_RSS_THRESHOLD=209715200   # 200MB
```

## 🔗 Related Documentation

- [Scripts Documentation](../scripts/README.md) - Deployment and maintenance scripts
- [Health Check Integration](../../src/common/health/) - Source code implementation
- [Metrics Implementation](../../src/common/metrics/) - Prometheus metrics code

## 📊 Monitoring Stack Integration

### Prometheus

- Scrapes `/metrics` endpoint every 15 seconds
- Collects HTTP, system, and application metrics
- Provides data for alerting and dashboards

### Grafana

- Visualizes metrics from Prometheus
- Pre-configured dashboards for key metrics
- Real-time monitoring and historical analysis

### Kubernetes

- Uses `/health/live` for liveness probes
- Uses `/health/ready` for readiness probes
- Automatic pod restart and traffic routing

### Container Orchestration

- Health checks using liveness endpoint
- Container status monitoring
- Orchestration integration

## 🎯 Key Features

✅ **Comprehensive Health Checks** - Database, memory, disk monitoring  
✅ **Performance Metrics** - Request timing, error rates, resource usage  
✅ **Production Optimized** - Minimal overhead, efficient collection  
✅ **Cloud Native** - Kubernetes, container orchestration ready  
✅ **Industry Standards** - Prometheus, OpenAPI, container best practices  
✅ **Troubleshooting** - Debug endpoints, comprehensive error handling

## 📞 Support

For questions about monitoring configuration or troubleshooting:

1. Check the [Comprehensive Monitoring System](./comprehensive-monitoring-system.md) documentation
2. Review the [Troubleshooting](./comprehensive-monitoring-system.md#troubleshooting) section
3. Use debug endpoints for real-time diagnostics
4. Monitor logs for detailed error information

---

_Part of the TaskManager-Server production-ready template_
