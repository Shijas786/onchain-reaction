console.log("Starting script...");

try {
    const dotenv = require("dotenv");
    console.log("Dotenv required.");

    const result = dotenv.config({ path: ".env.local" });
    console.log("Dotenv config called.");

    if (result.error) {
        console.error("Dotenv error:", result.error);
    } else {
        console.log("Dotenv loaded successfully.");
    }

    const rpc = process.env.RPC_URL_BASE;
    console.log("RPC_URL_BASE:", rpc ? "Set" : "Not Set");

} catch (e: any) {
    console.error("Error loading dotenv:", e.message);
}
