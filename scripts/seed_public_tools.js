const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Parse .env.local manually to get connection string
const envPath = path.join(__dirname, "../.env.local");
let uri = process.env.MONGODB_URI;

if (!uri && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  const match = envContent.match(/^MONGODB_URI=(.+)$/m);
  if (match) {
    uri = match[1].trim();
  }
}

if (!uri) {
  console.error("Error: MONGODB_URI not found in environment or .env.local");
  process.exit(1);
}

const ToolSchema = new mongoose.Schema({}, { strict: false });
const Tool = mongoose.models.Tool || mongoose.model("Tool", ToolSchema);

async function runSeed() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    const toolsFilePath = path.join(__dirname, "../public/ai_tools.json");
    console.log(`Reading tools from ${toolsFilePath}...`);
    
    if (!fs.existsSync(toolsFilePath)) {
      console.error("Error: file does not exist.");
      process.exit(1);
    }

    const rawData = fs.readFileSync(toolsFilePath, "utf8");
    const newTools = JSON.parse(rawData);

    console.log(`Found ${newTools.length} tools. Upserting into database...`);

    let insertedCount = 0;
    let updatedCount = 0;

    for (const tool of newTools) {
      // Upsert based on tool id
      const result = await Tool.updateOne(
        { id: tool.id },
        { $set: tool },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        insertedCount++;
      } else if (result.modifiedCount > 0) {
        updatedCount++;
      }
    }

    console.log(`Done! Inserted ${insertedCount} new tools and updated ${updatedCount} existing tools.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

runSeed();
