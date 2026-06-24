/**
 * One-time backfill: copy non-PII fields from users/ into publicProfiles/.
 * Works on Spark (no Cloud Functions). Uses firebase-admin from functions/node_modules.
 *
 *   cd functions && npm install
 *   cd ..
 *   npm run backfill:public-profiles
 *
 * Requires a service account with Firestore access:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 */
const path = require("path");

const admin = require(path.join(__dirname, "..", "functions", "node_modules", "firebase-admin"));
const { buildPublicProfileData } = require(path.join(__dirname, "..", "functions", "src", "publicProfile"));

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function backfill() {
  const snapshot = await db.collection("users").get();
  let written = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const payload = buildPublicProfileData(docSnap.id, data);
    if (!payload.name) {
      skipped += 1;
      continue;
    }
    await db.collection("publicProfiles").doc(docSnap.id).set(payload, { merge: true });
    written += 1;
  }

  console.log(`Backfill complete: ${written} written, ${skipped} skipped.`);
  console.log(
    "Tip: set publicProfiles.status to APPROVED in Firebase Console for mechanics who should appear on the map."
  );
}

backfill().catch((error) => {
  console.error(error);
  process.exit(1);
});
