const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs');

(async () => {
  try {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    const testEnv = await initializeTestEnvironment({
      projectId: 'guruji-satsang-b650a',
      firestore: { 
        rules
      }
    });

    console.log('=== Test: collectionGroup query on attendees ===\n');

    // Create an organizer context
    const organizer = testEnv.authenticatedContext('organizerUid');
    const organizerDb = organizer.firestore();

    // Create a satsang as the organizer
    console.log('1. Creating satsang as organizer...');
    await organizerDb.collection('satsangs').doc('satsang1').set({
      title: 'Test Satsang',
      organizerUid: 'organizerUid',
      date: '2025-06-01',
      status: 'upcoming',
      attendeeCount: 1,
    });
    console.log('   Satsang created: satsang1\n');

    // Create an attendee document as alice
    const alice = testEnv.authenticatedContext('aliceUid');
    const aliceDb = alice.firestore();

    console.log('2. Creating attendee record as alice...');
    await aliceDb.collection('satsangs').doc('satsang1').collection('attendees').doc('aliceUid').set({
      userUid: 'aliceUid',
      userName: 'Alice',
      userEmail: 'alice@example.com',
      guests: 0,
    });
    console.log('   Attendee created: aliceUid\n');

    // Now query attendees as alice using collectionGroup
    console.log('3. Running collectionGroup query as alice for userUid==aliceUid...');
    const q = aliceDb.collectionGroup('attendees').where('userUid', '==', 'aliceUid');
    try {
      const snap = await q.get();
      console.log('   ✓ Query SUCCEEDED');
      console.log('   Docs found:', snap.docs.map(d => ({ id: d.id, path: d.ref.path, data: d.data() })));
    } catch (err) {
      console.error('   ✗ Query FAILED:', err.message || err);
    }

    await testEnv.cleanup();
    process.exit(0);
  } catch (e) {
    console.error('Test run failed:', e);
    process.exit(2);
  }
})();
