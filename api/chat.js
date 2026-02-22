import clientPromise from '../lib/mongodb.js';

// Helper to set CORS headers so your isolated frontends can talk to this backend
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allows both your public portfolio and local admin panel to connect
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default async function handler(req, res) {
  // 1. Handle CORS Preflight request from the browser
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    // 2. Connect to your free Atlas Cluster
    const client = await clientPromise;
    const db = client.db('PortfolioDB'); // This creates the database if it doesn't exist
    
    // Fetch all manually added text from your Knowledge Base
    const kbEntries = await db.collection('knowledge_base').find({}).toArray();
    const kbText = kbEntries.map(entry => entry.content).join('\n');

    // 3. Construct the System Prompt with injected context
    const systemPrompt = `You are the AI assistant for Binsu's developer portfolio. You answer questions about his B.Tech IT studies at Christ University and projects like StoryWeaver, Magnovite, and VoiceSQL. 
    
    Answer strictly based on the following knowledge base:
    ${kbText}
    
    If the answer isn't in the knowledge base, be polite but do not make things up.`;

    // 4. Call the SambaNova API using the standard fetch SDK
    const sambaResponse = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Meta-Llama-3.1-8B-Instruct', // Fast, lightweight model perfect for quick RAG responses
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.2 // Kept low so it doesn't hallucinate outside of your KB
      })
    });

    const data = await sambaResponse.json();
    const botReply = data.choices[0].message.content;

    // 5. Save both sides of the conversation to MongoDB for your secret Admin Panel
    await db.collection('messages').insertOne({
      userMessage: message,
      botReply: botReply,
      timestamp: new Date()
    });

    // 6. Return the AI's response to the Lovable React frontend
    return res.status(200).json({ reply: botReply });

  } catch (error) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}