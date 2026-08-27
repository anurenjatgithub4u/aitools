const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const uri = "mongodb+srv://anurenjatbusiness_db_user:KmFKu8tfhSIeTZQ4@findurai-cluster.wwxa0y0.mongodb.net/findurai?retryWrites=true&w=majority&appName=findurai-cluster";

async function run() {
  try {
    await mongoose.connect(uri);
    
    // Instead of raw model, let's load it without schema strictness for a moment, or debug the data
    const toolsPath = path.join(__dirname, '../public/ai_tools.json');
    const toolsData = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
    
    console.log(`Found ${toolsData.length} tools to import`);
    
    const db = mongoose.connection.db;
    const toolsCollection = db.collection('tools');
    
    for (const tool of toolsData) {
      if (!tool.id) {
        console.log('Tool is missing id:', tool.name);
        continue;
      }
      const existing = await toolsCollection.findOne({ $or: [{ id: tool.id }, { slug: tool.slug }] });
      if (existing) {
        console.log(`Tool ${tool.name} already exists. Updating...`);
        await toolsCollection.updateOne({ _id: existing._id }, { $set: tool });
      } else {
        console.log(`Adding new tool: ${tool.name}`);
        await toolsCollection.insertOne(tool);
      }
    }
    
    console.log('Import completed successfully!');
  } catch (err) {
    console.error('Error importing tools:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
