export async function GET() {
    return new Response(
        `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Onchain Reaction</title>
        <meta charset="utf-8"/>
        <meta http-equiv="refresh" content="0; url=/miniapp/app" />
      </head>
      <body>Loading Mini App…</body>
    </html>
    `,
        {
            headers: {
                "Farcaster-Miniapp": "v1",
                "Content-Type": "text/html",
            }
        }
    );
}
