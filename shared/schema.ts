import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Batches table for pharmaceutical products with FDA DSCSA compliance
export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull().unique(),
  productName: text("product_name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  manufacturerLicenseId: text("manufacturer_license_id").notNull(),
  lotNumber: text("lot_number").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull().default("units"),
  manufacturingDate: text("manufacturing_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  location: text("location").notNull(),
  status: text("status").notNull().default("MANUFACTURED"),
  temperatureSensitive: text("temperature_sensitive").notNull().default("false"),
  storageConditions: text("storage_conditions"),
  chainOfCustody: text("chain_of_custody").default("[]"),
  recallStatus: text("recall_status").default("NONE"), // NONE, RECALLED, UNDER_INVESTIGATION
  recallReason: text("recall_reason"),
  recallDate: timestamp("recall_date"),
  recallInitiatedBy: text("recall_initiated_by"),
  supportingDocuments: text("supporting_documents"), // JSON array of document links/files
  txHash: text("tx_hash"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Quality tests table with role-based approval workflow
export const qualityTests = pgTable("quality_tests", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  testType: text("test_type").notNull(),
  testResult: text("test_result").notNull(),
  testDate: text("test_date").notNull(),
  testerId: text("tester_id").notNull(),
  testerRole: text("tester_role").notNull().default("QA"),
  approvalStatus: text("approval_status").notNull().default("PENDING"), // PENDING, APPROVED, REJECTED
  approvedBy: text("approved_by"),
  approvedByRole: text("approved_by_role"),
  approvalDate: timestamp("approval_date"),
  rejectionReason: text("rejection_reason"),
  testNotes: text("test_notes"),
  testValues: json("test_values"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  action: text("action").notNull(),
  details: text("details").notNull(),
  performedBy: text("performed_by").notNull(),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const batchesRelations = relations(batches, ({ many }) => ({
  qualityTests: many(qualityTests),
  auditLogs: many(auditLogs),
}));

export const qualityTestsRelations = relations(qualityTests, ({ one }) => ({
  batch: one(batches, {
    fields: [qualityTests.batchId],
    references: [batches.batchId],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  batch: one(batches, {
    fields: [auditLogs.batchId],
    references: [batches.batchId],
  }),
}));

// Chain of Custody entry schema
export const chainOfCustodyEntrySchema = z.object({
  handlerId: z.string().min(1, "Handler ID is required"),
  handlerName: z.string().min(1, "Handler name is required"),
  timestamp: z.string(),
  location: z.string().min(1, "Location is required"),
  action: z.string().min(1, "Action is required"),
});

// Enhanced batch schema with FDA DSCSA compliance validation
export const insertBatchSchema = createInsertSchema(batches).omit({
  id: true,
  createdAt: true,
}).extend({
  manufacturerLicenseId: z.string().min(5, "Manufacturer License ID must be at least 5 characters"),
  lotNumber: z.string().min(1, "Lot Number is required"),
  expiryDate: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, "Expiry date must be a valid future date"),
  temperatureSensitive: z.enum(["true", "false"]).default("false"),
  storageConditions: z.string().optional(),
  chainOfCustody: z.array(chainOfCustodyEntrySchema).default([]),
});

export const insertQualityTestSchema = createInsertSchema(qualityTests).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Quality test approval schema
export const approveQualityTestSchema = z.object({
  testId: z.number(),
  approved: z.boolean(),
  approvedBy: z.string(),
  approvedByRole: z.string(),
  rejectionReason: z.string().optional(),
});

// Batch recall schema
export const recallBatchSchema = z.object({
  batchId: z.string(),
  recallReason: z.string().min(10, "Recall reason must be at least 10 characters"),
  supportingDocuments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    uploadedBy: z.string(),
    uploadedAt: z.string(),
  })).optional(),
  recallInitiatedBy: z.string(),
});

// Types
export type Batch = typeof batches.$inferSelect;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type QualityTest = typeof qualityTests.$inferSelect;
export type InsertQualityTest = z.infer<typeof insertQualityTestSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type ApproveQualityTest = z.infer<typeof approveQualityTestSchema>;
export type RecallBatch = z.infer<typeof recallBatchSchema>;

// Users table (keeping existing functionality)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
