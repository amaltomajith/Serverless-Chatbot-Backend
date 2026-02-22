import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  // --- 1. CORS HEADERS (The Bouncer VIP List) ---
  res.setHeader('Access-Control-Allow-Origin', '*'); // The '*' allows Lovable's preview URL to connect
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // If the browser sends a quick "pre-flight" check, say everything is okay!
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- 2. REQUIRE POST METHOD ---
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;

  try {
    const client = await clientPromise;
    const db = client.db('PortfolioDB');
    
    // --- 3. FETCH KNOWLEDGE BASE ---
    const kbData = await db.collection('kb').find({}).toArray();
    const context = kbData.map(doc => doc.content).join("\n");

    // --- 4. CONSTRUCT SYSTEM PROMPT ---
    const systemPrompt = `You are an AI version of Amal Tom Ajith, chatting directly with visitors on your developer portfolio. 
    Speak in the first person ("I", "my") and answer as if you are Amal. 
    Keep your tone chill, humble, friendly, and professional. Do not boast.
    If someone asks a question, use the following Knowledge Base to answer naturally:
    
    ${context}`;

    // --- 5. CALL SAMBANOVA ---
    const response = await fetch('https://api.sambanova.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SAMBANOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      })
    });

    const data = await response.json();
    
    // SAFETY NET: Check if SambaNova sent an error instead of a response
    if (!data.choices || data.choices.length === 0) {
      console.error("SambaNova API Error:", JSON.stringify(data, null, 2));
      return res.status(500).json({ error: "SambaNova failed to respond", details: data });
    }

    const botReply = data.choices[0].message.content;

    // --- 6. SAVE CHAT TO HISTORY ---
    await db.collection('messages').insertOne({
      role: 'user', 
      content: message, 
      timestamp: new Date() 
    });
    await db.collection('messages').insertOne({
      role: 'assistant', 
      content: botReply, 
      timestamp: new Date() 
    });

    res.status(200).json({ reply: botReply });
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}