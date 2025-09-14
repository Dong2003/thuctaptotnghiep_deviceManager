// firebaseAdmin.js
import admin from "firebase-admin";
import serviceAccount from "./3sss.json" assert { type: "json" };

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();

export { admin, auth, db };
