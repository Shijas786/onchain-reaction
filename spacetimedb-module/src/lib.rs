use spacetimedb::{ReducerContext, Table, Identity, Timestamp};
use serde::{Deserialize, Serialize};

// ============================================================================
// BOARD SIZE CONFIGURATION
// ============================================================================

/// Get board size based on number of players
fn get_board_size(max_players: u32) -> (usize, usize) {
    match max_players {
        2 => (9, 6),      // Classic setup
        3 | 4 => (12, 10), // More space for 3-4 players
        5 => (15, 15),    // Maximum size for 5 players (max allowed)
        _ => {
            // Fallback logic
            if max_players <= 2 {
                (9, 6)
            } else if max_players <= 4 {
                (12, 10)
            } else {
                // 5 players (max)
                (15, 15)
            }
        }
    }
}

// ============================================================================
// TABLES
// ============================================================================

/// Lobby - Represents a match room
#[spacetimedb::table(name = lobby, public)]
pub struct Lobby {
    #[primary_key]
    pub id: String,
    pub chain_id: u32,           // 8453 (Base) or 42161 (Arbitrum)
    pub match_id: u64,           // On-chain match ID
    pub arena_address: String,   // ChainOrbArena contract address
    pub host_identity: Identity,
    pub host_address: String,    // Wallet address
    pub entry_fee: String,       // In USDC wei units
    pub max_players: u32,
    pub status: String,          // "waiting" | "live" | "finished" | "cancelled"
    pub winner_identity: Option<Identity>,
    pub winner_address: Option<String>,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
}

/// LobbyPlayer - Players in a lobby
#[spacetimedb::table(name = lobby_player, public)]
pub struct LobbyPlayer {
    #[primary_key]
    pub id: String,              // lobbyId + "_" + identity hex
    #[index(btree)]
    pub lobby_id: String,
    pub identity: Identity,
    pub address: String,         // Wallet address
    pub name: String,
    pub color: String,           // "red" | "blue" | "green" | "yellow" | etc.
    pub is_host: bool,
    pub is_alive: bool,
    pub has_deposited: bool,
    pub joined_at: Timestamp,
}

/// GameState - Current board state for a lobby
#[spacetimedb::table(name = game_state, public)]
pub struct GameState {
    #[primary_key]
    pub lobby_id: String,
    pub board_json: String,       // JSON serialized board
    pub rows: u32,                // Board height
    pub cols: u32,                // Board width
    pub current_player_index: u32,
    pub is_animating: bool,
    pub move_count: u32,
    pub last_move_at: Timestamp,
    pub turn_deadline: Timestamp, // When the current turn expires
}

/// GameMove - Individual moves for replay/verification
#[spacetimedb::table(name = game_move, public)]
pub struct GameMove {
    #[primary_key]
    pub id: String,               // lobbyId + "_" + moveIndex
    #[index(btree)]
    pub lobby_id: String,
    pub move_index: u32,
    pub player_identity: Identity,
    pub row: u32,
    pub col: u32,
    pub timestamp: Timestamp,
}

// ============================================================================
// BOARD TYPES
// ============================================================================

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Cell {
    pub orbs: u32,
    pub owner: Option<String>,
}

type Board = Vec<Vec<Cell>>;

fn create_empty_board(rows: usize, cols: usize) -> Board {
    (0..rows)
        .map(|_| (0..cols).map(|_| Cell::default()).collect())
        .collect()
}

fn get_max_capacity(row: usize, col: usize, rows: usize, cols: usize) -> u32 {
    let is_corner = (row == 0 || row == rows - 1) && (col == 0 || col == cols - 1);
    let is_edge = row == 0 || row == rows - 1 || col == 0 || col == cols - 1;

    if is_corner { 2 } else if is_edge { 3 } else { 4 }
}

// Player colors
const PLAYER_COLORS: [&str; 8] = ["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let time = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{:x}", time)
}

// ============================================================================
// LIFECYCLE REDUCERS
// ============================================================================

#[spacetimedb::reducer(init)]
pub fn init(_ctx: &ReducerContext) {
    log::info!("Chain Reaction module initialized!");
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {
    log::info!("Client connected: {:?}", ctx.sender);
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    log::info!("Client disconnected: {:?}", ctx.sender);
}

// ============================================================================
// GAME REDUCERS
// ============================================================================

/// Create a new lobby
#[spacetimedb::reducer]
pub fn create_lobby(
    ctx: &ReducerContext,
    chain_id: u32,
    match_id: u64,
    arena_address: String,
    host_address: String,
    entry_fee: String,
    max_players: u32,
    host_name: String,
    lobby_id: String,
) {
    let now = ctx.timestamp;

    // Create lobby
    ctx.db.lobby().insert(Lobby {
        id: lobby_id.clone(),
        chain_id,
        match_id,
        arena_address,
        host_identity: ctx.sender,
        host_address: host_address.clone(),
        entry_fee,
        max_players,
        status: "waiting".to_string(),
        winner_identity: None,
        winner_address: None,
        created_at: now,
        updated_at: now,
    });

    // Add host as first player
    let player_id = format!("{}_{:?}", lobby_id, ctx.sender);
    ctx.db.lobby_player().insert(LobbyPlayer {
        id: player_id,
        lobby_id: lobby_id.clone(),
        identity: ctx.sender,
        address: host_address,
        name: host_name,
        color: PLAYER_COLORS[0].to_string(),
        is_host: true,
        is_alive: true,
        has_deposited: true, // Host pays on creation
        joined_at: now,
    });

    // Calculate board size based on max players
    let (rows, cols) = get_board_size(max_players);
    let board = create_empty_board(rows, cols);
    
    // Create empty game state with board dimensions
    ctx.db.game_state().insert(GameState {
        lobby_id: lobby_id.clone(),
        board_json: serde_json::to_string(&board).unwrap(),
        rows: rows as u32,
        cols: cols as u32,
        current_player_index: 0,
        is_animating: false,
        move_count: 0,
        last_move_at: now,
        turn_deadline: now, // Will be set correctly on start_game
    });

    log::info!("Lobby created: {} by {:?}", lobby_id, ctx.sender);
}

/// Join an existing lobby
#[spacetimedb::reducer]
pub fn join_lobby(
    ctx: &ReducerContext,
    lobby_id: String,
    player_address: String,
    player_name: String,
) {
    // Get lobby
    let lobby = ctx.db.lobby().id().find(&lobby_id)
        .expect("Lobby not found");

    if lobby.status != "waiting" {
        panic!("Lobby is not accepting players");
    }

    // Check if already joined
    let player_id = format!("{}_{:?}", lobby_id, ctx.sender);
    if ctx.db.lobby_player().id().find(&player_id).is_some() {
        panic!("Already joined this lobby");
    }

    // Get current players
    let players: Vec<_> = ctx.db.lobby_player()
        .lobby_id()
        .filter(&lobby_id)
        .collect();

    if players.len() >= lobby.max_players as usize {
        panic!("Lobby is full");
    }

    // Assign color
    let used_colors: std::collections::HashSet<String> = players.iter().map(|p| p.color.clone()).collect();
    let available_color = PLAYER_COLORS.iter()
        .find(|c| !used_colors.contains(&c.to_string()))
        .unwrap_or(&PLAYER_COLORS[0]);

    // Add player
    ctx.db.lobby_player().insert(LobbyPlayer {
        id: player_id,
        lobby_id: lobby_id.clone(),
        identity: ctx.sender,
        address: player_address,
        name: player_name,
        color: available_color.to_string(),
        is_host: false,
        is_alive: true,
        has_deposited: false,
        joined_at: ctx.timestamp,
    });

    // Update lobby timestamp
    ctx.db.lobby().id().update(Lobby {
        updated_at: ctx.timestamp,
        ..lobby
    });

    log::info!("Player {:?} joined lobby {}", ctx.sender, lobby_id);
}

/// Mark player as having deposited USDC on-chain
#[spacetimedb::reducer]
pub fn confirm_deposit(
    ctx: &ReducerContext,
    lobby_id: String,
    player_address: String,
) {
    // Find player by address in this lobby
    let player = ctx.db.lobby_player()
        .lobby_id()
        .filter(&lobby_id)
        .find(|p| p.address.to_lowercase() == player_address.to_lowercase())
        .expect("Player not found in lobby");

    ctx.db.lobby_player().id().update(LobbyPlayer {
        has_deposited: true,
        ..player
    });

    log::info!("Deposit confirmed for {} in lobby {}", player_address, lobby_id);
}

/// Start the game (host only)
#[spacetimedb::reducer]
pub fn start_game(ctx: &ReducerContext, lobby_id: String) {
    let lobby = ctx.db.lobby().id().find(&lobby_id)
        .expect("Lobby not found");

    if lobby.host_identity != ctx.sender {
        panic!("Only host can start the game");
    }
    if lobby.status != "waiting" {
        panic!("Game already started");
    }

    let players: Vec<_> = ctx.db.lobby_player()
        .lobby_id()
        .filter(&lobby_id)
        .collect();

    if players.len() < 2 {
        panic!("Need at least 2 players to start");
    }

    // Check all players have deposited
    if !players.iter().all(|p| p.has_deposited) {
        panic!("Not all players have deposited USDC");
    }

    // Update lobby status
    ctx.db.lobby().id().update(Lobby {
        status: "live".to_string(),
        updated_at: ctx.timestamp,
        ..lobby
    });

    // Set initial turn deadline (30 seconds)
    // 30 seconds = 30 * 1,000,000 microseconds
    let deadline = ctx.timestamp.plus(std::time::Duration::from_secs(30));
    
    let game_state = ctx.db.game_state().lobby_id().find(&lobby_id).expect("Game state not found");
    ctx.db.game_state().lobby_id().update(GameState {
        turn_deadline: deadline,
        ..game_state
    });

    log::info!("Game started in lobby {}", lobby_id);
}

/// Make a move (place orb)
#[spacetimedb::reducer]
pub fn make_move(
    ctx: &ReducerContext,
    lobby_id: String,
    row: u32,
    col: u32,
) {
    // Validate lobby
    let lobby = ctx.db.lobby().id().find(&lobby_id)
        .expect("Lobby not found");

    if lobby.status != "live" {
        panic!("Game is not live");
    }

    // Get game state
    let game_state = ctx.db.game_state().lobby_id().find(&lobby_id)
        .expect("Game state not found");

    if game_state.is_animating {
        panic!("Wait for animation to finish");
    }

    // Get alive players sorted by join time
    let mut players: Vec<_> = ctx.db.lobby_player()
        .lobby_id()
        .filter(&lobby_id)
        .filter(|p| p.is_alive)
        .collect();
    players.sort_by_key(|p| p.joined_at);

    if players.is_empty() {
        panic!("No active players");
    }

    // Check if it's this player's turn
    let current_idx = game_state.current_player_index as usize % players.len();
    let current_player = &players[current_idx];
    if current_player.identity != ctx.sender {
        panic!("Not your turn");
    }

    // Parse board
    let mut board: Board = serde_json::from_str(&game_state.board_json).unwrap();

    // Get board dimensions from game state
    let rows = game_state.rows as usize;
    let cols = game_state.cols as usize;
    
    // Validate move
    let r = row as usize;
    let c = col as usize;
    if r >= rows || c >= cols {
        panic!("Invalid position");
    }

    let cell = &board[r][c];
    if cell.owner.is_some() && cell.owner.as_ref() != Some(&current_player.color) {
        panic!("Cell owned by another player");
    }

    // Place orb
    board[r][c].orbs += 1;
    board[r][c].owner = Some(current_player.color.clone());

    // Process chain reactions
    loop {
        let mut had_explosion = false;

        for row_idx in 0..rows {
            for col_idx in 0..cols {
                let max_cap = get_max_capacity(row_idx, col_idx, rows, cols);
                if board[row_idx][col_idx].orbs >= max_cap {
                    had_explosion = true;

                    let exploding_owner = board[row_idx][col_idx].owner.clone();
                    board[row_idx][col_idx].orbs = 0;
                    board[row_idx][col_idx].owner = None;

                    // Spread to neighbors
                    let neighbors: [(i32, i32); 4] = [(-1, 0), (1, 0), (0, -1), (0, 1)];
                    for (dr, dc) in neighbors {
                        let nr = row_idx as i32 + dr;
                        let nc = col_idx as i32 + dc;
                        if nr >= 0 && nr < rows as i32 && nc >= 0 && nc < cols as i32 {
                            let nr = nr as usize;
                            let nc = nc as usize;
                            board[nr][nc].orbs += 1;
                            board[nr][nc].owner = exploding_owner.clone();
                        }
                    }
                }
            }
        }

        if !had_explosion {
            break;
        }
    }

    // Count orbs per player
    let mut player_orb_counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    for player in &players {
        player_orb_counts.insert(player.color.clone(), 0);
    }

    for row in &board {
        for cell in row {
            if let Some(ref owner) = cell.owner {
                *player_orb_counts.entry(owner.clone()).or_insert(0) += cell.orbs;
            }
        }
    }

    // Check eliminations (only after first round)
    if game_state.move_count >= players.len() as u32 {
        for player in &players {
            if *player_orb_counts.get(&player.color).unwrap_or(&0) == 0 && player.is_alive {
                ctx.db.lobby_player().id().update(LobbyPlayer {
                    id: player.id.clone(),
                    lobby_id: player.lobby_id.clone(),
                    identity: player.identity,
                    address: player.address.clone(),
                    name: player.name.clone(),
                    color: player.color.clone(),
                    is_host: player.is_host,
                    is_alive: false,
                    has_deposited: player.has_deposited,
                    joined_at: player.joined_at,
                });
                log::info!("Player {} eliminated!", player.name);
            }
        }
    }

    // Refresh alive players
    let alive_players: Vec<_> = ctx.db.lobby_player()
        .lobby_id()
        .filter(&lobby_id)
        .filter(|p| p.is_alive)
        .collect();

    let total_orbs: u32 = player_orb_counts.values().sum();

    // Check for winner
    if alive_players.len() == 1 && total_orbs > 0 {
        let winner = &alive_players[0];
        ctx.db.lobby().id().update(Lobby {
            status: "finished".to_string(),
            winner_identity: Some(winner.identity),
            winner_address: Some(winner.address.clone()),
            updated_at: ctx.timestamp,
            ..lobby
        });
        log::info!("Game finished! Winner: {} ({})", winner.name, winner.address);
    }

    // Record move
    let move_id = format!("{}_{}", lobby_id, game_state.move_count);
    ctx.db.game_move().insert(GameMove {
        id: move_id,
        lobby_id: lobby_id.clone(),
        move_index: game_state.move_count,
        player_identity: ctx.sender,
        row,
        col,
        timestamp: ctx.timestamp,
    });

    // Update game state
    let new_player_index = if alive_players.len() > 0 {
        (game_state.current_player_index + 1) % alive_players.len() as u32
    } else {
        0
    };

    // Set new turn deadline (30 seconds from now)
    let new_deadline = ctx.timestamp.plus(std::time::Duration::from_secs(30));

    ctx.db.game_state().lobby_id().update(GameState {
        board_json: serde_json::to_string(&board).unwrap(),
        rows: game_state.rows,
        cols: game_state.cols,
        current_player_index: new_player_index,
        move_count: game_state.move_count + 1,
        last_move_at: ctx.timestamp,
        turn_deadline: new_deadline,
        ..game_state
    });
}

/// Claim timeout for current player
#[spacetimedb::reducer]
pub fn claim_timeout(ctx: &ReducerContext, lobby_id: String) {
    let lobby = ctx.db.lobby().id().find(&lobby_id)
        .expect("Lobby not found");

    if lobby.status != "live" {
        panic!("Game is not live");
    }

    let game_state = ctx.db.game_state().lobby_id().find(&lobby_id)
        .expect("Game state not found");

    // Check if deadline passed
    if ctx.timestamp < game_state.turn_deadline {
        panic!("Turn has not timed out yet");
    }

    // Get alive players sorted by join time
    let mut players: Vec<_> = ctx.db.lobby_player()
        .lobby_id()
        .filter(&lobby_id)
        .filter(|p| p.is_alive)
        .collect();
    players.sort_by_key(|p| p.joined_at);

    if players.is_empty() {
        panic!("No active players");
    }

    // Identify timed out player
    let current_idx = game_state.current_player_index as usize % players.len();
    let timed_out_player = &players[current_idx];

    // Eliminate player
    ctx.db.lobby_player().id().update(LobbyPlayer {
        is_alive: false,
        ..timed_out_player.clone()
    });
    
    log::info!("Player {} timed out!", timed_out_player.name);

    // Refresh alive players
    let alive_players: Vec<_> = ctx.db.lobby_player()
        .lobby_id()
        .filter(&lobby_id)
        .filter(|p| p.is_alive)
        .collect();

    // Check for winner
    if alive_players.len() == 1 {
        let winner = &alive_players[0];
        ctx.db.lobby().id().update(Lobby {
            status: "finished".to_string(),
            winner_identity: Some(winner.identity),
            winner_address: Some(winner.address.clone()),
            updated_at: ctx.timestamp,
            ..lobby
        });
        log::info!("Game finished by timeout! Winner: {} ({})", winner.name, winner.address);
    } else {
        // Advance turn
        let new_player_index = if alive_players.len() > 0 {
            // We don't increment index because the current player was removed, 
            // so the next player falls into the same index (modulo new length)
            // But we need to be careful about the modulo logic.
            // If we had [A, B, C] and B (index 1) timed out. New list [A, C].
            // We want C to play. C is now at index 1. So index stays 1.
            // If C (index 2) timed out. New list [A, B]. We want A to play. Index 0.
            // So we just take current_index % new_length.
            game_state.current_player_index % alive_players.len() as u32
        } else {
            0
        };

        // Set new turn deadline
        let new_deadline = ctx.timestamp.plus(std::time::Duration::from_secs(30));

        ctx.db.game_state().lobby_id().update(GameState {
            current_player_index: new_player_index,
            turn_deadline: new_deadline,
            ..game_state
        });
    }
}

/// Leave lobby (before game starts)
#[spacetimedb::reducer]
pub fn leave_lobby(ctx: &ReducerContext, lobby_id: String) {
    let lobby = ctx.db.lobby().id().find(&lobby_id)
        .expect("Lobby not found");

    if lobby.status != "waiting" {
        panic!("Cannot leave after game started");
    }

    let player_id = format!("{}_{:?}", lobby_id, ctx.sender);
    let player = ctx.db.lobby_player().id().find(&player_id)
        .expect("Not in this lobby");

    if player.is_host {
        // Cancel lobby if host leaves
        ctx.db.lobby().id().update(Lobby {
            status: "cancelled".to_string(),
            updated_at: ctx.timestamp,
            ..lobby
        });

        // Remove all players
        let all_players: Vec<_> = ctx.db.lobby_player()
            .lobby_id()
            .filter(&lobby_id)
            .collect();

        for p in all_players {
            ctx.db.lobby_player().id().delete(&p.id);
        }

        log::info!("Lobby {} cancelled by host", lobby_id);
    } else {
        ctx.db.lobby_player().id().delete(&player_id);

        ctx.db.lobby().id().update(Lobby {
            updated_at: ctx.timestamp,
            ..lobby
        });

        log::info!("Player {:?} left lobby {}", ctx.sender, lobby_id);
    }
}

/// Get all lobbies (for listing)
#[spacetimedb::reducer]
pub fn ping(ctx: &ReducerContext) {
    log::info!("Ping from {:?}", ctx.sender);
}
