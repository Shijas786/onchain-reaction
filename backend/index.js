import express from "express";
import cors from "cors";
import finishHandler from "./api/finish.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
    res.send("Oracle Backend is running");
});

// Finish match endpoint (called by frontend)
app.post("/finish", finishHandler);

app.listen(PORT, () => {
    console.log(`✅ Oracle backend running on port ${PORT}`);
    console.log(`📡 Listening for /finish requests from frontend`);
    console.log(`🎯 No polling - frontend triggers finalization directly`);
});
