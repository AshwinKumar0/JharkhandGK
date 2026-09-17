import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";

const port = process.env.PORT || 4000;

await connectDatabase(process.env.MONGODB_URI);

createApp().listen(port, () => {
  console.log(`Jharkhand GK backend running on http://localhost:${port}`);
});
