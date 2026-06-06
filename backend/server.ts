import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config as dotenvConfig } from 'dotenv';
import pool from './config/db';
import { securityHeaders } from './middleware/securityHeaders';
import { createRateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import branchRoutes from './routes/branchRoutes';
import serviceRoutes from './routes/serviceRoutes';
import customerRoutes from './routes/customerRoutes';
import tokenRoutes from './routes/tokenRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import userRoutes from './routes/userRoutes';
import reportRoutes from './routes/reportRoutes';
import staffRoutes from './routes/staffRoutes';
import expenseRoutes from './routes/expenseRoutes';
import commissionRoutes from './routes/commissionRoutes';

dotenvConfig();

const app: Express = express();

// Environment variables
const trustProxy = process.env.TRUST_PROXY === 'true';
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
const port = process.env.PORT || 5050;

if (trustProxy) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
      const allowedOrigins = [...defaultOrigins, ...corsOrigins];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin is not allowed'));
    },
    credentials: true,
  })
);

// Middleware
app.use(securityHeaders);
app.use(
  createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 300,
    message: 'Too many requests, please try again shortly.',
  })
);
app.use(express.json({ limit: '250kb' }));

// Health check routes
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('HMS backend is running');
});

app.get('/db-test', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({
      message: 'Database connected successfully',
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error('DB test error:', error);
    res.status(500).json({ error: 'Database failed' });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/commissions', commissionRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
