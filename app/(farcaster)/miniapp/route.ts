export async function GET() {
    return new Response(
        `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Onchain Reaction</title>
      </head>
      <body>Loading Mini App…</body>
    </html>
    `,
        {
            headers: {
                "Farcaster-Miniapp": "v1",
                "Content-Type": "text/html",
            },
        }
    );
}
