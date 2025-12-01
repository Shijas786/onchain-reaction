/**
 * Generate a user-friendly room code
 * Format: 4-5 letter code (e.g., "ABCD" or "ABC12")
 */
export function generateRoomCode(): string {
  // Generate a short, memorable code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like 0, O, I, 1
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Validate room code format
 */
export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(code.toUpperCase());
}

/**
 * Format room code for display (add spacing)
 */
export function formatRoomCode(code: string): string {
  return code.toUpperCase().replace(/(.{2})/g, '$1 ').trim();
}



