import mongoose from 'mongoose';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: SchemaType.OBJECT,
      properties: {
        toolType: { type: SchemaType.STRING, nullable: true },
        aiType: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        primaryCategory: { type: SchemaType.STRING, nullable: true },
        secondaryCategories: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        targetAudience: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        skillLevel: { type: SchemaType.STRING, nullable: true },
        deployment: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        platforms: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        capabilities: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        useCases: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        integrations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        hosting: { type: SchemaType.STRING, nullable: true },
        searchKeywords: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        modelFamily: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        supports: {
          type: SchemaType.OBJECT,
          properties: {
            api: { type: SchemaType.BOOLEAN },
            vision: { type: SchemaType.BOOLEAN },
            speech: { type: SchemaType.BOOLEAN },
            images: { type: SchemaType.BOOLEAN },
            embeddings: { type: SchemaType.BOOLEAN },
            fineTuning: { type: SchemaType.BOOLEAN }
          }
        },
        deploymentOptions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        license: { type: SchemaType.STRING, nullable: true },
        ecosystem: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        searchableAliases: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
      }
    }
  }
});

const uri = process.env.MONGODB_URI;

const promptTemplate = `
You are an expert AI tool classifier. Your job is to classify the provided AI tool according to a strict schema.
You MUST ONLY use the allowed values for the fields specified below. NEVER invent new values.
If a field is not applicable, return an empty array [] or false.

ALLOWED VALUES:
- toolType: ["Foundation Model", "Foundation Model API", "AI Application", "AI Assistant", "AI Coding Assistant", "Framework", "Agent Framework", "AI Platform", "Inference Platform", "Vector Database", "RAG Framework", "Automation Platform", "Image Generator", "Video Generator", "Speech Platform", "Search Engine", "Desktop App", "Web App"]
- aiType: ["LLM", "SLM", "VLM", "Multimodal", "Reasoning", "Image Generation", "Video Generation", "Speech", "Speech-to-Text", "Text-to-Speech", "OCR", "Embeddings", "RAG", "Agent", "Search", "Code Generation", "Translation"]
- primaryCategory: ["Developer Tools", "Coding", "Image Generation", "Video Generation", "Productivity", "Voice AI", "Marketing", "Education", "Research", "Automation", "Databases"]
- skillLevel: ["Beginner", "Intermediate", "Advanced", "Professional"]
- deployment: ["Cloud", "Browser", "Desktop", "Mobile", "Local", "Self Hosted"]
- platforms: ["Web", "API", "Windows", "Mac", "Linux", "Android", "iOS"]
- capabilities: ["Chat", "Reasoning", "Vision", "Code Generation", "Image Generation", "Video Generation", "Speech-to-Text", "Text-to-Speech", "Embeddings", "Search", "Function Calling", "Streaming", "Fine Tuning", "RAG"]
- targetAudience: ["Beginners", "Developers", "Designers", "Students", "Researchers", "Businesses", "Startups", "Enterprises", "Content Creators", "Marketers"]
- hosting: ["Cloud", "Local", "Self Hosted", "Hybrid"]
- modelFamily: ["GPT", "Claude", "Gemini", "Llama", "Mistral", "DeepSeek", "Qwen", "Gemma", "Phi", "Grok"] (leave empty if not a model)
- license: ["Commercial", "Open Source", "Apache 2.0", "MIT", "GPL", "Custom"]

Tool to classify:
`;

async function enrichTool(tool, retries = 3) {
  const toolDataStr = JSON.stringify({
    name: tool.name,
    description: tool.description,
    category: tool.category,
    features: tool.features,
    best_for: tool.best_for,
    tags: tool.tags,
    api: tool.api,
    opensource: tool.opensource,
    mobile: tool.mobile
  });

  try {
    const result = await model.generateContent(promptTemplate + toolDataStr);
    const responseText = result.response.text();
    const enrichedData = JSON.parse(responseText);
    
    // Inject classificationVersion
    enrichedData.classificationVersion = 1;
    
    return enrichedData;
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      console.log(`Rate limited on ${tool.name}. Waiting 60 seconds before retrying...`);
      await new Promise(resolve => setTimeout(resolve, 60000));
      return enrichTool(tool, retries - 1);
    }
    console.error(`Error processing tool ${tool.name}:`, error);
    return null;
  }
}

async function run() {
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    process.exit(1);
  }

  const isSample = process.argv.includes('--sample');
  const limitArgIndex = process.argv.indexOf('--limit');
  const limitValue = limitArgIndex !== -1 ? parseInt(process.argv[limitArgIndex + 1]) : null;

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const toolsCollection = db.collection('tools');

    // Find tools that haven't been enriched yet
    const query = { classificationVersion: { $ne: 1 } };
    const totalTools = await toolsCollection.countDocuments(query);

    console.log(`Found ${totalTools} tools to enrich.`);

    const processCount = limitValue || (isSample ? 5 : totalTools);
    const toolsToProcess = await toolsCollection.find(query).limit(processCount).toArray();
    
    if (toolsToProcess.length === 0) {
      console.log("No tools left to enrich.");
      return;
    }
    
    console.log(`Processing ${toolsToProcess.length} tools...`);
    
    let processedCount = 0;
    for (const tool of toolsToProcess) {
      console.log(`[${processedCount + 1}/${toolsToProcess.length}] Enriching: ${tool.name}...`);
      
      const enrichedData = await enrichTool(tool);
      if (enrichedData) {
        await toolsCollection.updateOne(
          { _id: tool._id },
          { $set: enrichedData }
        );
        console.log(`Successfully updated ${tool.name}`);
      }
      
      processedCount++;
      // Sleep to avoid rate limits (15 RPM limit -> 4 seconds per request)
      if (processedCount < toolsToProcess.length) {
        await new Promise(r => setTimeout(r, 4500));
      }
    }
    
    console.log(`Finished processing ${processedCount} tools.`);
    
  } catch (err) {
    console.error('Error in enrich script:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
