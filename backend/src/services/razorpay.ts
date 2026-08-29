import Razorpay from "razorpay";
import * as dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey12345",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummysecret1234567890",
});

export async function createRazorpayOrder(amount: number, productName: string) {
  // Amount in rupees should be converted to paise
  const amountInPaise = Math.round(amount * 100);

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt: `receipt_${Math.random().toString(36).slice(2, 11)}`,
    notes: {
      product: productName,
    },
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
}
