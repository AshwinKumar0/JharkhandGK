import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";

const port = process.env.PORT || 4000;
const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is required`);
  }
}

await connectDatabase(process.env.MONGODB_URI);

createApp().listen(port, () => {
  console.log(`Jharkhand GK backend running on http://localhost:${port}`);
});
