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

// Load tools data from static JSON in public
const toolsDataPath = path.join(__dirname, "../public/ai_tools.json");
if (!fs.existsSync(toolsDataPath)) {
  console.error("Error: ai_tools.json not found at", toolsDataPath);
  process.exit(1);
}
const rawTools = JSON.parse(fs.readFileSync(toolsDataPath, "utf8"));

// Define local schema matching models/Tool.ts to run inside Node runtime directly
const FAQSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
}, { _id: false });

const ToolSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  website: { type: String, required: true },
  logo: { type: String, required: true },
  category: { type: String, required: true },
  pricing: { type: String, required: true },
  free_plan: { type: Boolean, required: true },
  api: { type: Boolean, required: true },
  mobile: { type: Boolean, required: true },
  opensource: { type: Boolean, required: true },
  rating: { type: Number, required: true },
  best_for: { type: String, required: true },
  difficulty: { type: String, required: true },
  pros: { type: [String], default: [] },
  cons: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  features: { type: [String], default: [] },
  alternatives: { type: [String], default: [] },
  faq: { type: [FAQSchema], default: [] },
  addedDate: { type: String },
  trendingScore: { type: Number },
}, { timestamps: true });

const Tool = mongoose.models.Tool || mongoose.model("Tool", ToolSchema);

// Mapper function to convert ai_tools.json items to ToolSchema
function mapItem(item) {
  const website = item.website_url || item.website;
  let domain = "";
  try {
    domain = new URL(website).hostname.replace("www.", "");
  } catch (e) {
    domain = item.slug + ".com";
  }
  const logo = item.favicon_url || item.logo || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  let pricing = item.pricing;
  if (!pricing) {
    pricing = "Paid";
    if (item.pricing?.model === "free") pricing = "Free";
    else if (item.pricing?.model === "freemium") pricing = "Freemium";
    else if (item.pricing?.has_free_tier) pricing = "Freemium";
  }

  const free_plan = item.free_plan !== undefined ? item.free_plan : !!item.pricing?.has_free_tier;
  const api = item.api !== undefined ? item.api : (item.platforms?.includes("api") || item.tags?.includes("api") || false);
  const mobile = item.mobile !== undefined ? item.mobile : (item.platforms?.includes("mobile") || item.platforms?.includes("ios") || item.platforms?.includes("android") || false);
  const opensource = item.opensource !== undefined ? item.opensource : (item.tags?.includes("open source") || item.tags?.includes("opensource") || item.subcategory === "Open Source LLM" || false);
  
  // Rating: scale 5-star to 10-star and keep 1 decimal place
  const rawRating = item.metrics?.avg_rating || 4.5;
  const rating = item.rating || Math.min(10, Math.round(rawRating * 2 * 10) / 10);

  const best_for = item.best_for || item.tagline || (item.use_cases && item.use_cases[0]) || "General productivity";

  let difficulty = item.difficulty || "Beginner";
  if (!item.difficulty) {
    if (item.category === "Developer Tools" || item.tags?.includes("api") || item.tags?.includes("developer")) {
      difficulty = "Professional";
    } else if (item.tags?.includes("design") || item.tags?.includes("video") || item.category === "AI Video" || item.category === "AI Image") {
      difficulty = "Intermediate";
    }
  }

  const pros = item.pros || [];
  if (pros.length === 0) {
    if (free_plan) pros.push("Free tier/plan available");
    else pros.push("Premium features and quality");
    if (api) pros.push("Developer API access available");
    if (opensource) pros.push("Open-source codebase");
    else pros.push("Professional support & updates");
    pros.push(`Excellent tools for ${item.category}`);
  }

  const cons = item.cons || [];
  if (cons.length === 0) {
    if (pricing === "Paid") cons.push("Requires paid subscription");
    if (!opensource) cons.push("Closed source platform");
    if (difficulty === "Professional") cons.push("Steep learning curve for beginners");
    cons.push("Requires active internet connection");
  }

  const tags = item.tags || [];
  const features = item.features || item.use_cases || [];
  const alternatives = item.alternatives || [];
  
  const faq = item.faq && item.faq.length > 0 ? item.faq : [
    {
      question: `Is ${item.name} free to use?`,
      answer: `${item.name} is offered under a ${pricing.toLowerCase()} model. ${free_plan ? "You can start using it for free with their free plan/tier." : "It requires a paid subscription to access its core features."}`
    },
    {
      question: `Does ${item.name} have developer API access?`,
      answer: api 
        ? `Yes, ${item.name} offers developer API integrations.` 
        : `Currently, direct developer API access is not prominently listed for ${item.name}.`
    }
  ];

  const addedDate = item.addedDate || (item.dates?.published_at ? item.dates.published_at.substring(0, 10) : new Date().toISOString().substring(0, 10));
  const trendingScore = item.trendingScore || item.trending?.score || 0;

  return {
    id: item.id || item.slug,
    name: item.name,
    description: item.description,
    website,
    logo,
    category: item.category,
    pricing,
    free_plan,
    api,
    mobile,
    opensource,
    rating,
    best_for,
    difficulty,
    pros,
    cons,
    tags,
    features,
    alternatives,
    faq,
    addedDate,
    trendingScore,
    reviewStatus: "none",
    lastVerifiedAt: new Date(),
    lastUpdatedType: "initial"
  };
}

async function seed() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected successfully!");

    // console.log("Clearing existing tools collection...");
    // const deleteResult = await Tool.deleteMany({});
    // console.log(`Deleted ${deleteResult.deletedCount} tools.`);

    console.log(`Mapping ${rawTools.length} tools to schema format...`);
    const mappedTools = rawTools.map(mapItem);

    console.log(`Inserting ${mappedTools.length} tools into MongoDB...`);
    const insertResult = await Tool.insertMany(mappedTools);
    console.log(`Successfully seeded ${insertResult.length} tools!`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
