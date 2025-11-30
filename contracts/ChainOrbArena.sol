// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ChainOrbArena
 * @notice Escrow contract for Chain Reaction: Orbs Edition matches
 * @dev Manages match creation, player deposits, and prize distribution
 */
contract ChainOrbArena is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    enum MatchStatus {
        Pending,    // 0 - Waiting for players
        Live,       // 1 - Game in progress
        Finished,   // 2 - Game ended, winner determined
        PaidOut,    // 3 - Prize claimed
        Cancelled   // 4 - Match cancelled
    }

    struct Match {
        address host;
        uint256 entryFee;
        uint256 maxPlayers;
        uint256 prizePool;
        MatchStatus status;
        address winner;
    }

    uint256 public nextMatchId = 1;
    
    mapping(uint256 => Match) public matches;
    mapping(uint256 => address[]) public matchPlayers;
    mapping(uint256 => mapping(address => bool)) public isPlayerInMatch;
    mapping(uint256 => bool) public claimed;

    address public gameOracle;
    address public feeRecipient;
    uint256 public constant FEE_BPS = 50; // 0.5% = 50 basis points (out of 10000)
    uint256 public accumulatedFees;

    // Events
    event MatchCreated(
        uint256 indexed matchId,
        address indexed host,
        uint256 entryFee,
        uint256 maxPlayers
    );
    
    event PlayerJoined(
        uint256 indexed matchId,
        address indexed player,
        uint256 amount
    );
    
    event MatchStarted(uint256 indexed matchId);
    
    event MatchFinished(
        uint256 indexed matchId,
        address indexed winner
    );
    
    event MatchCancelled(uint256 indexed matchId);
    
    event PrizeClaimed(
        uint256 indexed matchId,
        address indexed winner,
        uint256 amount
    );
    
    event OracleUpdated(address indexed oracle);

    constructor(address usdcAddress, address _feeRecipient) Ownable(msg.sender) {
        require(usdcAddress != address(0), "Invalid USDC address");
        require(_feeRecipient != address(0), "Invalid fee recipient address");
        usdc = IERC20(usdcAddress);
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Create a new match
     * @param entryFee Entry fee in USDC (6 decimals)
     * @param maxPlayers Maximum number of players (2-5)
     */
    function createMatch(uint256 entryFee, uint256 maxPlayers) external returns (uint256 matchId) {
        require(entryFee > 0, "Entry fee must be > 0");
        require(maxPlayers >= 2 && maxPlayers <= 5, "Max players must be 2-5");

        matchId = nextMatchId++;
        
        // Transfer entry fee from host
        usdc.safeTransferFrom(msg.sender, address(this), entryFee);

        matches[matchId] = Match({
            host: msg.sender,
            entryFee: entryFee,
            maxPlayers: maxPlayers,
            prizePool: entryFee,
            status: MatchStatus.Pending,
            winner: address(0)
        });

        matchPlayers[matchId].push(msg.sender);
        isPlayerInMatch[matchId][msg.sender] = true;

        emit MatchCreated(matchId, msg.sender, entryFee, maxPlayers);
    }

    /**
     * @notice Join an existing match
     * @param matchId The match ID to join
     */
    function joinMatch(uint256 matchId) external {
        Match storage match_ = matches[matchId];
        require(match_.status == MatchStatus.Pending, "Match not accepting players");
        require(matchPlayers[matchId].length < match_.maxPlayers, "Match is full");
        require(!isPlayerInMatch[matchId][msg.sender], "Already in match");

        // Transfer entry fee from player
        usdc.safeTransferFrom(msg.sender, address(this), match_.entryFee);

        match_.prizePool += match_.entryFee;
        matchPlayers[matchId].push(msg.sender);
        isPlayerInMatch[matchId][msg.sender] = true;

        emit PlayerJoined(matchId, msg.sender, match_.entryFee);
    }

    /**
     * @notice Start the match (host only)
     * @param matchId The match ID to start
     */
    function startMatch(uint256 matchId) external {
        Match storage match_ = matches[matchId];
        require(match_.host == msg.sender, "Only host can start");
        require(match_.status == MatchStatus.Pending, "Match already started");
        require(matchPlayers[matchId].length >= 2, "Need at least 2 players");

        match_.status = MatchStatus.Live;
        emit MatchStarted(matchId);
    }

    /**
     * @notice Finish match and set winner (oracle only)
     * @param matchId The match ID
     * @param winner The winning player address
     */
    function finishMatch(uint256 matchId, address winner) external {
        Match storage match_ = matches[matchId];
        require(msg.sender == gameOracle || msg.sender == owner(), "Not authorized");
        require(match_.status == MatchStatus.Live, "Match not live");
        require(isPlayerInMatch[matchId][winner], "Winner not in match");

        match_.status = MatchStatus.Finished;
        match_.winner = winner;

        emit MatchFinished(matchId, winner);
    }

    /**
     * @notice Claim prize (winner only)
     * @param matchId The match ID
     */
    function claimPrize(uint256 matchId) external {
        Match storage match_ = matches[matchId];
        require(match_.status == MatchStatus.Finished, "Match not finished");
        require(match_.winner == msg.sender, "Not the winner");
        require(!claimed[matchId], "Already claimed");

        claimed[matchId] = true;
        match_.status = MatchStatus.PaidOut;

        // Calculate fee (0.5% of prize pool)
        uint256 fee = (match_.prizePool * FEE_BPS) / 10000;
        uint256 prizeAmount = match_.prizePool - fee;

        // Transfer prize to winner (99.5%)
        usdc.safeTransfer(msg.sender, prizeAmount);

        // Accumulate fee for later withdrawal
        accumulatedFees += fee;

        emit PrizeClaimed(matchId, msg.sender, prizeAmount);
    }

    /**
     * @notice Cancel match and refund all players (host only)
     * @param matchId The match ID
     */
    function cancelMatch(uint256 matchId) external {
        Match storage match_ = matches[matchId];
        require(match_.host == msg.sender, "Only host can cancel");
        require(match_.status == MatchStatus.Pending, "Cannot cancel started match");

        match_.status = MatchStatus.Cancelled;

        // Refund all players
        uint256 refundAmount = match_.entryFee;
        address[] memory players = matchPlayers[matchId];
        
        for (uint256 i = 0; i < players.length; i++) {
            usdc.safeTransfer(players[i], refundAmount);
        }

        emit MatchCancelled(matchId);
    }

    /**
     * @notice Get all players in a match
     * @param matchId The match ID
     * @return Array of player addresses
     */
    function getPlayers(uint256 matchId) external view returns (address[] memory) {
        return matchPlayers[matchId];
    }

    /**
     * @notice Set the game oracle address (owner only)
     * @param _oracle The oracle address
     */
    function setGameOracle(address _oracle) external onlyOwner {
        gameOracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    /**
     * @notice Set the fee recipient address (owner only)
     * @param _feeRecipient The fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient address");
        feeRecipient = _feeRecipient;
    }

    /**
     * @notice Withdraw accumulated fees (fee recipient only)
     */
    function withdrawFees() external {
        require(msg.sender == feeRecipient, "Only fee recipient can withdraw");
        require(accumulatedFees > 0, "No fees to withdraw");

        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        usdc.safeTransfer(feeRecipient, amount);
    }

    /**
     * @notice Get accumulated fees amount
     * @return Amount of fees accumulated
     */
    function getAccumulatedFees() external view returns (uint256) {
        return accumulatedFees;
    }

    /**
     * @notice Emergency withdraw (owner only)
     * @dev Only use in case of emergency
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        usdc.safeTransfer(owner(), balance);
        accumulatedFees = 0; // Reset fees in emergency
    }
}

