// One-time (re-runnable) embedding of all tools using Gemini text-embedding-004.
// Stores `embedding` (768 floats) on each tool via the raw collection so it
// stays out of the lean /api/tools response. Re-run after adding new tools.
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const uri = process.env.MONGODB_URI ||
  "mongodb+srv://anurenjatbusiness_db_user:KmFKu8tfhSIeTZQ4@findurai-cluster.wwxa0y0.mongodb.net/findurai?retryWrites=true&w=majority&appName=findurai-cluster";
const KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-embedding-001';

// Build the text that represents a tool's "meaning" for semantic search.
function toolText(t) {
  return [
    t.name,
    t.best_for,
    t.primaryCategory || t.category,
    t.toolType,
    (t.aiType || []).join(', '),
    (t.useCases || []).join(', '),
    (t.capabilities || []).join(', '),
    (t.targetAudience || []).join(', '),
    (t.tags || []).join(', '),
    (t.searchKeywords || []).join(', '),
    t.description,
  ].filter(Boolean).join('. ');
}

async function run() {
  if (!KEY) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }
  const force = process.argv.includes('--force');
  const genAI = new GoogleGenerativeAI(KEY);
  const model = genAI.getGenerativeModel({ model: MODEL });

  await mongoose.connect(uri);
  const col = mongoose.connection.db.collection('tools');

  const query = force ? {} : { embedding: { $exists: false } };
  const tools = await col.find(query).toArray();
  console.log(`Embedding ${tools.length} tools with ${MODEL}...`);
  if (tools.length === 0) { console.log('Nothing to embed.'); await mongoose.disconnect(); process.exit(0); }

  async function embedOne(t, attempt = 0) {
    try {
      const r = await model.embedContent(toolText(t));
      return r.embedding.values;
    } catch (e) {
      if ([429, 500, 503].includes(e.status) && attempt < 6) {
        const wait = e.status === 429 ? 20000 : 3000 * (attempt + 1);
        await new Promise(r => setTimeout(r, wait));
        return embedOne(t, attempt + 1);
      }
      throw e;
    }
  }

  const CHUNK = 5; // light concurrency
  let done = 0;
  for (let i = 0; i < tools.length; i += CHUNK) {
    const batch = tools.slice(i, i + CHUNK);
    const vectors = await Promise.all(batch.map(t => embedOne(t)));
    const ops = batch.map((t, j) => ({
      updateOne: {
        filter: { _id: t._id },
        update: { $set: { embedding: vectors[j], embeddingModel: MODEL, embeddingUpdatedAt: new Date() } },
      },
    }));
    await col.bulkWrite(ops);
    done += batch.length;
    console.log(`  embedded ${done}/${tools.length}`);
    await new Promise(r => setTimeout(r, 400));
  }

  const total = await col.countDocuments({ embedding: { $exists: true } });
  console.log(`Done. Tools with embeddings: ${total}`);
  await mongoose.disconnect();
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
