// Compact Human-Readable ABIs for ethers v6
export const FACTORY_ABI = [
  "function createCampaign(string title, string description, uint256 goalAmount, uint256 deadline, uint256 milestoneCount, string githubRepo, string imageUrl) external",
  "function getDeployedCampaigns() external view returns (address[])",
  "function getReputation(address user) external view returns (int256)",
  "function getReputationTier(address user) external view returns (string)",
  "function getCampaignCount() external view returns (uint256)",
  "event CampaignCreated(address indexed campaignAddress, address indexed creator, string title, uint256 goalAmount, uint256 deadline, uint256 timestamp)",
  "event ReputationUpdated(address indexed user, int256 change, int256 newScore, string reason)"
];

export const CAMPAIGN_ABI = [
  "function creator() external view returns (address)",
  "function title() external view returns (string)",
  "function description() external view returns (string)",
  "function goalAmount() external view returns (uint256)",
  "function deadline() external view returns (uint256)",
  "function totalRaised() external view returns (uint256)",
  "function totalContributors() external view returns (uint256)",
  "function state() external view returns (uint8)",
  "function githubRepo() external view returns (string)",
  "function imageUrl() external view returns (string)",
  "function milestoneCount() external view returns (uint256)",
  "function currentMilestone() external view returns (uint256)",
  "function getCampaignDetails() external view returns (address, string, string, uint256, uint256, uint256, uint256, uint8, string, string, uint256, uint256, uint256)",
  "function getMilestoneDetails(uint256 _id) external view returns (string, uint256, uint8, uint256, uint256, string)",
  "function hasVotedOnMilestone(uint256 _milestoneId, address _voter) external view returns (bool)",
  "function getContributors() external view returns (address[], uint256[])",
  "function donate() external payable",
  "function checkExpiry() external",
  "function createMilestone(string _description, uint256 _amount) external",
  "function submitMilestoneEvidence(uint256 _milestoneId, string _evidence) external",
  "function voteMilestone(uint256 _milestoneId, bool _approve) external",
  "function requestRefund() external",
  "event DonationReceived(address indexed donor, uint256 amount, uint256 totalRaised, uint256 timestamp)",
  "event MilestoneCreated(uint256 indexed milestoneId, string description, uint256 amount)",
  "event MilestoneVoted(uint256 indexed milestoneId, address indexed voter, bool approve, uint256 yesVotes, uint256 noVotes)",
  "event MilestoneFundsReleased(uint256 indexed milestoneId, uint256 amount, address indexed creator)",
  "event RefundIssued(address indexed contributor, uint256 amount)",
  "event CampaignStateChanged(uint8 oldState, uint8 newState)"
];

// Placeholder for deployment address (will be dynamically fetched or fallback to localhost deploy)
export const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || "";
