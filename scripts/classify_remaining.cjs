// Bulk classification for remaining AI tools (no LLM API needed).
// Sets only the new schema fields + classificationVersion: 1, keyed by tool `id`.
// Idempotent: matches by id, only $set the new fields, leaves existing fields intact.
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI ||
  "mongodb+srv://anurenjatbusiness_db_user:KmFKu8tfhSIeTZQ4@findurai-cluster.wwxa0y0.mongodb.net/findurai?retryWrites=true&w=majority&appName=findurai-cluster";

// supports helper: build {api,vision,speech,images,embeddings,fineTuning}
function sup(o = {}) {
  return {
    api: !!o.api, vision: !!o.vision, speech: !!o.speech,
    images: !!o.images, embeddings: !!o.embeddings, fineTuning: !!o.fineTuning,
  };
}

// CLASSIFICATIONS keyed by tool id. Loaded from sibling data file.
const CLASSIFICATIONS = require('./classifications_data.cjs')(sup);

async function run() {
  await mongoose.connect(uri);
  const c = mongoose.connection.db.collection('tools');
  let updated = 0, missing = [];
  for (const [id, fields] of Object.entries(CLASSIFICATIONS)) {
    const data = { ...fields, classificationVersion: 1 };
    const res = await c.updateOne({ id }, { $set: data });
    if (res.matchedCount === 0) missing.push(id);
    else updated++;
  }
  console.log(`Updated ${updated} tools.`);
  if (missing.length) console.log(`No match for ids: ${missing.join(', ')}`);
  const remaining = await c.countDocuments({ classificationVersion: { $ne: 1 } });
  console.log(`Remaining unclassified: ${remaining}`);
  await mongoose.disconnect();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
