import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configuration
export const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: 'Rate limit exceeded', message },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Different rate limits for different endpoints
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again later.'
);

export const apiRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  100, // 100 requests
  'Too many API requests. Please slow down.'
);

export const criticalActionRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  10, // 10 attempts
  'Too many critical actions. Please wait before trying again.'
);

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://metamask.io"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*", "https://mainnet.infura.io", "https://polygon-rpc.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for MetaMask
});

// CORS configuration
export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://pharmachain.replit.app'] 
    : ['http://localhost:5000', 'http://127.0.0.1:5000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous HTML/script tags
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed[^>]*>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }
  
  next();
};

// Request validation middleware
export const validateBatchData = (req: Request, res: Response, next: NextFunction) => {
  const { batchId, productName, manufacturer, manufacturerLicenseId, lotNumber, quantity } = req.body;
  
  const errors: string[] = [];
  
  if (!batchId || typeof batchId !== 'string' || batchId.length < 3) {
    errors.push('Batch ID must be at least 3 characters long');
  }
  
  if (!productName || typeof productName !== 'string' || productName.length < 2) {
    errors.push('Product name must be at least 2 characters long');
  }
  
  if (!manufacturer || typeof manufacturer !== 'string' || manufacturer.length < 2) {
    errors.push('Manufacturer name must be at least 2 characters long');
  }
  
  if (!manufacturerLicenseId || typeof manufacturerLicenseId !== 'string') {
    errors.push('Manufacturer License ID is required');
  }
  
  if (!lotNumber || typeof lotNumber !== 'string') {
    errors.push('Lot number is required');
  }
  
  if (!quantity || typeof quantity !== 'number' || quantity <= 0) {
    errors.push('Quantity must be a positive number');
  }
  
  // Additional pharmaceutical-specific validations
  if (req.body.manufacturingDate) {
    const mfgDate = new Date(req.body.manufacturingDate);
    if (isNaN(mfgDate.getTime()) || mfgDate > new Date()) {
      errors.push('Manufacturing date must be valid and not in the future');
    }
  }
  
  if (req.body.expiryDate) {
    const expDate = new Date(req.body.expiryDate);
    const mfgDate = new Date(req.body.manufacturingDate);
    if (isNaN(expDate.getTime()) || expDate <= mfgDate) {
      errors.push('Expiry date must be valid and after manufacturing date');
    }
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }
  
  next();
};

// Quality test validation
export const validateQualityTestData = (req: Request, res: Response, next: NextFunction) => {
  const { testType, testResult, testerId } = req.body;
  
  const errors: string[] = [];
  
  if (!testType || typeof testType !== 'string' || testType.length < 2) {
    errors.push('Test type must be at least 2 characters long');
  }
  
  if (!testResult || typeof testResult !== 'string') {
    errors.push('Test result is required');
  }
  
  if (!testerId || typeof testerId !== 'string') {
    errors.push('Tester ID is required');
  }
  
  // Validate test result values
  const validResults = ['PASSED', 'FAILED', 'PENDING', 'INVALID'];
  if (testResult && !validResults.includes(testResult.toUpperCase())) {
    errors.push(`Test result must be one of: ${validResults.join(', ')}`);
  }
  
  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors 
    });
  }
  
  next();
};

// Audit logging middleware
export const auditLog = (action: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action with user context
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          licenseId: req.user.licenseId
        } : null,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        body: action.includes('SENSITIVE') ? '[REDACTED]' : req.body,
        statusCode: res.statusCode,
        success: res.statusCode < 400
      };
      
      console.log('AUDIT LOG:', JSON.stringify(logEntry, null, 2));
      
      // In production, send to proper audit logging service
      if (process.env.NODE_ENV === 'production') {
        // Send to audit logging service (e.g., AWS CloudTrail, Elasticsearch)
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: isDevelopment ? err.details : undefined
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
  
  // Default server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'Something went wrong',
    stack: isDevelopment ? err.stack : undefined
  });
};