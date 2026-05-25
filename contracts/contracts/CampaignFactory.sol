// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Campaign.sol";

/**
 * @title CampaignFactory
 * @notice Factory contract to create and manage crowdfunding campaigns.
 *         Also tracks on-chain reputation scores for creators and contributors.
 * @dev Inspired by Crowdfunding-DAPP factory pattern, with integrated reputation.
 */
contract CampaignFactory {

    // ─── Events ──────────────────────────────────────────────────────────────────
    event CampaignCreated(
        address indexed campaignAddress,
        address indexed creator,
        string title,
        uint256 goalAmount,
        uint256 deadline,
        uint256 timestamp
    );

    event ReputationUpdated(
        address indexed user,
        int256 change,
        int256 newScore,
        string reason
    );

    // ─── State ───────────────────────────────────────────────────────────────────
    address[] public deployedCampaigns;

    /// @notice On-chain reputation scores (can be negative)
    mapping(address => int256) public reputation;

    /// @notice Only registered Campaign contracts can update reputation
    mapping(address => bool) public isCampaign;

    // ─── Campaign Creation ───────────────────────────────────────────────────────

    /**
     * @notice Create a new crowdfunding campaign
     * @param _title            Campaign title
     * @param _description      Campaign description
     * @param _goalAmount       Funding goal in wei
     * @param _deadline         Unix timestamp deadline
     * @param _milestoneCount   Number of milestones (must be >= 1)
     * @param _githubRepo       GitHub repository URL for verification
     * @param _imageUrl         Campaign image URL
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goalAmount,
        uint256 _deadline,
        uint256 _milestoneCount,
        string memory _githubRepo,
        string memory _imageUrl
    ) external {
        require(_goalAmount > 0, "Goal must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_milestoneCount >= 1, "Need at least 1 milestone");

        Campaign newCampaign = new Campaign(
            msg.sender,
            _title,
            _description,
            _goalAmount,
            _deadline,
            _milestoneCount,
            _githubRepo,
            _imageUrl,
            address(this)
        );

        address campaignAddr = address(newCampaign);
        deployedCampaigns.push(campaignAddr);
        isCampaign[campaignAddr] = true;

        emit CampaignCreated(
            campaignAddr,
            msg.sender,
            _title,
            _goalAmount,
            _deadline,
            block.timestamp
        );
    }

    // ─── Reputation System ───────────────────────────────────────────────────────

    /**
     * @notice Update a user's reputation score
     * @dev Only callable by registered Campaign contracts
     * @param _user     Address to update
     * @param _change   Points to add (positive) or subtract (negative)
     * @param _reason   Human-readable reason
     */
    function updateReputation(
        address _user,
        int256 _change,
        string memory _reason
    ) external {
        require(isCampaign[msg.sender], "Only campaigns can update reputation");

        reputation[_user] += _change;

        emit ReputationUpdated(_user, _change, reputation[_user], _reason);
    }

    /**
     * @notice Get reputation score for a user
     */
    function getReputation(address _user) external view returns (int256) {
        return reputation[_user];
    }

    /**
     * @notice Get reputation tier based on score
     * @return tier string: "Newcomer", "Bronze", "Silver", "Gold", "Platinum"
     */
    function getReputationTier(address _user) external view returns (string memory) {
        int256 score = reputation[_user];
        if (score >= 100) return "Platinum";
        if (score >= 50)  return "Gold";
        if (score >= 20)  return "Silver";
        if (score >= 5)   return "Bronze";
        return "Newcomer";
    }

    // ─── View Functions ──────────────────────────────────────────────────────────

    /**
     * @notice Get all deployed campaign addresses
     */
    function getDeployedCampaigns() external view returns (address[] memory) {
        return deployedCampaigns;
    }

    /**
     * @notice Get total number of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return deployedCampaigns.length;
    }
}
