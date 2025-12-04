import express from "express";
import cors from "cors";
import finishHandler from "./api/finish.js";
import { runExpirationCheck } from "./expiration.js";
import { runHealthCheck } from "./healthCheck.js";

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

// Manual health check endpoint
app.get("/health-check", async (req, res) => {
    try {
        const unhealthy = await runHealthCheck();
        res.json({
            healthy: unhealthy.length === 0,
            issues: unhealthy
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manual expiration check endpoint
app.get("/expiration-check", async (req, res) => {
    try {
        const expired = await runExpirationCheck();
        res.json({
            expiredCount: expired.length,
            expired
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start background jobs
function startBackgroundJobs() {
    // Run health check every 5 minutes
    setInterval(async () => {
        try {
            console.log('\n' + '='.repeat(80));
            console.log('🔍 Running scheduled health check...');
            await runHealthCheck();
        } catch (error) {
            console.error('[Background] Health check failed:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes

    // Run expiration check every 5 minutes (offset by 2.5 min)
    setTimeout(() => {
        setInterval(async () => {
            try {
                console.log('\n' + '='.repeat(80));
                console.log('⏰ Running scheduled expiration check...');
                const expired = await runExpirationCheck();

                // TODO: Auto-cancel expired matches
                if (expired.length > 0) {
                    console.log('⚠️  Found expired matches - manual cancellation required');
                    console.log('   Run: npx tsx scripts/emergencyCancel.ts');
                }
            } catch (error) {
                console.error('[Background] Expiration check failed:', error);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }, 2.5 * 60 * 1000); // Start after 2.5 minutes

    console.log('✅ Background jobs started:');
    console.log('   - Health check: Every 5 minutes');
    console.log('   - Expiration check: Every 5 minutes (offset)');
}

app.listen(PORT, () => {
    console.log(`✅ Oracle backend running on port ${PORT}`);
    console.log(`📡 Listening for /finish requests from frontend`);
    console.log(`🎯 No polling - frontend triggers finalization directly`);

    // Start background monitoring
    startBackgroundJobs();

    // Run initial checks after 30 seconds
    setTimeout(() => {
        console.log('\n🔍 Running initial health check...');
        runHealthCheck().catch(console.error);

        setTimeout(() => {
            console.log('\n⏰ Running initial expiration check...');
            runExpirationCheck().catch(console.error);
        }, 10000);
    }, 30000);
});
