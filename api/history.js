import clientPromise from '../lib/mongodb.js';

const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // This endpoint only needs to read data
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('PortfolioDB');
    
    // Fetch all messages, newest at the top
    const messages = await db.collection('messages').find({}).sort({ timestamp: -1 }).toArray();
    return res.status(200).json(messages);
  } catch (error) {
    console.error('History API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}