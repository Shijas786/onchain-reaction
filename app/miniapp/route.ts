export async function GET() {
    const html = `
    <html>
      <body>
        <h1>OnchainReaction Mini App</h1>
        <p>Tap to enter.</p>
      </body>
    </html>
  `;

    return new Response(html, {
        headers: {
            "Farcaster-Miniapp": "v1",
            "Content-Type": "text/html"
        }
    });
}
