import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";

let auth0Jwks;
let auth0VerifierForTests;

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), preferredLanguage: user.preferredLanguage },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export async function verifyAuth0IdToken(idToken) {
  if (auth0VerifierForTests) {
    return auth0VerifierForTests(idToken);
  }

  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;

  if (!domain || !clientId) {
    const error = new Error("Auth0 is not configured");
    error.status = 500;
    throw error;
  }

  const issuer = `https://${domain}/`;
  auth0Jwks ||= createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`));

  const { payload } = await jwtVerify(idToken, auth0Jwks, {
    issuer,
    audience: clientId
  });

  return payload;
}

export function setAuth0VerifierForTests(verifier) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Auth0 test verifier can only be set in test");
  }
  auth0VerifierForTests = verifier;
}
