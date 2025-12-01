import { finishMatch } from "../oracle.js";

async function handler(req, res) {
    const { id, winner } = req.body;

    if (!id || !winner) {
        return res.status(400).json({ error: "Missing id or winner" });
    }

    try {
        const result = await finishMatch(id, winner);
        res.json({ ok: true, result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}

export default handler;
