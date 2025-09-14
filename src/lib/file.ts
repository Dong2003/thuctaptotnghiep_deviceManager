import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credential: cert(require("./serviceAccountKey.json")),
});

const auth = getAuth();
const db = getFirestore();

async function createFirstAdmin() {
  const userRecord = await auth.createUser({
    email: "admin@example.com",
    password: "Admin@123",
    displayName: "Super Admin",
  });

  await db.collection("users").doc(userRecord.uid).set({
    email: userRecord.email,
    role: "admin",
    createdAt: new Date().toISOString(),
  });

  console.log("✅ Admin account created:", userRecord.email);
}

createFirstAdmin();
