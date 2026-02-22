import 'dotenv/config';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("💬 Chatbot Live! (Type 'exit' to quit)");

const ask = () => {
  rl.question("You: ", async (msg) => {
    if (msg.toLowerCase() === 'exit') return rl.close();

    const response = await fetch('https://serverless-chatbot-backend.vercel.app/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });

    const data = await response.json();
    console.log(`🤖 Bot: ${data.reply || data.error}\n`);
    ask();
  });
};

ask();