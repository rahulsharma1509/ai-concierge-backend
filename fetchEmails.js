import fs from "fs";

const GOOGLE_API_KEY = "GOOGLE_API_KEY";

const restaurants = JSON.parse(
  fs.readFileSync("./restaurants.json", "utf-8")
);

async function findPlace(name, area) {
  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.websiteUri,places.nationalPhoneNumber",
        },
        body: JSON.stringify({
          textQuery: `${name} ${area}`,
        }),
      }
    );

    const data = await response.json();

    console.log("\n🔎 Searching:", name);
    console.log("Status:", response.status);

    if (!data.places || data.places.length === 0) {
      console.log("❌ No results");
      return null;
    }

    return data.places[0];
  } catch (error) {
    console.log("⚠️ API Error:", error);
    return null;
  }
}

async function extractEmailFromWebsite(website) {
  if (!website) return null;

  try {
    const res = await fetch(website);
    const html = await res.text();

    const emailMatch = html.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

    return emailMatch ? emailMatch[0] : null;
  } catch {
    return null;
  }
}

async function processRestaurants() {
  for (let restaurant of restaurants) {
    const place = await findPlace(
      restaurant.name,
      restaurant.area
    );

    restaurant.website = place?.websiteUri || null;
    restaurant.phone = place?.nationalPhoneNumber || null;

    if (restaurant.website) {
      restaurant.email = await extractEmailFromWebsite(
        restaurant.website
      );
    } else {
      restaurant.email = null;
    }
  }

  fs.writeFileSync(
    "./restaurants_with_contacts.json",
    JSON.stringify(restaurants, null, 2)
  );

  console.log("\n✅ Finished. Check restaurants_with_contacts.json");
}

processRestaurants();
