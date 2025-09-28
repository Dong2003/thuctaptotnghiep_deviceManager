import { auth, db } from "./firebaseAdmin.js";

async function createFirstAdmin() {
  try {
    const user = await auth.createUser({
      email: "admin@gmail.com",
      password: "123456",
      displayName: "Super Admin Anh",
    });

    console.log("✅ User created:", user.uid);

    await auth.setCustomUserClaims(user.uid, { role: "center" });

    await db.collection("users").doc(user.uid).set({
      email: user.email,
      displayName: user.displayName,
      role: "center",
      createdAt: new Date(),
    });

    console.log("✅ Admin account created successfully!");
  } catch (error) {
    console.error("❌ Error creating admin:", error);
  }
}

createFirstAdmin();
