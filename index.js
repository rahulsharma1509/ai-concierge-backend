import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load restaurant directory
const restaurants = JSON.parse(
  fs.readFileSync("./restaurants.json", "utf-8")
);

// Helper: Find restaurant
function normalize(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function findRestaurant(name) {
  if (!name) {
    console.log("❌ No restaurant name provided by AI");
    return null;
  }

  const normalizedInput = normalize(name);

  return restaurants.find(r => {
    if (!r || !r.name) return false;
    const normalizedRestaurant = normalize(r.name);
    return normalizedRestaurant.includes(normalizedInput);
  }) || null;
}



// Email sender
async function sendBookingEmail(restaurant, booking) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: restaurant.email,
    subject: `Reservation Request - ${booking.date}`,
    text: `
Hello ${restaurant.name},

I would like to reserve a table.

Date: ${booking.date}
Time: ${booking.time}
Guests: ${booking.partySize}

Please confirm availability.

Thank you.
    `,
  };

  await transporter.sendMail(mailOptions);
}

// Root check
app.get("/", (req, res) => {
  res.send("AI Concierge Backend Running 🚀");
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract restaurant (field must be named exactly 'restaurant'), date, time, and partySize as JSON only.",
        },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });

    const booking = JSON.parse(
      completion.choices[0].message.content
    );

    console.log("🧠 Extracted Booking:", booking);

    const restaurantName =
      booking.restaurant || booking.restaurantName;

    if (!restaurantName) {
      return res.json({
        message: "Could not understand restaurant name.",
      });
    }

    const restaurant = findRestaurant(restaurantName);

    if (!restaurant) {
      return res.json({
        message: "Restaurant not found in directory.",
      });
    }

    // ✅ HYBRID LOGIC STARTS HERE (inside same scope)

    if (restaurant.email) {
      await sendBookingEmail(restaurant, booking);

      return res.json({
        message: `✅ Reservation email sent to ${restaurant.name}.`,
      });
    } else {
      return res.json({
        message: `📍 ${restaurant.name}`,
        phone: restaurant.phone || "Phone not available",
        website: restaurant.website || "Website not available",
        suggestedMessage: `Hi, I’d like to reserve a table for ${booking.partySize} on ${booking.date} at ${booking.time}.`,
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Something went wrong while processing booking.",
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
