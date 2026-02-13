

require("dotenv").config();
console.log("API KEY:", process.env.OPENAI_API_KEY);
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
          You are Rahul's AI restaurant booking agent.
          Extract the following in structured JSON:
          - restaurant
          - city
          - date
          - time
          - partySize
          Return JSON only.
          `
        },
        {
          role: "user",
          content: userMessage
        }
      ],
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("AI Concierge Backend is running 🚀");
});


