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

// Tool schema (minimal)
const ToolSchema = new mongoose.Schema({
  id: String,
  reviewStatus: String
}, { strict: false });
const Tool = mongoose.models.Tool || mongoose.model("Tool", ToolSchema);

// ToolReview schema (minimal)
const ToolReviewSchema = new mongoose.Schema({}, { strict: false });
const ToolReview = mongoose.models.ToolReview || mongoose.model("ToolReview", ToolReviewSchema);

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    // 1. Create a dummy review for OpenAI API (slug: openai-api)
    const reviewData = {
      toolId: "openai-api",
      slug: "openai-api",
      title: "OpenAI API: The Ultimate AI Engine for Developers",
      shortDescription: "A comprehensive review of the industry-leading AI API.",
      overview: "The OpenAI API provides developers with access to state-of-the-art language and image models. It's designed to be flexible and powerful.",
      keyFeatures: "- Advanced natural language processing\n- Text-to-image generation\n- Speech-to-text transcription",
      useCases: "- Building chatbots\n- Automating content generation\n- Enhancing search functionality",
      pricingDetails: "Pay-as-you-go based on token usage. Free tier available for getting started.",
      prosAnalysis: "Extremely capable models. Great documentation. Reliable infrastructure.",
      consAnalysis: "Can get expensive at scale. Occasional API rate limits during peak times.",
      alternatives: "Anthropic Claude, Google Gemini API, Cohere.",
      verdict: "An essential tool for any developer looking to integrate AI capabilities into their applications.",
      faq: [
        { question: "Is it free?", answer: "No, but you get initial free credits." }
      ],
      seoTitle: "OpenAI API Review 2026 - FindurAI",
      seoDescription: "Read our comprehensive review of the OpenAI API for developers.",
      seoKeywords: ["openai", "api", "review", "ai models"],
      published: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await ToolReview.findOneAndUpdate(
      { toolId: "openai-api" },
      { $set: reviewData },
      { upsert: true, new: true }
    );
    console.log("Dummy review created in tool_reviews collection.");

    // 2. Update the Tool collection
    await Tool.updateOne(
      { id: "openai-api" },
      { $set: { reviewStatus: "published" } }
    );
    console.log("Updated OpenAI API tool with reviewStatus: 'published'.");

    await mongoose.disconnect();
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
