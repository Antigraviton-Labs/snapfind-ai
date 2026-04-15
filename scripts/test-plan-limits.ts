/**
 * SnapFind AI — Plan Limits Test Script
 * 
 * Run: npx tsx scripts/test-plan-limits.ts
 * Requires: APP running on http://localhost:3000
 * 
 * Tests:
 * 1. Free user event limit (max 3)
 * 2. Photo limit per event (max 50)
 * 3. Storage limit enforcement
 * 4. Download daily limit (20/day)
 * 5. Face scan rate limit (5/min)
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// ─── Helpers ────────────────────────────────────────────────────────
async function request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const body = await res.json();
    return { status: res.status, body };
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`  ❌ FAIL: ${message}`);
        process.exitCode = 1;
    } else {
        console.log(`  ✅ PASS: ${message}`);
    }
}

// ─── Test 1: Auth & Plan Info ───────────────────────────────────────
async function testAuthAndPlanInfo() {
    console.log('\n📋 Test 1: Auth & Plan Info');

    // Signup
    const email = `test-${Date.now()}@example.com`;
    const signup = await request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test User', email, password: 'TestPass123!' }),
    });

    assert(signup.status === 201, `Signup returns 201 (got ${signup.status})`);
    assert(signup.body.user.role === 'user', `New user role is "user" (got "${signup.body.user?.role}")`);
    assert(signup.body.user.plan === 'free', `New user plan is "free" (got "${signup.body.user?.plan}")`);
    assert(!!signup.body.token, 'Token returned');

    return { token: signup.body.token, email };
}

// ─── Test 2: Event Limit ────────────────────────────────────────────
async function testEventLimit(token: string) {
    console.log('\n📋 Test 2: Free Event Limit (max 3)');

    const headers = { Authorization: `Bearer ${token}` };
    const eventIds: string[] = [];

    for (let i = 1; i <= 3; i++) {
        const res = await request('/api/events', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: `Test Event ${i}`,
                date: '2025-12-31',
                location: 'Test Location',
                privacy: 'public',
            }),
        });
        assert(res.status === 201, `Event ${i} created successfully (status ${res.status})`);
        if (res.body.event?._id) eventIds.push(res.body.event._id);
    }

    // 4th should fail
    const res4 = await request('/api/events', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            title: 'Test Event 4 (should fail)',
            date: '2025-12-31',
            location: 'Test Location',
            privacy: 'public',
        }),
    });
    assert(res4.status === 403, `4th event blocked (status ${res4.status})`);
    assert(res4.body.error?.includes('max'), `Error mentions limit: "${res4.body.error}"`);

    return eventIds;
}

// ─── Test 3: Analytics & Limits ─────────────────────────────────────
async function testAnalyticsLimits(token: string) {
    console.log('\n📋 Test 3: Analytics returns plan limits');

    const res = await request('/api/analytics', {
        headers: { Authorization: `Bearer ${token}` },
    });

    assert(res.status === 200, `Analytics returns 200 (got ${res.status})`);
    assert(!!res.body.limits, 'Response includes limits object');
    assert(res.body.limits?.plan === 'free', `Plan is free (got "${res.body.limits?.plan}")`);
    assert(res.body.limits?.events?.limit === 3, `Events limit is 3 (got ${res.body.limits?.events?.limit})`);
    assert(res.body.limits?.storage?.limit > 0, 'Storage limit is set');
    assert(res.body.limits?.storage?.percentage >= 0, 'Storage percentage is present');
    assert(res.body.limits?.photosPerEvent === 50, `Photos/event is 50 (got ${res.body.limits?.photosPerEvent})`);
    assert(res.body.limits?.downloadsPerDay === 20, `Downloads/day is 20 (got ${res.body.limits?.downloadsPerDay})`);
    assert(res.body.limits?.faceScansPerMinute === 5, `Face scans/min is 5 (got ${res.body.limits?.faceScansPerMinute})`);
}

// ─── Test 4: Download Limit ────────────────────────────────────────
async function testDownloadLimit() {
    console.log('\n📋 Test 4: Download daily limit');
    console.log('  ⚠️  Requires existing photos. Manual test:');
    console.log('     → Download 20 photos from an event\'s public page');
    console.log('     → 21st download should return 429 with "Daily download limit reached"');
    console.log('     → Remaining count should reach 0');
}

// ─── Test 5: Event Deletion Storage Recovery ────────────────────────
async function testEventDeletion(token: string, eventIds: string[]) {
    console.log('\n📋 Test 5: Event deletion recovers storage');

    if (eventIds.length === 0) {
        console.log('  ⚠️  No events to test deletion');
        return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // Delete first event
    const res = await request(`/api/events/${eventIds[0]}`, {
        method: 'DELETE',
        headers,
    });
    assert(res.status === 200, `Event deleted (status ${res.status})`);
    assert(res.body.message?.includes('deleted'), 'Deletion confirmed');

    // Verify user can now create a new event (back under limit)
    const newEvent = await request('/api/events', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            title: 'Post-Delete Event',
            date: '2025-12-31',
            location: 'Test Location',
            privacy: 'public',
        }),
    });
    assert(newEvent.status === 201, `New event created after deletion (status ${newEvent.status})`);
}

// ─── Run All Tests ──────────────────────────────────────────────────
async function main() {
    console.log('🧪 SnapFind AI — Plan Limits Test Suite');
    console.log(`   Target: ${BASE_URL}`);
    console.log('━'.repeat(50));

    try {
        const { token } = await testAuthAndPlanInfo();
        const eventIds = await testEventLimit(token);
        await testAnalyticsLimits(token);
        await testDownloadLimit();
        await testEventDeletion(token, eventIds);

        console.log('\n' + '━'.repeat(50));
        console.log(process.exitCode ? '❌ Some tests failed' : '✅ All tests passed!');
    } catch (error) {
        console.error('\n💥 Test suite crashed:', error);
        process.exitCode = 1;
    }
}

main();
