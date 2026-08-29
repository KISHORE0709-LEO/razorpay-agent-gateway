import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config();

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

const seedData = async () => {
  const merchantId = "demo_merchant";
  
  // 1. Merchant profile
  console.log("Seeding merchant profile...");
  await setDoc(doc(db, "merchants", merchantId), {
    name: "Demo Merchant",
    email: "demo@sentrypay.com",
    createdAt: new Date().toISOString()
  });

  // 2. Rules
  console.log("Seeding rules...");
  await setDoc(doc(db, `merchants/${merchantId}/rules`, "current"), {
    maxOrderAmount: 10000,
    dailySpendLimit: 50000,
    allowedCategories: ["Electronics", "Fashion", "Home & Kitchen", "Groceries"],
    approvalThreshold: 5000,
    maxDiscountPercent: 15,
    updatedAt: new Date().toISOString()
  });

  // 3. Catalog (8-10 products)
  const products = [
    { id: "prod_1", name: "Wireless Bluetooth Earbuds", price: 1499, category: "Electronics", stock: 50, imageUrl: "https://example.com/earbuds.jpg" },
    { id: "prod_2", name: "Smart Fitness Watch", price: 2999, category: "Electronics", stock: 30, imageUrl: "https://example.com/watch.jpg" },
    { id: "prod_3", name: "Cotton Casual Shirt", price: 899, category: "Fashion", stock: 100, imageUrl: "https://example.com/shirt.jpg" },
    { id: "prod_4", name: "Running Shoes", price: 2499, category: "Fashion", stock: 40, imageUrl: "https://example.com/shoes.jpg" },
    { id: "prod_5", name: "Non-Stick Cookware Set", price: 3499, category: "Home & Kitchen", stock: 25, imageUrl: "https://example.com/cookware.jpg" },
    { id: "prod_6", name: "Electric Kettle", price: 1299, category: "Home & Kitchen", stock: 60, imageUrl: "https://example.com/kettle.jpg" },
    { id: "prod_7", name: "Premium Basmati Rice 5kg", price: 650, category: "Groceries", stock: 200, imageUrl: "https://example.com/rice.jpg" },
    { id: "prod_8", name: "Olive Oil 1L", price: 850, category: "Groceries", stock: 150, imageUrl: "https://example.com/oil.jpg" },
    { id: "prod_9", name: "Noise Cancelling Headphones", price: 7999, category: "Electronics", stock: 15, imageUrl: "https://example.com/headphones.jpg" },
    { id: "prod_10", name: "Formal Leather Belt", price: 499, category: "Fashion", stock: 80, imageUrl: "https://example.com/belt.jpg" }
  ];

  console.log("Seeding catalog...");
  const batch = writeBatch(db);
  for (const prod of products) {
    const { id, ...data } = prod;
    const prodRef = doc(db, `merchants/${merchantId}/catalog`, id);
    batch.set(prodRef, data);
  }
  await batch.commit();

  console.log("Seeding completed successfully.");
  process.exit(0);
};

seedData().catch(console.error);
