// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Campaign
 * @notice Individual crowdfunding campaign with milestone-based escrow,
 *         DAO voting for fund release, and automatic refunds.
 * @dev Combines patterns from Crowdfunding-DAPP (donations + refunds),
 *      MileStarter (milestone escrow), and ethereum-kickstart-react (voting).
 *      All milestone + voting logic is in this single contract (no separate manager).
 */

// Interface for the factory's reputation system
interface IFactory {
    function updateReputation(address _user, int256 _change, string memory _reason) external;
}

contract Campaign {

    // ─── Enums ───────────────────────────────────────────────────────────────────

    /**
     * @notice Campaign lifecycle states
     * Fundraising   → active, accepting donations
     * Successful    → goal reached, preparing milestones
     * Expired       → deadline passed without reaching goal
     * MilestonePhase→ milestones being executed and voted on
     * Completed     → all milestones delivered, campaign finished
     * Refunding     → refunds in progress for expired campaign
     */
    enum CampaignState {
        Fundraising,
        Successful,
        Expired,
        MilestonePhase,
        Completed,
        Refunding
    }

    enum MilestoneStatus {
        Pending,
        Active,
        Approved,
        Rejected
    }

    // ─── Structs ─────────────────────────────────────────────────────────────────

    struct Milestone {
        string description;
        uint256 amount;           // Wei allocated to this milestone
        MilestoneStatus status;
        uint256 yesVotes;
        uint256 noVotes;
        string githubEvidence;    // URL to commit/PR as evidence
        mapping(address => bool) hasVoted;
    }

    // ─── State Variables ─────────────────────────────────────────────────────────

    // Campaign info
    address payable public creator;
    string public title;
    string public description;
    uint256 public goalAmount;
    uint256 public deadline;
    string public githubRepo;
    string public imageUrl;
    CampaignState public state;
    uint256 public createdAt;

    // Factory reference (for reputation updates)
    address public factory;

    // Funding
    uint256 public totalRaised;
    uint256 public totalContributors;
    mapping(address => uint256) public contributions;
    address[] public contributorList;

    // Milestones
    uint256 public milestoneCount;
    uint256 public currentMilestone;
    mapping(uint256 => Milestone) public milestones;
    uint256 public totalMilestoneFundsReleased;

    // ─── Events ──────────────────────────────────────────────────────────────────

    event DonationReceived(
        address indexed donor,
        uint256 amount,
        uint256 totalRaised,
        uint256 timestamp
    );

    event MilestoneCreated(
        uint256 indexed milestoneId,
        string description,
        uint256 amount
    );

    event MilestoneVoted(
        uint256 indexed milestoneId,
        address indexed voter,
        bool approve,
        uint256 yesVotes,
        uint256 noVotes
    );

    event MilestoneFundsReleased(
        uint256 indexed milestoneId,
        uint256 amount,
        address indexed creator
    );

    event RefundIssued(
        address indexed contributor,
        uint256 amount
    );

    event CampaignStateChanged(
        CampaignState oldState,
        CampaignState newState
    );

    // ─── Modifiers ───────────────────────────────────────────────────────────────

    modifier onlyCreator() {
        require(msg.sender == creator, "Only campaign creator");
        _;
    }

    modifier onlyContributor() {
        require(contributions[msg.sender] > 0, "Only contributors can do this");
        _;
    }

    modifier inState(CampaignState _state) {
        require(state == _state, "Invalid campaign state");
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────────

    constructor(
        address _creator,
        string memory _title,
        string memory _description,
        uint256 _goalAmount,
        uint256 _deadline,
        uint256 _milestoneCount,
        string memory _githubRepo,
        string memory _imageUrl,
        address _factory
    ) {
        creator = payable(_creator);
        title = _title;
        description = _description;
        goalAmount = _goalAmount;
        deadline = _deadline;
        milestoneCount = _milestoneCount;
        githubRepo = _githubRepo;
        imageUrl = _imageUrl;
        factory = _factory;
        state = CampaignState.Fundraising;
        createdAt = block.timestamp;
        currentMilestone = 0;
    }

    // ─── Donation Logic ──────────────────────────────────────────────────────────

    /**
     * @notice Donate to the campaign
     * @dev Only during Fundraising state, before deadline
     */
    function donate() external payable inState(CampaignState.Fundraising) {
        require(block.timestamp <= deadline, "Campaign deadline has passed");
        require(msg.value > 0, "Donation must be greater than 0");

        // Track new contributor
        if (contributions[msg.sender] == 0) {
            contributorList.push(msg.sender);
            totalContributors++;
        }

        contributions[msg.sender] += msg.value;
        totalRaised += msg.value;

        emit DonationReceived(msg.sender, msg.value, totalRaised, block.timestamp);

        // Check if goal is reached
        _checkFundingComplete();
    }

    /**
     * @notice Check if funding goal reached or deadline expired
     * @dev Automatically transitions state
     */
    function _checkFundingComplete() internal {
        if (totalRaised >= goalAmount) {
            CampaignState oldState = state;
            state = CampaignState.Successful;
            emit CampaignStateChanged(oldState, state);
        }
    }

    /**
     * @notice Manually check and expire campaign if deadline passed
     * @dev Anyone can call this to trigger state transition
     */
    function checkExpiry() external {
        require(state == CampaignState.Fundraising, "Not in fundraising");
        require(block.timestamp > deadline, "Deadline not passed yet");
        require(totalRaised < goalAmount, "Goal was reached");

        CampaignState oldState = state;
        state = CampaignState.Expired;
        emit CampaignStateChanged(oldState, state);

        // Update creator reputation: -10 for failed campaign
        try IFactory(factory).updateReputation(creator, -10, "Campaign expired without reaching goal") {} catch {}
    }

    // ─── Milestone Logic ─────────────────────────────────────────────────────────

    /**
     * @notice Create a milestone (only creator, only after funding succeeded)
     * @param _description  What this milestone delivers
     * @param _amount       Wei to release upon approval
     */
    function createMilestone(
        string memory _description,
        uint256 _amount
    ) external onlyCreator {
        require(
            state == CampaignState.Successful || state == CampaignState.MilestonePhase,
            "Campaign must be funded first"
        );
        require(currentMilestone < milestoneCount, "All milestones already created");
        require(_amount > 0, "Amount must be > 0");

        // Ensure total milestone amounts don't exceed raised funds
        uint256 totalAllocated = _amount + totalMilestoneFundsReleased;
        for (uint256 i = 0; i < currentMilestone; i++) {
            if (milestones[i].status == MilestoneStatus.Pending || milestones[i].status == MilestoneStatus.Active) {
                totalAllocated += milestones[i].amount;
            }
        }
        require(totalAllocated <= totalRaised, "Milestone amounts exceed raised funds");

        Milestone storage m = milestones[currentMilestone];
        m.description = _description;
        m.amount = _amount;
        m.status = MilestoneStatus.Active;
        m.yesVotes = 0;
        m.noVotes = 0;

        emit MilestoneCreated(currentMilestone, _description, _amount);

        // Transition to MilestonePhase on first milestone
        if (state == CampaignState.Successful) {
            CampaignState oldState = state;
            state = CampaignState.MilestonePhase;
            emit CampaignStateChanged(oldState, state);
        }

        currentMilestone++;
    }

    /**
     * @notice Submit GitHub evidence for a milestone
     * @param _milestoneId  ID of the milestone
     * @param _evidence     URL to GitHub commit/PR
     */
    function submitMilestoneEvidence(
        uint256 _milestoneId,
        string memory _evidence
    ) external onlyCreator {
        require(_milestoneId < currentMilestone, "Milestone not created yet");
        Milestone storage m = milestones[_milestoneId];
        require(m.status == MilestoneStatus.Active, "Milestone not active");
        m.githubEvidence = _evidence;
    }

    // ─── DAO Voting Logic ────────────────────────────────────────────────────────

    /**
     * @notice Vote on a milestone (approve or reject)
     * @dev Only contributors can vote, one vote per address per milestone,
     *      creator cannot self-vote
     * @param _milestoneId  ID of the milestone to vote on
     * @param _approve      true = approve, false = reject
     */
    function voteMilestone(
        uint256 _milestoneId,
        bool _approve
    ) external onlyContributor inState(CampaignState.MilestonePhase) {
        require(_milestoneId < currentMilestone, "Milestone not created yet");
        require(msg.sender != creator, "Creator cannot self-vote");

        Milestone storage m = milestones[_milestoneId];
        require(m.status == MilestoneStatus.Active, "Milestone not active");
        require(!m.hasVoted[msg.sender], "Already voted on this milestone");

        m.hasVoted[msg.sender] = true;

        if (_approve) {
            m.yesVotes++;
        } else {
            m.noVotes++;
        }

        emit MilestoneVoted(_milestoneId, msg.sender, _approve, m.yesVotes, m.noVotes);

        // Auto-approve if >50% voted yes
        if (m.yesVotes > totalContributors / 2) {
            _releaseMilestoneFunds(_milestoneId);
        }

        // Auto-reject if >50% voted no
        if (m.noVotes > totalContributors / 2) {
            m.status = MilestoneStatus.Rejected;
        }
    }

    /**
     * @notice Release funds for an approved milestone
     * @dev Internal: called automatically when >50% approve
     */
    function _releaseMilestoneFunds(uint256 _milestoneId) internal {
        Milestone storage m = milestones[_milestoneId];
        require(m.status == MilestoneStatus.Active, "Milestone not active");
        require(address(this).balance >= m.amount, "Insufficient contract balance");

        m.status = MilestoneStatus.Approved;
        totalMilestoneFundsReleased += m.amount;

        // Transfer funds to creator
        (bool success, ) = creator.call{value: m.amount}("");
        require(success, "Transfer failed");

        emit MilestoneFundsReleased(_milestoneId, m.amount, creator);

        // Update creator reputation: +5 per milestone delivered
        try IFactory(factory).updateReputation(creator, 5, "Milestone delivered") {} catch {}

        // Check if all milestones completed
        _checkAllMilestonesCompleted();
    }

    /**
     * @notice Check if all milestones are completed
     */
    function _checkAllMilestonesCompleted() internal {
        if (currentMilestone < milestoneCount) return;

        bool allDone = true;
        for (uint256 i = 0; i < milestoneCount; i++) {
            if (milestones[i].status != MilestoneStatus.Approved) {
                allDone = false;
                break;
            }
        }

        if (allDone) {
            CampaignState oldState = state;
            state = CampaignState.Completed;
            emit CampaignStateChanged(oldState, state);

            // Bonus reputation for completing entire campaign
            try IFactory(factory).updateReputation(creator, 10, "Campaign fully completed") {} catch {}

            // Reward contributors
            for (uint256 i = 0; i < contributorList.length; i++) {
                try IFactory(factory).updateReputation(contributorList[i], 2, "Contributed to successful campaign") {} catch {}
            }

            // Transfer any remaining balance to creator
            uint256 remaining = address(this).balance;
            if (remaining > 0) {
                (bool success, ) = creator.call{value: remaining}("");
                require(success, "Transfer remaining failed");
            }
        }
    }

    // ─── Refund Logic ────────────────────────────────────────────────────────────

    /**
     * @notice Request a refund (only if campaign expired and goal not reached)
     * @dev Contributor gets back their exact contribution amount
     */
    function requestRefund() external onlyContributor {
        require(
            state == CampaignState.Expired || state == CampaignState.Refunding,
            "Campaign not in refundable state"
        );
        // Additional safety: deadline must have passed AND goal not reached
        require(
            block.timestamp > deadline && totalRaised < goalAmount,
            "Refund conditions not met"
        );

        uint256 amount = contributions[msg.sender];
        require(amount > 0, "No contribution to refund");
        require(address(this).balance >= amount, "Insufficient contract balance");

        // Set state to Refunding on first refund
        if (state == CampaignState.Expired) {
            CampaignState oldState = state;
            state = CampaignState.Refunding;
            emit CampaignStateChanged(oldState, state);
        }

        contributions[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Refund transfer failed");

        emit RefundIssued(msg.sender, amount);
    }

    // ─── View Functions ──────────────────────────────────────────────────────────

    /**
     * @notice Get full campaign details
     */
    function getCampaignDetails() external view returns (
        address _creator,
        string memory _title,
        string memory _description,
        uint256 _goalAmount,
        uint256 _deadline,
        uint256 _totalRaised,
        uint256 _totalContributors,
        CampaignState _state,
        string memory _githubRepo,
        string memory _imageUrl,
        uint256 _milestoneCount,
        uint256 _currentMilestone,
        uint256 _balance
    ) {
        return (
            creator,
            title,
            description,
            goalAmount,
            deadline,
            totalRaised,
            totalContributors,
            state,
            githubRepo,
            imageUrl,
            milestoneCount,
            currentMilestone,
            address(this).balance
        );
    }

    /**
     * @notice Get milestone details (excluding mapping)
     */
    function getMilestoneDetails(uint256 _id) external view returns (
        string memory _description,
        uint256 _amount,
        MilestoneStatus _status,
        uint256 _yesVotes,
        uint256 _noVotes,
        string memory _githubEvidence
    ) {
        require(_id < currentMilestone, "Milestone not created");
        Milestone storage m = milestones[_id];
        return (
            m.description,
            m.amount,
            m.status,
            m.yesVotes,
            m.noVotes,
            m.githubEvidence
        );
    }

    /**
     * @notice Check if an address has voted on a specific milestone
     */
    function hasVotedOnMilestone(uint256 _milestoneId, address _voter) external view returns (bool) {
        require(_milestoneId < currentMilestone, "Milestone not created");
        return milestones[_milestoneId].hasVoted[_voter];
    }

    /**
     * @notice Get all contributors and their amounts
     */
    function getContributors() external view returns (address[] memory, uint256[] memory) {
        uint256 len = contributorList.length;
        uint256[] memory amounts = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            amounts[i] = contributions[contributorList[i]];
        }
        return (contributorList, amounts);
    }

    /**
     * @notice Get contract ETH balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
