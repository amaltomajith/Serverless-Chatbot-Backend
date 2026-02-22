import clientPromise from '../lib/mongodb.js';
import { ObjectId } from 'mongodb';

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

  try {
    const client = await clientPromise;
    const db = client.db('PortfolioDB');
    const collection = db.collection('knowledge_base');

    // GET: Fetch the whole Knowledge Base
    if (req.method === 'GET') {
      const kb = await collection.find({}).sort({ _id: -1 }).toArray();
      return res.status(200).json(kb);
    }

    // POST: Add new text to the Knowledge Base
    if (req.method === 'POST') {
      const { content } = req.body;
      if (!content) return res.status(400).json({ error: 'Content is required' });
      
      const result = await collection.insertOne({ content, addedAt: new Date() });
      return res.status(201).json({ success: true, id: result.insertedId });
    }

    // DELETE: Remove an entry
    if (req.method === 'DELETE') {
      const { id } = req.body;
      await collection.deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('KB API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}