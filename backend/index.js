import express from "express";
import cors from "cors";
import finishHandler from "./api/finish.js";
import { startOraclePolling } from "./oracle.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount the handler
app.post("/finish", finishHandler);

app.get("/", (req, res) => {
    res.send("Oracle Backend is running");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Start oracle monitoring
    console.log("Starting oracle monitoring...");
    startOraclePolling();
});
