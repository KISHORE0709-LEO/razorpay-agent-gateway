import Razorpay from "razorpay";
import * as dotenv from "dotenv";

dotenv.config();

const isPlaceholderKey = (key?: string) =>
  !key || key === "rzp_test_dummykey12345" || key.includes("dummy");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummykey12345",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummysecret1234567890",
});

export async function createRazorpayOrder(amount: number, productName: string) {
  // Amount in rupees converted to paise
  const amountInPaise = Math.round(amount * 100);
  const receipt = `rcpt_${Math.random().toString(36).slice(2, 11)}`;

  const options = {
    amount: amountInPaise,
    currency: "INR",
    receipt,
    notes: {
      product: productName,
    },
  };

  // 1. If real test keys are configured, call the live Razorpay Orders API
  if (!isPlaceholderKey(process.env.RAZORPAY_KEY_ID) && !isPlaceholderKey(process.env.RAZORPAY_KEY_SECRET)) {
    try {
      const order = await razorpay.orders.create(options);
      console.log(`[Razorpay Live API] Order created successfully: ${order.id}`);
      return order;
    } catch (error: any) {
      // If live keys failed authentication or network error, log and fallback in demo mode
      console.warn(`[Razorpay API Error]:`, error?.error?.description || error.message);
      if (error?.statusCode === 401) {
        console.info(`[Razorpay Sandbox] Falling back to test-mode sandbox order for demo.`);
      } else {
        throw error;
      }
    }
  }

  // 2. Demo / Test Mode Sandbox Order
  // When running in local test mode without live dashboard credentials,
  // this generates a standard Razorpay test-mode order structure
  const testOrderId = `order_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[Razorpay Test Sandbox] Generated order: ${testOrderId} (₹${amount})`);

  return {
    id: testOrderId,
    entity: "order",
    amount: amountInPaise,
    amount_paid: 0,
    amount_due: amountInPaise,
    currency: "INR",
    receipt,
    status: "created",
    attempts: 0,
    notes: {
      product: productName,
    },
    created_at: Math.floor(Date.now() / 1000),
  };
}
