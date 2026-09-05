import fs from "node:fs";
import path from "node:path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

// Load .env files if present
for (const envPath of [".env", "backend/.env", "frontend/.env"]) {
  const full = path.resolve(process.cwd(), envPath);
  if (fs.existsSync(full)) {
    const lines = fs.readFileSync(full, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
}

const firebaseConfig = {
  apiKey: "AIzaSyCa4S7Nb0qyRTjg7n79pOw5B9tDPN_EelI",
  authDomain: "sentrypay-4537d.firebaseapp.com",
  projectId: "sentrypay-4537d",
  storageBucket: "sentrypay-4537d.firebasestorage.app",
  messagingSenderId: "55309665804",
  appId: "1:55309665804:web:e00a34dda65b22ab255029",
  measurementId: "G-TTZFZZPRZH"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || process.env.VITE_PEXELS_API_KEY || "";

const FALLBACK_PLACEHOLDER = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";

const CURATED_PEXELS_MAP: Record<string, string> = {
  "wireless bluetooth earbuds": "https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&h=350",
  "smart fitness watch": "https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&h=350",
  "cotton casual shirt": "https://images.pexels.com/photos/297933/pexels-photo-297933.jpeg?auto=compress&cs=tinysrgb&h=350",
  "running shoes": "https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&h=350",
  "non-stick cookware set": "https://images.pexels.com/photos/4253127/pexels-photo-4253127.jpeg?auto=compress&cs=tinysrgb&h=350",
  "electric kettle": "https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&h=350",
  "premium basmati rice 5kg": "https://images.pexels.com/photos/4110255/pexels-photo-4110255.jpeg?auto=compress&cs=tinysrgb&h=350",
  "olive oil 1l": "https://images.pexels.com/photos/33783/olive-oil-salad-dressing-cooking-olive.jpg?auto=compress&cs=tinysrgb&h=350",
  "noise cancelling headphones": "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&h=350",
  "formal leather belt": "https://images.pexels.com/photos/45055/leather-belt-brown-metal-45055.jpeg?auto=compress&cs=tinysrgb&h=350",
  "bluetooth headphones": "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&h=350",
};

async function fetchPexelsImage(query: string, category?: string): Promise<string> {
  if (!PEXELS_API_KEY) {
    const lower = query.toLowerCase();
    for (const [k, url] of Object.entries(CURATED_PEXELS_MAP)) {
      if (lower.includes(k) || k.includes(lower)) {
        return url;
      }
    }
    console.warn(`⚠️  PEXELS_API_KEY not found in environment variables. Falling back for "${query}".`);
    return FALLBACK_PLACEHOLDER;
  }

  try {
    // 1. Search by product name
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.photos && data.photos.length > 0 && data.photos[0]?.src?.medium) {
        return data.photos[0].src.medium;
      }
    }

    // 2. Fall back to category if product name returned 0 results
    if (category) {
      const catRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(category)}&per_page=1`, {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      });
      if (catRes.ok) {
        const catData = await catRes.json();
        if (catData.photos && catData.photos.length > 0 && catData.photos[0]?.src?.medium) {
          return catData.photos[0].src.medium;
        }
      }
    }
  } catch (err) {
    console.error(`Error querying Pexels for "${query}":`, err);
  }

  return FALLBACK_PLACEHOLDER;
}

async function backfillCatalogImages() {
  console.log("=================================================");
  console.log("📷 Starting Pexels Catalog Image Backfill Script");
  console.log("=================================================");

  const merchantId = "demo_merchant";
  const catalogRef = collection(db, `merchants/${merchantId}/catalog`);
  const snapshot = await getDocs(catalogRef);

  if (snapshot.empty) {
    console.log("No catalog products found in Firestore.");
    return;
  }

  console.log(`Found ${snapshot.docs.length} products to evaluate...\n`);

  let updatedCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const productName = data.name || "";
    const category = data.category || "";
    const currentImg = data.imageUrl || "";

    console.log(`🔍 Processing [${docSnap.id}] "${productName}" (${category})`);
    console.log(`   Current Image: ${currentImg}`);

    const newImageUrl = await fetchPexelsImage(productName, category);

    await updateDoc(doc(db, `merchants/${merchantId}/catalog`, docSnap.id), {
      imageUrl: newImageUrl,
      updatedAt: new Date().toISOString(),
    });

    console.log(`   ✓ Updated Image -> ${newImageUrl}\n`);
    updatedCount++;

    // Minor delay between calls to respect Pexels rate limits
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log("=================================================");
  console.log(`🎉 Backfill Complete! Successfully updated ${updatedCount} products in Firestore.`);
  console.log("=================================================");
}

backfillCatalogImages().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
