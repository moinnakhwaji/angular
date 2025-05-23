import { NextRequest, NextResponse } from "next/server";
import admin from "@/firebase/firebaseAdmin";

// Helper: Add CORS headers
function withCors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "http://localhost:4200"); // Adjust for production
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

// Handle preflight requests (OPTIONS)
export async function OPTIONS(req: NextRequest) {
  console.log("OPTIONS request received");
  const response = new NextResponse(null, { status: 200 });
  return withCors(response);
}

// GET: Fetch todos by user email
export async function GET(req: NextRequest) {
  console.log("GET request received");

  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    const errorResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return withCors(errorResponse);
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = decodedToken.email;

    const snapshot = await admin.firestore()
      .collection("todos")
      .where("email", "==", userEmail)
      // .orderBy("createdAt", "desc") // Enable after creating composite index
      .get();

    // @ts-ignore
    const todos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const response = NextResponse.json(todos);
    return withCors(response);
  } catch (err) {
    console.error("GET Error:", err);
    const errorResponse = NextResponse.json({ error: "Internal error" }, { status: 500 });
    return withCors(errorResponse);
  }
}

// POST: Add a new todo with user email
export async function POST(req: NextRequest) {
  console.log("POST request received");

  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    const errorResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return withCors(errorResponse);
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userEmail = decodedToken.email;
    const userId = decodedToken.uid;

    const body = await req.json();
    const { title, description, priority, status } = body;

    const newTask = {
      title,
      description,
      priority,
      status,
      userId,
      email: userEmail, // Include email in Firestore doc
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await admin.firestore().collection("todos").add(newTask);

    const response = NextResponse.json({ id: docRef.id, ...newTask });
    return withCors(response);
  } catch (err) {
    console.error("POST Error:", err);
    const errorResponse = NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    return withCors(errorResponse);
  }
}
