import { finishMatch } from "../oracle.js";

async function handler(req, res) {
    console.log("REQ BODY:", req.body);

    const { id, winner } = req.body;

    if (!id || !winner) {
        console.log("Missing fields");
        return res.status(400).json({ error: "Missing id or winner" });
    }

    try {
        console.log("Calling finishMatch:", id, winner);

        // Note: finishMatch in oracle.js handles the transaction and waiting
        const result = await finishMatch(id, winner);

        console.log("FINISHED MATCH", id);
        console.log("TX:", result.txHash);

        return res.json({ ok: true, tx: result.txHash });
    } catch (err) {
        console.log("FINISH ERROR:", err);
        return res.status(500).json({ error: err.toString() });
    }
}

export default handler;
