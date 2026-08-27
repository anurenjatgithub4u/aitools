const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

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

// Minimal Tool schema for migration
const ToolSchema = new mongoose.Schema({}, { strict: false });
const Tool = mongoose.models.Tool || mongoose.model("Tool", ToolSchema);

async function runMigration() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    console.log("Running migration to add reviewStatus, lastVerifiedAt, and lastUpdatedType...");

    const result = await Tool.updateMany(
      { reviewStatus: { $exists: false } }, // Only update those missing the field
      {
        $set: {
          reviewStatus: "none",
          lastVerifiedAt: new Date(),
          lastUpdatedType: "initial"
        }
      }
    );

    console.log(`Migration complete. Modified ${result.modifiedCount} documents.`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
