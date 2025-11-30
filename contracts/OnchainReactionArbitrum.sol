// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Arbitrum Network Contract
contract OnchainReaction is Ownable {
    using SafeERC20 for IERC20;

    mapping(address => bool) public allowedTokens;

    enum MatchStatus {
        Pending,
        Live,
        Finished,
        PaidOut,
        Cancelled
    }

    struct Match {
        address host;
        address token;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 prizePool;
        MatchStatus status;
        address winner;
        uint256 createdAt;
        uint256 expiresAt;
    }

    uint256 public nextMatchId = 1;

    mapping(uint256 => Match) public matches;
    mapping(uint256 => address[]) public matchPlayers;
    mapping(uint256 => mapping(address => bool)) public isPlayerInMatch;
    mapping(uint256 => bool) public claimed;

    bool internal locked;
    modifier noReentrant() {
        require(!locked, "Reentrancy");
        locked = true;
        _;
        locked = false;
    }

    address public oracle;
    uint256 public feeBps = 50;
    address public feeRecipient;
    uint256 public accumulatedFees;

    event MatchCreated(uint256 indexed matchId, address indexed host);
    event PlayerJoined(uint256 indexed matchId, address indexed player);
    event PlayerLeft(uint256 indexed matchId, address indexed player);
    event MatchStarted(uint256 indexed matchId);
    event MatchFinished(uint256 indexed matchId, address winner);
    event PrizeClaimed(uint256 indexed matchId, uint256 amount);

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;

        // FIXED CHECKSUM ✔
        allowedTokens[
            0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        ] = true; // Arbitrum USDC
    }

    // === MATCH CREATION ===
    function createMatch(
        address token,
        uint256 entryFee,
        uint256 maxPlayers
    ) external noReentrant returns (uint256 id) {
        require(allowedTokens[token], "Token not allowed");
        require(entryFee > 0, "Entry must > 0");
        require(maxPlayers >= 2 && maxPlayers <= 8, "Players 2-8");

        id = nextMatchId++;

        IERC20(token).safeTransferFrom(msg.sender, address(this), entryFee);

        Match storage m = matches[id];
        m.host = msg.sender;
        m.token = token;
        m.entryFee = entryFee;
        m.maxPlayers = maxPlayers;
        m.prizePool = entryFee;
        m.status = MatchStatus.Pending;
        m.createdAt = block.timestamp;
        m.expiresAt = block.timestamp + 15 minutes;

        matchPlayers[id].push(msg.sender);
        isPlayerInMatch[id][msg.sender] = true;

        emit MatchCreated(id, msg.sender);
    }

    // === JOIN / LEAVE ===
    function joinMatch(uint256 id) external noReentrant {
        Match storage m = matches[id];
        require(m.status == MatchStatus.Pending, "Not pending");
        require(block.timestamp < m.expiresAt, "Expired");
        require(matchPlayers[id].length < m.maxPlayers, "Full");
        require(!isPlayerInMatch[id][msg.sender], "Already in");

        IERC20(m.token).safeTransferFrom(msg.sender, address(this), m.entryFee);

        matchPlayers[id].push(msg.sender);
        isPlayerInMatch[id][msg.sender] = true;
        m.prizePool += m.entryFee;

        emit PlayerJoined(id, msg.sender);
    }

    function leaveMatch(uint256 id) external noReentrant {
        Match storage m = matches[id];
        require(m.status == MatchStatus.Pending, "Already live");
        require(isPlayerInMatch[id][msg.sender], "Not in match");
        require(msg.sender != m.host, "Host cannot leave");

        IERC20(m.token).safeTransfer(msg.sender, m.entryFee);

        isPlayerInMatch[id][msg.sender] = false;

        address[] storage arr = matchPlayers[id];
        for (uint256 i; i < arr.length; i++) {
            if (arr[i] == msg.sender) {
                arr[i] = arr[arr.length - 1];
                arr.pop();
                break;
            }
        }

        emit PlayerLeft(id, msg.sender);
    }

    // === START / FINISH ===
    function startMatch(uint256 id) external {
        Match storage m = matches[id];
        require(msg.sender == m.host, "Not host");
        require(m.status == MatchStatus.Pending, "Already started");
        require(matchPlayers[id].length >= 2, "Need 2 players");

        m.status = MatchStatus.Live;

        emit MatchStarted(id);
    }

    function finishMatch(uint256 id, address winner) external {
        Match storage m = matches[id];
        require(msg.sender == oracle || msg.sender == owner(), "Not oracle");
        require(m.status == MatchStatus.Live, "Not live");
        require(isPlayerInMatch[id][winner], "Winner not player");

        m.status = MatchStatus.Finished;
        m.winner = winner;

        emit MatchFinished(id, winner);
    }

    // === CLAIM PRIZE ===
    function claimPrize(uint256 id) external noReentrant {
        Match storage m = matches[id];
        require(m.status == MatchStatus.Finished, "Not finished");
        require(m.winner == msg.sender, "Not winner");
        require(!claimed[id], "Claimed");

        claimed[id] = true;
        m.status = MatchStatus.PaidOut;

        uint256 fee = (m.prizePool * feeBps) / 10000;
        uint256 prize = m.prizePool - fee;

        accumulatedFees += fee;

        IERC20(m.token).safeTransfer(msg.sender, prize);

        emit PrizeClaimed(id, prize);
    }

    // === ADMIN ===
    function setOracle(address o) external onlyOwner {
        oracle = o;
    }

    function setFee(uint256 bps) external onlyOwner {
        require(bps <= 300, "Max 3%");
        feeBps = bps;
    }

    function withdrawFees() external {
        require(msg.sender == feeRecipient, "Not recipient");

        uint256 amt = accumulatedFees;
        accumulatedFees = 0;

        IERC20(
            0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        ).safeTransfer(feeRecipient, amt);
    }
}

