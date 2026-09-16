/**
 * Seed Script for Thaimart Automation Pipeline Testing
 * Purpose: Insert sample product + approval-gate row for end-to-end flow verification
 * 
 * This script is LOCAL-WRITE SAFE - it only creates test data in local development mode
 * No external API calls, no secret exposure, no production mutations
 */

import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration - LOCAL-WRITE SAFE
const CONFIG = {
  dataDir: join(__dirname, '../memory/live'),
  productsFile: join(__dirname, '../memory/live/products.json'),
  approvalsFile: join(__dirname, '../memory/live/approvals.json'),
  seedData: {
    product: {
      id: null, // Will be generated
      sku: 'TEST-SEED-001',
      title_th: 'ผลิตภัญญาสติ๊กเกอร์ทดสอบ',
      description_th: 'ผลิตภัญญาสติ๊กเกอร์ทดสอบสำหรับการตรวจสอบการทำงานของระบบอัตโนมัติ',
      price_base: 150.00,
      price_thaimart: 145.50,
      stock_sirinx: 100,
      stock_thaimart: 100,
      category_id: 'STICKERS',
      design_tokens: { DESIGN_VARIANCE: 7, MOTION_INTENSITY: 4, VISUAL_DENSITY: 6 },
      sync_status: 'PENDING_GATE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    approvalGate: {
      id: null, // Will be generated
      action_type: 'THAIMART_LIVE_PUBLISH',
      target_reference: null, // Will reference product ID
      payload_snapshot: null, // Will include product data
      gate_status: 'WAITING',
      resolved_by: null,
      resolved_at: null,
      created_at: new Date().toISOString()
    }
  }
};

/**
 * Ensure directories exist
 */
function ensureDirectories() {
  if (!existsSync(CONFIG.dataDir)) {
    mkdirSync(CONFIG.dataDir, { recursive: true });
    console.log('📁 Created data directory:', CONFIG.dataDir);
  }
}

/**
 * Load existing data or return empty array
 */
function loadData(filePath) {
  if (existsSync(filePath)) {
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.warn(`⚠️ Warning: Could not parse ${filePath}, starting fresh`);
      return [];
    }
  }
  return [];
}

/**
 * Save data to file
 */
function saveData(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`💾 Saved data to: ${filePath}`);
}

/**
 * Main seed execution
 */
async function seedTestData() {
  console.log('🚀 Starting Thaimart Automation Seed Script...');
  console.log('🔒 Running in LOCAL-WRITE SAFE MODE');

  // 1. Ensure directories exist
  ensureDirectories();

  // 2. Load existing data
  const products = loadData(CONFIG.productsFile);
  const approvals = loadData(CONFIG.approvalsFile);

  // 3. Reuse existing seed records so repeated local tests stay idempotent.
  const existingProduct = products.find(p => p.sku === CONFIG.seedData.product.sku);
  const productId = existingProduct?.id ?? randomUUID();
  const existingApproval = approvals.find(
    a => a.action_type === CONFIG.seedData.approvalGate.action_type && a.target_reference === productId
  );
  const approvalId = existingApproval?.id ?? randomUUID();

  // 4. Prepare test data
  const testProduct = existingProduct ?? {
    ...CONFIG.seedData.product,
    id: productId
  };

  const testApproval = existingApproval ?? {
    ...CONFIG.seedData.approvalGate,
    id: approvalId,
    target_reference: productId,
    payload_snapshot: {
      product_sku: testProduct.sku,
      product_title_th: testProduct.title_th,
      product_price_thaimart: testProduct.price_thaimart,
      product_stock_thaimart: testProduct.stock_thaimart,
      timestamp: new Date().toISOString(),
      engine_version: 'TigrimOSR-v0.6.2'
    }
  };

  // 5. Check for duplicates
  if (existingProduct) {
    console.log('ℹ️ Product with SKU', testProduct.sku, 'already exists, skipping...');
  } else {
    products.push(testProduct);
    console.log('✅ Added test product:', testProduct.sku);
  }

  if (existingApproval) {
    console.log('ℹ️ Approval gate for this product already exists, skipping...');
  } else {
    approvals.push(testApproval);
    console.log('✅ Added test approval gate:', testApproval.action_type);
  }

  // 6. Save data
  saveData(CONFIG.productsFile, products);
  saveData(CONFIG.approvalsFile, approvals);

  // 7. Output summary
  console.log('\n📊 Seed Summary:');
  console.log('   Products:', products.length);
  console.log('   Approvals:', approvals.length);
  console.log('   Test Product ID:', productId);
  console.log('   Test Approval ID:', approvalId);
  console.log('\n✅ Seed complete! Ready for Telegram approval flow testing.');

  return {
    productId,
    approvalId,
    product: testProduct,
    approval: testApproval
  };
}

/**
 * Run seed script
 */
try {
  const result = await seedTestData();
  console.log('\n🎯 Next Steps:');
  console.log('1. Ensure Cloudflare Worker is deployed and receiving triggers');
  console.log('2. Ensure Telegram bot webhook is configured');
  console.log('3. Look for approval message in Telegram Command Center');
  console.log('4. Tap "✅ AUTHORIZE EXECUTION" in Telegram');
  console.log('5. Check for generated export files in /data/generated-assets/');
} catch (error) {
  console.error('❌ Seed failed:', error.message);
  process.exit(1);
}
