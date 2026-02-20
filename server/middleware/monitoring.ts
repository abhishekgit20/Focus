// Monitoring and metrics middleware for production
import type { Request, Response, NextFunction } from "express";

interface Metrics {
  requests: number;
  errors: number;
  responseTime: number[];
  statusCodes: Record<number, number>;
}

const metrics: Metrics = {
  requests: 0,
  errors: 0,
  responseTime: [],
  statusCodes: {},
};

// Reset metrics every hour
setInterval(() => {
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.responseTime = [];
  metrics.statusCodes = {};
}, 60 * 60 * 1000);

/**
 * Metrics collection middleware
 */
export function collectMetrics(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    metrics.requests++;
    metrics.responseTime.push(duration);
    
    // Keep only last 1000 response times
    if (metrics.responseTime.length > 1000) {
      metrics.responseTime.shift();
    }
    
    // Track status codes
    const status = res.statusCode;
    metrics.statusCodes[status] = (metrics.statusCodes[status] || 0) + 1;
    
    // Track errors
    if (status >= 400) {
      metrics.errors++;
    }
  });
  
  next();
}

/**
 * Get current metrics
 */
export function getMetrics() {
  const avgResponseTime = metrics.responseTime.length > 0
    ? Math.round(metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length)
    : 0;
  
  const sortedResponseTimes = [...metrics.responseTime].sort((a, b) => a - b);
  const p95 = sortedResponseTimes.length > 0
    ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)]
    : 0;
  
  const p99 = sortedResponseTimes.length > 0
    ? sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)]
    : 0;
  
  return {
    requests: metrics.requests,
    errors: metrics.errors,
    averageResponseTime: avgResponseTime,
    p95ResponseTime: p95,
    p99ResponseTime: p99,
    statusCodes: { ...metrics.statusCodes },
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  };
}

