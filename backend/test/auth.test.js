import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app.js";
import { User } from "../src/models/User.js";
import { setAuth0VerifierForTests } from "../src/utils/auth.js";

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

test("first-time password signup creates a user in db", async () => {
  const response = await request(createApp())
    .post("/api/auth/register")
    .send({
      name: "New User",
      usernameOrEmail: "new.user@example.com",
      password: "secret123",
      preferredLanguage: "hi"
    })
    .expect(201);

  assert.ok(response.body.token);
  assert.equal(response.body.user.usernameOrEmail, "new.user@example.com");

  const savedUser = await User.findOne({ usernameOrEmail: "new.user@example.com" }).lean();
  assert.ok(savedUser);
  assert.equal(savedUser.name, "New User");
  assert.equal(savedUser.preferredLanguage, "hi");
  assert.equal(savedUser.xp, 0);
  assert.equal(savedUser.streak, 0);
  assert.ok(savedUser.passwordHash);
});

test("duplicate password signup does not create another user", async () => {
  await request(createApp())
    .post("/api/auth/register")
    .send({
      name: "New User",
      usernameOrEmail: "duplicate@example.com",
      password: "secret123",
      preferredLanguage: "en"
    })
    .expect(201);

  await request(createApp())
    .post("/api/auth/register")
    .send({
      name: "Second User",
      usernameOrEmail: "duplicate@example.com",
      password: "secret123",
      preferredLanguage: "en"
    })
    .expect(409);

  assert.equal(await User.countDocuments({ usernameOrEmail: "duplicate@example.com" }), 1);
});

test("first-time Auth0 login creates a user in db", async () => {
  setAuth0VerifierForTests(async () => ({
    sub: "auth0|new-user",
    email: "auth0.user@example.com",
    name: "Auth0 User"
  }));

  const response = await request(createApp())
    .post("/api/auth/auth0")
    .send({
      idToken: "test-id-token",
      preferredLanguage: "en"
    })
    .expect(200);

  assert.ok(response.body.token);
  assert.equal(response.body.user.usernameOrEmail, "auth0.user@example.com");

  const savedUser = await User.findOne({ auth0Sub: "auth0|new-user" }).lean();
  assert.ok(savedUser);
  assert.equal(savedUser.name, "Auth0 User");
  assert.equal(savedUser.usernameOrEmail, "auth0.user@example.com");
  assert.equal(savedUser.preferredLanguage, "en");
  assert.equal(savedUser.passwordHash, undefined);
});
