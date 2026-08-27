const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

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

// Function to generate slug from name
function generateSlug(name) {
  return name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
}

async function runMigration() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    console.log("Fetching all tools to update slugs...");
    const tools = await Tool.find({});
    
    let updatedCount = 0;

    for (const tool of tools) {
      // Check if we need to update this tool
      const needsUpdate = !tool.slug || tool.developer === undefined;
      
      if (needsUpdate) {
        // Create a unique slug (append id if name is somehow not unique after slugifying, though rare)
        let newSlug = generateSlug(tool.name);
        
        await Tool.updateOne(
          { _id: tool._id },
          {
            $set: {
              slug: tool.slug || newSlug,
              developer: tool.developer || "",
              launchYear: tool.launchYear || null,
              pricingModel: tool.pricingModel || "",
              startingPrice: tool.startingPrice || "",
              enterprise: tool.enterprise !== undefined ? tool.enterprise : false,
              verified: tool.verified !== undefined ? tool.verified : true,
              featured: tool.featured !== undefined ? tool.featured : false,
              affiliateUrl: tool.affiliateUrl || "",
              useCases: tool.useCases || []
            }
          }
        );
        updatedCount++;
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} documents with the new schema fields.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  }
}

runMigration();
