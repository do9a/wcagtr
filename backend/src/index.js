import express from 'express';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { testConnection } from './config/database.js';
import { requestLogger } from './middleware/logger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { getWidgetPublicKeyPem } from './middleware/auth.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import scanRoutes from './routes/scan.js';
import tokensRoutes from './routes/tokens.js';
import patchesRoutes from './routes/patches.js';
import paymentsRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import customerRoutes from './routes/customer.js';
import webhooksRoutes from './routes/webhooks.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const WIDGET_DIST_DIR = path.resolve(REPO_ROOT, 'widget/dist');
const WIDGET_DIST_FILE = path.resolve(WIDGET_DIST_DIR, 'widget.js');
const WIDGET_SOURCE_FILE = path.resolve(REPO_ROOT, 'widget.js');
const WIDGET_DEV_FILE = path.resolve(REPO_ROOT, 'widget/widget-dev.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "http://localhost:3000",
        "https://api.wcagtr.app",
        "https://api.stripe.com",
        "https://api.iyzipay.com",
        "https://sandbox-api.iyzipay.com",
      ],
      frameSrc: [
        "'self'",
        "https://checkout.stripe.com",
        "https://*.iyzipay.com",
        "https://*.iyzico.com",
      ],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buffer) => {
    if (req.originalUrl?.startsWith('/api/v1/payments/webhook/stripe')) {
      req.rawBody = buffer.toString('utf8');
    }
  },
}));
app.use(express.urlencoded({ extended: true }));

app.use(requestLogger);

app.use('/api', apiLimiter);
app.use('/cdn', express.static(WIDGET_DIST_DIR, {
  fallthrough: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    } else if (filePath.endsWith('.json') || filePath.endsWith('.txt')) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
  },
}));

app.get('/cdn/widget.js', (req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (fs.existsSync(WIDGET_DIST_FILE)) {
    return res.sendFile(WIDGET_DIST_FILE);
  }

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-WCAGTR-Widget-Build', 'source-fallback');
  return res.sendFile(WIDGET_SOURCE_FILE);
});

app.get('/cdn/widget-dev.js', (req, res) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.sendFile(WIDGET_DEV_FILE);
});

app.get('/api/v1/widget/config', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const defaultApiBase = `${protocol}://${host}/api/v1`;
  const publicKeyPem = getWidgetPublicKeyPem();

  res.json({
    apiBase: (process.env.WIDGET_API_BASE || defaultApiBase).replace(/\/+$/, ''),
    publicKeyPem: publicKeyPem || null,
    cdn: {
      widget: '/cdn/widget.js',
      widgetDev: '/cdn/widget-dev.js',
      sri: '/cdn/widget.sri.json',
    },
  });
});

app.use('/', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/scan', scanRoutes);
app.use('/api/v1/tokens', tokensRoutes);
app.use('/api/v1/patches', patchesRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/webhooks', webhooksRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', customerRoutes);

app.get('/', (req, res) => {
  res.json({
    service: 'WCAGTR Platform API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/v1/docs',
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Sunucu hatası',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı' });
});

async function startServer() {
  console.log('🚀 WCAGTR Platform API başlatılıyor...\n');

  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Veritabanı bağlantısı başarısız. .env dosyasını kontrol edin.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n✅ Server çalışıyor: http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer();
