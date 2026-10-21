/**
 * Netflix Clone 3-Tier VPC Architecture Verification Script
 * Validates Frontend, Backend API, RDS PostgreSQL, S3, and Security Isolation.
 */

const FRONTEND_HOST = process.env.CLIENT_HOST || '3.107.19.174';
const FRONTEND_URL = `http://${FRONTEND_HOST}`;
const BACKEND_PRIVATE_IP = process.env.BACKEND_HOST || '10.0.128.135';
const RDS_ENDPOINT = process.env.DB_HOST || 'database-2.cpcgg0esko34.ap-southeast-2.rds.amazonaws.com';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 Netflix Clone 3-Tier VPC Deployment Verification');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function check(name, testFn) {
    total++;
    process.stdout.write(`[${total}] ${name} ... `);
    try {
      await testFn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
    }
  }

  // 1. Frontend Web Access
  await check('Frontend Web Access (Public HTTP :80)', async () => {
    const res = await fetch(`${FRONTEND_URL}/`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP status ${res.status}`);
  });

  // 2. Reverse Proxy API & S3 Config
  await check('API Reverse Proxy to Private Backend (/api/v1/upload/config)', async () => {
    const res = await fetch(`${FRONTEND_URL}/api/v1/upload/config`, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    if (!json.configured || json.bucket !== 'netflix-videos-srinesh-2026') {
      throw new Error(`Unexpected config response: ${JSON.stringify(json)}`);
    }
  });

  // 3. User Authentication against RDS PostgreSQL
  await check('RDS PostgreSQL Database Operations (User Signup/Login)', async () => {
    const randomSuffix = Math.floor(Math.random() * 100000);
    const testEmail = `verify_${Date.now()}_${randomSuffix}@example.com`;
    const testUsername = `user_${Date.now()}_${randomSuffix}`;
    const testPassword = 'Password123!';

    const signupRes = await fetch(`${FRONTEND_URL}/api/v1/account/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, username: testUsername, password: testPassword }),
      signal: AbortSignal.timeout(10000),
    });
    const signupData = await signupRes.json();
    if (!signupData.success) throw new Error(`Signup failed: ${signupData.message}`);

    const loginRes = await fetch(`${FRONTEND_URL}/api/v1/account/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
      signal: AbortSignal.timeout(10000),
    });
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error(`Login failed: ${loginData.message}`);
  });

  // 4. AWS S3 Video Uploader Integration
  await check('AWS S3 Video Upload Integration via NAT Gateway', async () => {
    const formData = new FormData();
    const fakeVideoBuffer = new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109]); // MP4 ftyp header
    const blob = new Blob([fakeVideoBuffer], { type: 'video/mp4' });
    formData.append('video', blob, 'test-verification.mp4');

    const res = await fetch(`${FRONTEND_URL}/api/v1/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });
    const json = await res.json();
    if (!json.success || !json.videoUrl) throw new Error(`Upload failed: ${json.message}`);
  });

  // 5. Backend Private Isolation
  await check('Backend Network Isolation (Direct port 8000 blocked externally)', async () => {
    try {
      await fetch(`http://${BACKEND_PRIVATE_IP}:8000/`, { signal: AbortSignal.timeout(3000) });
      throw new Error('Direct connection succeeded when it should have timed out!');
    } catch (e) {
      if (e.message.includes('succeeded')) throw e;
      // Timeout is expected and desired
    }
  });

  console.log('\n====================================================');
  console.log(`Results: ${passed}/${total} checks passed (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');
}

runTests().catch(console.error);
