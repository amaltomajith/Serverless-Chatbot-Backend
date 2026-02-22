import clientPromise from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;

  try {
    const client = await clientPromise;
    const db = client.db('PortfolioDB');
    
    // 1. FETCH ALL KNOWLEDGE (Simplified Search)
    const kbData = await db.collection('kb').find({}).toArray();
    const context = kbData.map(doc => doc.content).join("\n");

    // 2. CONSTRUCT SYSTEM PROMPT WITH CONTEXT
    const systemPrompt = `You are an AI version of Amal Tom Ajith, chatting directly with visitors on your developer portfolio. 
    Speak in the first person ("I", "my") and answer as if you are Amal. 
    Keep your tone chill, humble, friendly, and professional. Do not boast.
    If someone asks a question, use the following Knowledge Base to answer naturally:
    
    ${context}`;


    // 3. CALL SAMBANOVA
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
    const botReply = data.choices[0].message.content;

    // 4. SAVE CHAT TO HISTORY
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