const mongoose = require('mongoose');

const uri = "mongodb+srv://anurenjatbusiness_db_user:KmFKu8tfhSIeTZQ4@findurai-cluster.wwxa0y0.mongodb.net/findurai?retryWrites=true&w=majority&appName=findurai-cluster";

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const toolsCollection = db.collection('tools');
    
    const tools = await toolsCollection.find({}, { projection: { name: 1, _id: 0 } }).toArray();
    
    console.log("Here are the AI tools in your MongoDB database:");
    tools.forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}`);
    });
    
  } catch (err) {
    console.error('Error fetching tools:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
