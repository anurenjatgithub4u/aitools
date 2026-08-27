import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const toolsCollection = db.collection('tools');
    
    const processedTools = await toolsCollection.find({ classificationVersion: 1 }).toArray();
    
    console.log(`Found ${processedTools.length} processed tools.\n`);
    
    for (const tool of processedTools) {
      console.log(`--- ${tool.name} ---`);
      console.log(`toolType: ${tool.toolType}`);
      console.log(`aiType: ${JSON.stringify(tool.aiType)}`);
      console.log(`primaryCategory: ${tool.primaryCategory}`);
      console.log(`skillLevel: ${tool.skillLevel}`);
      console.log(`deployment: ${JSON.stringify(tool.deployment)}`);
      console.log(`classificationVersion: ${tool.classificationVersion}`);
      console.log('-------------------\n');
    }
  } catch (err) {
    console.error('Error verifying tools:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
