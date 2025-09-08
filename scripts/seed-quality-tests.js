const { neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const { Pool } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Sample quality test data for testing role-based approval workflow
const sampleQualityTests = [
  {
    batchId: 'BATCH-2025-07-10-1414',
    testType: 'Purity Test',
    testResult: 'PASS', 
    testDate: '2025-07-30',
    testerId: 'QA-001-Sarah',
    testerRole: 'QA',
    approvalStatus: 'PENDING',
    testNotes: 'All purity levels within acceptable range (98.5%)',
    testValues: JSON.stringify({
      purity: 98.5,
      impurities: 1.5,
      acceptableRange: '>95%'
    })
  },
  {
    batchId: 'BATCH-2025-07-10-1414', 
    testType: 'Dissolution Test',
    testResult: 'PASS',
    testDate: '2025-07-30',
    testerId: 'QA-002-Mike',
    testerRole: 'QA',
    approvalStatus: 'APPROVED',
    approvedBy: 'REG-001-Dr.Smith',
    approvedByRole: 'Regulator',
    approvalDate: new Date('2025-07-30T10:30:00Z'),
    testNotes: 'Dissolution rate meets FDA specifications',
    testValues: JSON.stringify({
      dissolutionTime: '15 minutes',
      percentage: 95.2,
      specification: '>85% in 30 min'
    })
  },
  {
    batchId: 'BATCH-2025-01-15-0834',
    testType: 'Sterility Test', 
    testResult: 'FAIL',
    testDate: '2025-07-29',
    testerId: 'QA-003-Lisa',
    testerRole: 'QA',
    approvalStatus: 'REJECTED',
    approvedBy: 'REG-001-Dr.Smith',
    approvedByRole: 'Regulator',
    approvalDate: new Date('2025-07-29T14:45:00Z'),
    rejectionReason: 'Contamination detected in samples. Batch requires investigation and possible recall.',
    testNotes: 'Bacterial growth detected in 2 out of 6 samples',
    testValues: JSON.stringify({
      samplesTotal: 6,
      contaminated: 2,
      bacteria: 'E. coli',
      cfuCount: 150
    })
  },
  {
    batchId: 'BATCH-2025-01-15-0834',
    testType: 'Potency Test',
    testResult: 'PASS',
    testDate: '2025-07-31',
    testerId: 'QA-001-Sarah',
    testerRole: 'QA', 
    approvalStatus: 'PENDING',
    testNotes: 'Active ingredient concentration verified',
    testValues: JSON.stringify({
      expectedPotency: '500mg',
      actualPotency: '498mg',
      variance: '-0.4%',
      acceptableRange: '±5%'
    })
  },
  {
    batchId: 'BATCH-2025-03-22-1156',
    testType: 'Stability Test',
    testResult: 'PASS',
    testDate: '2025-07-28',
    testerId: 'QA-004-John',
    testerRole: 'QA',
    approvalStatus: 'APPROVED',
    approvedBy: 'REG-002-Dr.Johnson',
    approvedByRole: 'Regulator',
    approvalDate: new Date('2025-07-28T16:20:00Z'),
    testNotes: 'Stability maintained under accelerated conditions',
    testValues: JSON.stringify({
      temperature: '40°C',
      humidity: '75% RH',
      duration: '6 months',
      degradation: '<2%'
    })
  }
];

async function seedQualityTests() {
  try {
    console.log('🧪 Seeding quality test data for approval workflow...');
    
    // Insert sample quality tests
    const insertResult = await db.insert(require('../shared/schema').qualityTests)
      .values(sampleQualityTests)
      .returning();
    
    console.log(`✅ Successfully inserted ${insertResult.length} quality tests`);
    console.log('📊 Test status breakdown:');
    console.log(`   - Pending: ${sampleQualityTests.filter(t => t.approvalStatus === 'PENDING').length}`);
    console.log(`   - Approved: ${sampleQualityTests.filter(t => t.approvalStatus === 'APPROVED').length}`);
    console.log(`   - Rejected: ${sampleQualityTests.filter(t => t.approvalStatus === 'REJECTED').length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding quality tests:', error);
    process.exit(1);
  }
}

seedQualityTests();