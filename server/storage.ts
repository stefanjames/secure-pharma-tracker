import { batches, qualityTests, auditLogs, users, type Batch, type InsertBatch, type QualityTest, type InsertQualityTest, type AuditLog, type InsertAuditLog, type User, type InsertUser, type ApproveQualityTest, type RecallBatch } from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Batches
  createBatch(batch: InsertBatch): Promise<Batch>;
  getAllBatches(): Promise<Batch[]>;
  getBatchById(batchId: string): Promise<Batch | undefined>;
  updateBatchStatus(batchId: string, status: string, txHash?: string): Promise<Batch | undefined>;
  recallBatch(recall: RecallBatch): Promise<Batch>;
  
  // Quality Tests
  createQualityTest(test: InsertQualityTest): Promise<QualityTest>;
  getQualityTestsByBatch(batchId: string): Promise<QualityTest[]>;
  getAllQualityTests(): Promise<QualityTest[]>;
  getPendingQualityTests(): Promise<QualityTest[]>;
  approveQualityTest(approval: ApproveQualityTest): Promise<QualityTest>;
  getQualityTestStats(): Promise<{
    totalTests: number;
    pendingApprovals: number;
    approvedTests: number;
    rejectedTests: number;
    passRate: number;
    thisMonth: { total: number; passed: number; failed: number; };
    lastMonth: { total: number; passed: number; failed: number; };
  }>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByBatch(batchId: string): Promise<AuditLog[]>;
  getRecentAuditLogs(limit: number): Promise<AuditLog[]>;
  
  // Statistics
  getStats(): Promise<{
    totalBatches: number;
    activeTracking: number;
    qualityTests: number;
    complianceRate: string;
  }>;
  
  // Compliance KPIs
  getComplianceKPIs(): Promise<{
    totalBatches: number;
    recalledBatches: number;
    recallPercentage: number;
    qualityTestsTotal: number;
    qualityTestsPassed: number;
    qualityTestPassRate: number;
    averageRecallResponseTime: number;
    complianceScore: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Batches
  async createBatch(insertBatch: InsertBatch): Promise<Batch> {
    const [batch] = await db
      .insert(batches)
      .values({
        ...insertBatch,
        createdAt: new Date(),
      })
      .returning();
    
    // Create audit log
    await this.createAuditLog({
      batchId: batch.batchId,
      action: 'BATCH_CREATED',
      details: `Batch ${batch.batchId} created for ${batch.productName}`,
      performedBy: 'system',
      txHash: batch.txHash,
    });
    
    return batch;
  }

  async getAllBatches(): Promise<Batch[]> {
    return await db.select().from(batches).orderBy(desc(batches.createdAt));
  }

  async getBatchById(batchId: string): Promise<Batch | undefined> {
    const [batch] = await db.select().from(batches).where(eq(batches.batchId, batchId));
    return batch || undefined;
  }

  async updateBatchStatus(batchId: string, status: string, txHash?: string): Promise<Batch | undefined> {
    const [batch] = await db
      .update(batches)
      .set({ status, txHash })
      .where(eq(batches.batchId, batchId))
      .returning();
    
    if (batch) {
      await this.createAuditLog({
        batchId: batch.batchId,
        action: 'STATUS_UPDATED',
        details: `Batch ${batch.batchId} status updated to ${status}`,
        performedBy: 'system',
        txHash: txHash,
      });
    }
    
    return batch || undefined;
  }

  async recallBatch(recall: RecallBatch): Promise<Batch> {
    const supportingDocsJson = recall.supportingDocuments 
      ? JSON.stringify(recall.supportingDocuments) 
      : null;

    const [batch] = await db
      .update(batches)
      .set({
        recallStatus: 'RECALLED',
        recallReason: recall.recallReason,
        recallDate: new Date(),
        recallInitiatedBy: recall.recallInitiatedBy,
        supportingDocuments: supportingDocsJson,
        status: 'RECALLED' // Also update main status
      })
      .where(eq(batches.batchId, recall.batchId))
      .returning();

    if (!batch) {
      throw new Error('Batch not found');
    }

    // Create audit log for recall
    await this.createAuditLog({
      batchId: recall.batchId,
      action: 'BATCH_RECALLED',
      details: `Recall Reason: ${recall.recallReason}. Documents: ${recall.supportingDocuments?.length || 0}`,
      performedBy: recall.recallInitiatedBy,
    });

    // Create notifications for all stakeholders
    await this.createRecallNotifications(batch);

    return batch;
  }

  private async createRecallNotifications(batch: Batch): Promise<void> {
    const notifications = [
      {
        title: `URGENT: Batch ${batch.batchId} Recalled`,
        message: `Batch ${batch.batchId} (${batch.productName}) has been recalled. Stop distribution immediately.`,
        type: 'RECALL_ALERT',
        targetRole: 'Manufacturer',
        batchId: batch.batchId,
        severity: 'CRITICAL',
      },
      {
        title: `Quality Alert: Recalled Batch ${batch.batchId}`,
        message: `Quality issue identified in batch ${batch.batchId}. Review recall documentation and take corrective action.`,
        type: 'QUALITY_ALERT',
        targetRole: 'QA',
        batchId: batch.batchId,
        severity: 'HIGH',
      },
      {
        title: `Regulatory Notice: Batch ${batch.batchId} Recall`,
        message: `Batch ${batch.batchId} has been recalled. Monitor compliance and follow-up actions required.`,
        type: 'REGULATORY_NOTICE',
        targetRole: 'Regulator',
        batchId: batch.batchId,
        severity: 'HIGH',
      }
    ];

    // Create audit logs as notification simulation
    for (const notification of notifications) {
      await this.createAuditLog({
        batchId: batch.batchId,
        action: 'NOTIFICATION_SENT',
        details: `${notification.type} sent to ${notification.targetRole}: ${notification.message}`,
        performedBy: 'system',
      });
    }
  }

  // Quality Tests
  async createQualityTest(insertTest: InsertQualityTest): Promise<QualityTest> {
    const [test] = await db
      .insert(qualityTests)
      .values({
        ...insertTest,
        createdAt: new Date(),
      })
      .returning();
    
    // Create audit log
    await this.createAuditLog({
      batchId: test.batchId,
      action: 'QUALITY_TEST_ADDED',
      details: `${test.testType} test completed with result: ${test.testResult}`,
      performedBy: test.testerId,
      txHash: test.txHash,
    });
    
    return test;
  }

  async getQualityTestsByBatch(batchId: string): Promise<QualityTest[]> {
    return await db.select().from(qualityTests).where(eq(qualityTests.batchId, batchId)).orderBy(desc(qualityTests.createdAt));
  }

  async getAllQualityTests(): Promise<QualityTest[]> {
    return await db.select().from(qualityTests).orderBy(desc(qualityTests.createdAt));
  }

  async getPendingQualityTests(): Promise<QualityTest[]> {
    return await db.select()
      .from(qualityTests)
      .where(eq(qualityTests.approvalStatus, 'PENDING'))
      .orderBy(desc(qualityTests.createdAt));
  }

  async approveQualityTest(approval: ApproveQualityTest): Promise<QualityTest> {
    const [updatedTest] = await db.update(qualityTests)
      .set({
        approvalStatus: approval.approved ? 'APPROVED' : 'REJECTED',
        approvedBy: approval.approvedBy,
        approvedByRole: approval.approvedByRole,
        approvalDate: new Date(),
        rejectionReason: approval.rejectionReason,
      })
      .where(eq(qualityTests.id, approval.testId))
      .returning();

    // Create audit log for approval/rejection
    await this.createAuditLog({
      batchId: updatedTest.batchId,
      action: approval.approved ? 'QUALITY_TEST_APPROVED' : 'QUALITY_TEST_REJECTED',
      details: approval.approved 
        ? `Quality test ${updatedTest.testType} approved by ${approval.approvedBy}`
        : `Quality test ${updatedTest.testType} rejected by ${approval.approvedBy}: ${approval.rejectionReason}`,
      performedBy: approval.approvedBy,
    });

    return updatedTest;
  }

  async getQualityTestStats(): Promise<{
    totalTests: number;
    pendingApprovals: number;
    approvedTests: number;
    rejectedTests: number;
    passRate: number;
    thisMonth: { total: number; passed: number; failed: number; };
    lastMonth: { total: number; passed: number; failed: number; };
  }> {
    // Get overall counts
    const [totalResult] = await db.select({ count: count() }).from(qualityTests);
    const [pendingResult] = await db.select({ count: count() })
      .from(qualityTests)
      .where(eq(qualityTests.approvalStatus, 'PENDING'));
    const [approvedResult] = await db.select({ count: count() })
      .from(qualityTests)
      .where(eq(qualityTests.approvalStatus, 'APPROVED'));
    const [rejectedResult] = await db.select({ count: count() })
      .from(qualityTests)
      .where(eq(qualityTests.approvalStatus, 'REJECTED'));

    // Get test results for pass rate
    const [passedResult] = await db.select({ count: count() })
      .from(qualityTests)
      .where(eq(qualityTests.testResult, 'PASS'));

    const totalTests = totalResult.count;
    const passRate = totalTests > 0 ? Math.round((passedResult.count / totalTests) * 100) : 0;

    // Calculate monthly stats
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // This month
    const [thisMonthTotal] = await db.select({ count: count() })
      .from(qualityTests)
      .where(gte(qualityTests.createdAt, thisMonthStart));
    const [thisMonthPassed] = await db.select({ count: count() })
      .from(qualityTests)
      .where(and(eq(qualityTests.testResult, 'PASS'), gte(qualityTests.createdAt, thisMonthStart)));
    const [thisMonthFailed] = await db.select({ count: count() })
      .from(qualityTests)
      .where(and(eq(qualityTests.testResult, 'FAIL'), gte(qualityTests.createdAt, thisMonthStart)));

    // Last month
    const [lastMonthTotal] = await db.select({ count: count() })
      .from(qualityTests)
      .where(and(gte(qualityTests.createdAt, lastMonthStart), lte(qualityTests.createdAt, lastMonthEnd)));
    const [lastMonthPassed] = await db.select({ count: count() })
      .from(qualityTests)
      .where(and(eq(qualityTests.testResult, 'PASS'), gte(qualityTests.createdAt, lastMonthStart), lte(qualityTests.createdAt, lastMonthEnd)));
    const [lastMonthFailed] = await db.select({ count: count() })
      .from(qualityTests)
      .where(and(eq(qualityTests.testResult, 'FAIL'), gte(qualityTests.createdAt, lastMonthStart), lte(qualityTests.createdAt, lastMonthEnd)));

    return {
      totalTests,
      pendingApprovals: pendingResult.count,
      approvedTests: approvedResult.count,
      rejectedTests: rejectedResult.count,
      passRate,
      thisMonth: {
        total: thisMonthTotal.count,
        passed: thisMonthPassed.count,
        failed: thisMonthFailed.count,
      },
      lastMonth: {
        total: lastMonthTotal.count,
        passed: lastMonthPassed.count,
        failed: lastMonthFailed.count,
      },
    };
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values({
        ...insertLog,
        createdAt: new Date(),
      })
      .returning();
    
    return log;
  }

  async getAuditLogsByBatch(batchId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.batchId, batchId)).orderBy(desc(auditLogs.createdAt));
  }

  async getRecentAuditLogs(limit: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  // Statistics
  async getStats(): Promise<{
    totalBatches: number;
    activeTracking: number;
    qualityTests: number;
    complianceRate: string;
  }> {
    const totalBatches = await db.select({ count: count() }).from(batches);
    const activeTracking = await db.select({ count: count() }).from(batches)
      .where(eq(batches.status, 'MANUFACTURED'));
    const qualityTestsCount = await db.select({ count: count() }).from(qualityTests);
    const passedTests = await db.select({ count: count() }).from(qualityTests)
      .where(eq(qualityTests.testResult, 'PASSED'));
    
    const totalTests = qualityTestsCount[0].count;
    const passed = passedTests[0].count;
    const complianceRate = totalTests > 0 ? ((passed / totalTests) * 100).toFixed(1) : "100.0";
    
    return {
      totalBatches: totalBatches[0].count,
      activeTracking: activeTracking[0].count,
      qualityTests: totalTests,
      complianceRate: `${complianceRate}%`,
    };
  }

  // Compliance KPIs
  async getComplianceKPIs(): Promise<{
    totalBatches: number;
    recalledBatches: number;
    recallPercentage: number;
    qualityTestsTotal: number;
    qualityTestsPassed: number;
    qualityTestPassRate: number;
    averageRecallResponseTime: number;
    complianceScore: number;
  }> {
    // Get batch counts
    const [totalBatchesResult] = await db.select({ count: count() }).from(batches);
    const [recalledBatchesResult] = await db.select({ count: count() })
      .from(batches)
      .where(eq(batches.recallStatus, 'RECALLED'));
    
    // Get quality test counts
    const [totalTestsResult] = await db.select({ count: count() }).from(qualityTests);
    const [passedTestsResult] = await db.select({ count: count() })
      .from(qualityTests)
      .where(eq(qualityTests.testResult, 'PASS'));
    
    const totalBatches = totalBatchesResult.count;
    const recalledBatches = recalledBatchesResult.count;
    const totalTests = totalTestsResult.count;
    const passedTests = passedTestsResult.count;
    
    // Calculate percentages
    const recallPercentage = totalBatches > 0 ? (recalledBatches / totalBatches) * 100 : 0;
    const qualityTestPassRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 100;
    
    // Calculate average recall response time (mock calculation)
    // In a real system, this would calculate the time between recall initiation and completion
    const averageRecallResponseTime = recalledBatches > 0 ? 24 + (Math.random() * 48) : 0; // 24-72 hours
    
    // Calculate compliance score based on multiple factors
    const recallScore = Math.max(0, 100 - (recallPercentage * 10)); // Penalize recalls heavily
    const qualityScore = qualityTestPassRate;
    const responseScore = averageRecallResponseTime > 0 ? Math.max(0, 100 - (averageRecallResponseTime / 2)) : 100;
    
    const complianceScore = (recallScore * 0.4 + qualityScore * 0.4 + responseScore * 0.2);
    
    return {
      totalBatches,
      recalledBatches,
      recallPercentage,
      qualityTestsTotal: totalTests,
      qualityTestsPassed: passedTests,
      qualityTestPassRate,
      averageRecallResponseTime,
      complianceScore,
    };
  }
}

export const storage = new DatabaseStorage();
