import 'dotenv/config'; // Loads your .env file
import clientPromise from './lib/mongodb.js';

async function test() {
  console.log("🚀 Starting Local Test...");

  try {
    // 1. Test MongoDB
    console.log("Testing MongoDB Connection...");
    const client = await clientPromise;
    const db = client.db('PortfolioDB');
    await db.command({ ping: 1 });
    console.log("✅ MongoDB Connected Successfully!");

    // 2. Test SambaNova
    console.log("Testing SambaNova API...");
    const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'user', content: 'Say hello!' }],
      })
    });

    const data = await response.json();
    if (data.choices) {
      console.log("✅ SambaNova Responded:", data.choices[0].message.content);
    } else {
      console.log("❌ SambaNova Error:", data);
    }

  } catch (err) {
    console.error("❌ TEST FAILED:");
    console.error(err);
  } finally {
    process.exit();
  }
}

test();