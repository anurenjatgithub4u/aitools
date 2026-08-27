// Inserts new tool documents from a JSON file into MongoDB.
// Idempotent-ish: skips any id/slug that already exists, inserts the rest.
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI ||
  "mongodb+srv://anurenjatbusiness_db_user:KmFKu8tfhSIeTZQ4@findurai-cluster.wwxa0y0.mongodb.net/findurai?retryWrites=true&w=majority&appName=findurai-cluster";

const file = process.argv[2] || 'scripts/new_tools_batch1.json';

async function run() {
  const docs = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  await mongoose.connect(uri);
  const c = mongoose.connection.db.collection('tools');

  // Filter out anything that already exists by id, slug, or name.
  const ids = docs.map(d => d.id);
  const slugs = docs.map(d => d.slug).filter(Boolean);
  const names = docs.map(d => d.name);
  const existing = await c.find(
    { $or: [{ id: { $in: ids } }, { slug: { $in: slugs } }, { name: { $in: names } }] },
    { projection: { id: 1, slug: 1, name: 1, _id: 0 } }
  ).toArray();
  const exId = new Set(existing.map(e => e.id));
  const exSlug = new Set(existing.map(e => e.slug));
  const exName = new Set(existing.map(e => e.name));

  const now = new Date();
  const toInsert = [];
  const skipped = [];
  for (const d of docs) {
    if (exId.has(d.id) || exSlug.has(d.slug) || exName.has(d.name)) {
      skipped.push(d.id);
      continue;
    }
    toInsert.push({
      ...d,
      lastVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    });
  }

  if (skipped.length) console.log(`Skipping ${skipped.length} already-present: ${skipped.join(', ')}`);

  if (toInsert.length === 0) {
    console.log('Nothing to insert.');
  } else {
    const res = await c.insertMany(toInsert, { ordered: false });
    console.log(`Inserted ${res.insertedCount} tools.`);
  }

  const total = await c.countDocuments({});
  console.log(`Total tools in collection now: ${total}`);
  await mongoose.disconnect();
  process.exit(0);
}
run().catch(e => { console.error('Insert error:', e); process.exit(1); });
