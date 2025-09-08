import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBatchSchema, insertQualityTestSchema, insertAuditLogSchema, approveQualityTestSchema, recallBatchSchema } from "@shared/schema";
import { 
  authenticate, 
  requirePermission, 
  requireRole, 
  requireVerification,
  authRoutes,
  PERMISSIONS,
  ROLES 
} from "./middleware/auth";
import { 
  apiRateLimit, 
  criticalActionRateLimit,
  sanitizeInput,
  validateBatchData,
  validateQualityTestData,
  auditLog 
} from "./middleware/security";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply security middleware globally
  app.use(apiRateLimit);
  app.use(sanitizeInput);
  
  // Authentication routes (public)
  app.post('/api/auth/register', authRoutes.register);
  app.post('/api/auth/login', authRoutes.login);
  
  // Protected authentication routes
  app.post('/api/auth/verify/:email', 
    authenticate, 
    requireRole([ROLES.REGULATOR]),
    auditLog('USER_VERIFICATION'),
    authRoutes.verifyUser
  );
  
  app.get('/api/auth/users', 
    authenticate, 
    requireRole([ROLES.REGULATOR]),
    auditLog('VIEW_USERS'),
    authRoutes.getUsers
  );
  
  app.get('/api/auth/profile', 
    authenticate,
    authRoutes.getProfile
  );

  // Secured batch endpoints
  app.post('/api/batches', 
    authenticate,
    requireVerification,
    requirePermission(PERMISSIONS.CREATE_BATCH),
    validateBatchData,
    criticalActionRateLimit,
    auditLog('CREATE_BATCH'),
    async (req, res) => {
    try {
      const validatedData = insertBatchSchema.parse(req.body);
      const batch = await storage.createBatch(validatedData);
      res.json(batch);
    } catch (error) {
      console.error('Create batch error:', error);
      res.status(400).json({ error: 'Failed to create batch' });
    }
  });

  // Get all batches (authenticated users only)
  app.get('/api/batches', 
    authenticate,
    auditLog('VIEW_BATCHES'),
    async (req, res) => {
    try {
      const batches = await storage.getAllBatches();
      res.json(batches);
    } catch (error) {
      console.error('Get batches error:', error);
      res.status(500).json({ error: 'Failed to fetch batches' });
    }
  });

  // Get batch by ID (authenticated users only)
  app.get('/api/batches/:batchId', 
    authenticate,
    auditLog('VIEW_BATCH_DETAILS'),
    async (req, res) => {
    try {
      const batch = await storage.getBatchById(req.params.batchId);
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }
      res.json(batch);
    } catch (error) {
      console.error('Get batch error:', error);
      res.status(500).json({ error: 'Failed to fetch batch' });
    }
  });

  // Update batch status (restricted by role)
  app.patch('/api/batches/:batchId/status', 
    authenticate,
    requireVerification,
    requirePermission(PERMISSIONS.UPDATE_BATCH_STATUS),
    criticalActionRateLimit,
    auditLog('UPDATE_BATCH_STATUS'),
    async (req, res) => {
    try {
      const { status, txHash } = req.body;
      const batch = await storage.updateBatchStatus(req.params.batchId, status, txHash);
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }
      res.json(batch);
    } catch (error) {
      console.error('Update batch status error:', error);
      res.status(500).json({ error: 'Failed to update batch status' });
    }
  });

  // Recall batch (regulator only)
  app.post('/api/batches/:batchId/recall', 
    authenticate,
    requireVerification,
    requirePermission(PERMISSIONS.RECALL_BATCH),
    criticalActionRateLimit,
    auditLog('RECALL_BATCH'),
    async (req, res) => {
    try {
      const batchId = req.params.batchId;
      const validatedData = recallBatchSchema.parse({
        batchId,
        ...req.body
      });
      
      const result = await storage.recallBatch(validatedData);
      res.json(result);
    } catch (error) {
      console.error('Batch recall error:', error);
      res.status(400).json({ error: 'Failed to process batch recall' });
    }
  });

  // Create quality test (QA personnel only)
  app.post('/api/quality-tests', 
    authenticate,
    requireVerification,
    requirePermission(PERMISSIONS.ADD_QUALITY_TEST),
    validateQualityTestData,
    criticalActionRateLimit,
    auditLog('CREATE_QUALITY_TEST'),
    async (req, res) => {
    try {
      const validatedData = insertQualityTestSchema.parse(req.body);
      const test = await storage.createQualityTest(validatedData);
      res.json(test);
    } catch (error) {
      console.error('Create quality test error:', error);
      res.status(400).json({ error: 'Failed to create quality test' });
    }
  });

  // Get all quality tests (authenticated users only)
  app.get('/api/quality-tests', 
    authenticate,
    auditLog('VIEW_QUALITY_TESTS'),
    async (req, res) => {
    try {
      const tests = await storage.getAllQualityTests();
      res.json(tests);
    } catch (error) {
      console.error('Get quality tests error:', error);
      res.status(500).json({ error: 'Failed to fetch quality tests' });
    }
  });

  // Get quality tests by batch
  app.get('/api/quality-tests/:batchId', async (req, res) => {
    try {
      const tests = await storage.getQualityTestsByBatch(req.params.batchId);
      res.json(tests);
    } catch (error) {
      console.error('Get quality tests by batch error:', error);
      res.status(500).json({ error: 'Failed to fetch quality tests' });
    }
  });

  // Get pending quality tests for approval
  app.get('/api/quality-tests/pending', async (req, res) => {
    try {
      const tests = await storage.getPendingQualityTests();
      res.json(tests);
    } catch (error) {
      console.error('Get pending quality tests error:', error);
      res.status(500).json({ error: 'Failed to fetch pending quality tests' });
    }
  });

  // Get quality test statistics
  app.get('/api/quality-tests/stats', async (req, res) => {
    try {
      const stats = await storage.getQualityTestStats();
      res.json(stats);
    } catch (error) {
      console.error('Get quality test stats error:', error);
      res.status(500).json({ error: 'Failed to fetch quality test statistics' });
    }
  });

  // Approve or reject quality test
  app.post('/api/quality-tests/:testId/approve', async (req, res) => {
    try {
      const testId = parseInt(req.params.testId);
      const validatedData = approveQualityTestSchema.parse({
        testId,
        ...req.body
      });
      
      const result = await storage.approveQualityTest(validatedData);
      res.json(result);
    } catch (error) {
      console.error('Quality test approval error:', error);
      res.status(400).json({ error: 'Failed to process quality test approval' });
    }
  });

  // Get statistics (authenticated users only)
  app.get('/api/stats', 
    authenticate,
    auditLog('VIEW_STATS'),
    async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // Get recent activity
  app.get('/api/recent-activity', async (req, res) => {
    try {
      const logs = await storage.getRecentAuditLogs(10);
      res.json(logs);
    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
  });

  // Get compliance KPIs
  app.get('/api/compliance/kpis', async (req, res) => {
    try {
      const kpis = await storage.getComplianceKPIs();
      res.json(kpis);
    } catch (error) {
      console.error('Get compliance KPIs error:', error);
      res.status(500).json({ error: 'Failed to fetch compliance KPIs' });
    }
  });

  // Get all audit logs (authenticated users only)
  app.get('/api/audit-logs', 
    authenticate,
    requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS),
    auditLog('VIEW_AUDIT_LOGS'),
    async (req, res) => {
    try {
      const logs = await storage.getRecentAuditLogs(100); // Get more entries for the timeline
      res.json(logs);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  // Get audit logs by batch
  app.get('/api/audit-logs/:batchId', async (req, res) => {
    try {
      const logs = await storage.getAuditLogsByBatch(req.params.batchId);
      res.json(logs);
    } catch (error) {
      console.error('Get audit logs by batch error:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  });

  // Create audit log entry
  app.post('/api/audit-logs', async (req, res) => {
    try {
      const validatedData = insertAuditLogSchema.parse(req.body);
      const log = await storage.createAuditLog(validatedData);
      res.json(log);
    } catch (error) {
      console.error('Create audit log error:', error);
      res.status(400).json({ error: 'Failed to create audit log' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
