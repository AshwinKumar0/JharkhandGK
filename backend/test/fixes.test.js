import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { setAuth0VerifierForTests, signToken } from "../src/utils/auth.js";

let mongo;

test.before(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test.afterEach(async () => {
  setAuth0VerifierForTests(undefined);
  await User.deleteMany({});
});

test("rate limiter keys on the client IP behind a proxy, not the proxy IP", async () => {
  const app = createApp();
  assert.equal(app.get("trust proxy"), 1);
  const response = await request(app).get("/health").set("X-Forwarded-For", "203.0.113.9");
  assert.equal(response.status, 200);
});

test("Auth0 login does not link to an existing account on an unverified email", async () => {
  await User.create({ name: "Victim", usernameOrEmail: "victim@example.com", passwordHash: await bcrypt.hash("secret123", 4) });
  setAuth0VerifierForTests(async () => ({ sub: "auth0|attacker", email: "victim@example.com", email_verified: false }));
  await request(createApp()).post("/api/auth/auth0").send({ idToken: "x" }).expect(409);
  const victim = await User.findOne({ usernameOrEmail: "victim@example.com" }).lean();
  assert.equal(victim.auth0Sub, undefined);
});

test("Auth0 login links to an existing account when the email is verified", async () => {
  await User.create({ name: "Owner", usernameOrEmail: "owner@example.com", passwordHash: await bcrypt.hash("secret123", 4) });
  setAuth0VerifierForTests(async () => ({ sub: "auth0|owner", email: "owner@example.com", email_verified: true }));
  await request(createApp()).post("/api/auth/auth0").send({ idToken: "x" }).expect(200);
  const owner = await User.findOne({ usernameOrEmail: "owner@example.com" }).lean();
  assert.equal(owner.auth0Sub, "auth0|owner");
});

test("invalid report reason returns 400, not 500", async () => {
  const user = await User.create({ name: "R", usernameOrEmail: "r@example.com" });
  await mongoose.connection.collection(process.env.QUESTION_COLLECTION || "questions").insertOne({
    _id: "bank:q1", bankId: "bank", questionId: "q1", sourceQuestionNumber: 1
  });
  const res = await request(createApp())
    .post("/api/reports")
    .set("Authorization", `Bearer ${signToken(user)}`)
    .send({ questionRef: "bank:q1", reason: "Not a reason" });
  assert.equal(res.status, 400);
});

test("practice/end with a malformed session id returns 400, not 500", async () => {
  const user = await User.create({ name: "E", usernameOrEmail: "e@example.com" });
  const res = await request(createApp())
    .post("/api/practice/end")
    .set("Authorization", `Bearer ${signToken(user)}`)
    .send({ sessionId: "not-an-id" });
  assert.equal(res.status, 400);
});

test("learning questions include the answer key for study mode", async () => {
  const user = await User.create({ name: "L", usernameOrEmail: "l@example.com" });
  await mongoose.connection.collection(process.env.QUESTION_COLLECTION || "questions").insertOne({
    _id: "bank:q2", bankId: "bank", questionId: "q2", sourceQuestionNumber: 2,
    question: { en: "Capital?", hi: null }, options: [{ key: "A", text: { en: "Ranchi" } }], correctOptionKey: "A"
  });
  const res = await request(createApp())
    .get("/api/learning/questions?bankId=bank&start=1&end=5")
    .set("Authorization", `Bearer ${signToken(user)}`)
    .expect(200);
  const q2 = res.body.questions.find((q) => q.questionId === "q2");
  assert.equal(q2.correctOptionKey, "A");
});
