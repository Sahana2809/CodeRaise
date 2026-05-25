const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CodeRaise", function () {
  let factory, factoryAddress;
  let owner, donor1, donor2, donor3;

  beforeEach(async function () {
    [owner, donor1, donor2, donor3] = await ethers.getSigners();

    const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
    factory = await CampaignFactory.deploy();
    await factory.waitForDeployment();
    factoryAddress = await factory.getAddress();
  });

  // Helper: get latest block timestamp
  async function latestTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("CampaignFactory", function () {
    it("should deploy successfully", async function () {
      expect(factoryAddress).to.be.properAddress;
    });

    it("should create a campaign", async function () {
      const now = await latestTimestamp();
      const deadline = now + 86400;
      const tx = await factory.createCampaign(
        "Test Campaign",
        "A test campaign description",
        ethers.parseEther("10"),
        deadline,
        3,
        "https://github.com/test/repo",
        "https://example.com/image.png"
      );

      await tx.wait();
      const campaigns = await factory.getDeployedCampaigns();
      expect(campaigns.length).to.equal(1);
    });

    it("should reject campaign with zero goal", async function () {
      const now = await latestTimestamp();
      await expect(
        factory.createCampaign("Test", "Desc", 0, now + 86400, 1, "", "")
      ).to.be.revertedWith("Goal must be > 0");
    });

    it("should reject campaign with past deadline", async function () {
      const now = await latestTimestamp();
      await expect(
        factory.createCampaign("Test", "Desc", ethers.parseEther("1"), now - 1000, 1, "", "")
      ).to.be.revertedWith("Deadline must be in the future");
    });

    it("should reject campaign with zero milestones", async function () {
      const now = await latestTimestamp();
      await expect(
        factory.createCampaign("Test", "Desc", ethers.parseEther("1"), now + 86400, 0, "", "")
      ).to.be.revertedWith("Need at least 1 milestone");
    });

    it("should track multiple campaigns", async function () {
      const now = await latestTimestamp();
      const deadline = now + 86400;
      await factory.createCampaign("Campaign 1", "Desc 1", ethers.parseEther("5"), deadline, 2, "", "");
      await factory.createCampaign("Campaign 2", "Desc 2", ethers.parseEther("10"), deadline, 3, "", "");

      expect(await factory.getCampaignCount()).to.equal(2);
    });

    it("should initialize reputation at 0", async function () {
      expect(await factory.getReputation(owner.address)).to.equal(0);
      expect(await factory.getReputationTier(owner.address)).to.equal("Newcomer");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPAIGN DONATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Campaign - Donations", function () {
    let campaign, campaignAddress;

    beforeEach(async function () {
      const now = await latestTimestamp();
      await factory.createCampaign(
        "Fund My Project",
        "Open source funding",
        ethers.parseEther("5"),
        now + 86400,
        2,
        "https://github.com/test/repo",
        "https://example.com/image.png"
      );

      const campaigns = await factory.getDeployedCampaigns();
      campaignAddress = campaigns[0];
      campaign = await ethers.getContractAt("Campaign", campaignAddress);
    });

    it("should accept donations", async function () {
      await campaign.connect(donor1).donate({ value: ethers.parseEther("1") });
      expect(await campaign.totalRaised()).to.equal(ethers.parseEther("1"));
      expect(await campaign.totalContributors()).to.equal(1);
    });

    it("should track multiple donors", async function () {
      await campaign.connect(donor1).donate({ value: ethers.parseEther("1") });
      await campaign.connect(donor2).donate({ value: ethers.parseEther("2") });

      expect(await campaign.totalContributors()).to.equal(2);
      expect(await campaign.totalRaised()).to.equal(ethers.parseEther("3"));
      expect(await campaign.contributions(donor1.address)).to.equal(ethers.parseEther("1"));
      expect(await campaign.contributions(donor2.address)).to.equal(ethers.parseEther("2"));
    });

    it("should allow same donor to donate multiple times", async function () {
      await campaign.connect(donor1).donate({ value: ethers.parseEther("1") });
      await campaign.connect(donor1).donate({ value: ethers.parseEther("2") });

      expect(await campaign.totalContributors()).to.equal(1);
      expect(await campaign.contributions(donor1.address)).to.equal(ethers.parseEther("3"));
    });

    it("should reject zero donations", async function () {
      await expect(
        campaign.connect(donor1).donate({ value: 0 })
      ).to.be.revertedWith("Donation must be greater than 0");
    });

    it("should transition to Successful when goal reached", async function () {
      await campaign.connect(donor1).donate({ value: ethers.parseEther("5") });
      expect(await campaign.state()).to.equal(1); // Successful
    });

    it("should return contributor list", async function () {
      await campaign.connect(donor1).donate({ value: ethers.parseEther("1") });
      await campaign.connect(donor2).donate({ value: ethers.parseEther("2") });

      const [addresses, amounts] = await campaign.getContributors();
      expect(addresses.length).to.equal(2);
      expect(amounts[0]).to.equal(ethers.parseEther("1"));
      expect(amounts[1]).to.equal(ethers.parseEther("2"));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MILESTONE + VOTING TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Campaign - Milestones & Voting", function () {
    let campaign, campaignAddress;

    beforeEach(async function () {
      const now = await latestTimestamp();
      await factory.createCampaign(
        "Milestone Project",
        "Project with milestones",
        ethers.parseEther("5"),
        now + 86400,
        2,
        "https://github.com/test/repo",
        ""
      );

      const campaigns = await factory.getDeployedCampaigns();
      campaignAddress = campaigns[0];
      campaign = await ethers.getContractAt("Campaign", campaignAddress);

      // Fund campaign to reach goal with 3 contributors
      await campaign.connect(donor1).donate({ value: ethers.parseEther("2") });
      await campaign.connect(donor2).donate({ value: ethers.parseEther("2") });
      await campaign.connect(donor3).donate({ value: ethers.parseEther("1") });
    });

    it("should allow creator to create milestones after funding", async function () {
      await campaign.connect(owner).createMilestone("Build MVP", ethers.parseEther("2"));
      const m = await campaign.getMilestoneDetails(0);
      expect(m._description).to.equal("Build MVP");
      expect(m._amount).to.equal(ethers.parseEther("2"));
      expect(m._status).to.equal(1); // Active
    });

    it("should prevent non-creators from creating milestones", async function () {
      await expect(
        campaign.connect(donor1).createMilestone("Bad milestone", ethers.parseEther("1"))
      ).to.be.revertedWith("Only campaign creator");
    });

    it("should allow contributors to vote", async function () {
      await campaign.connect(owner).createMilestone("Build MVP", ethers.parseEther("2"));
      await campaign.connect(donor1).voteMilestone(0, true);

      const m = await campaign.getMilestoneDetails(0);
      expect(m._yesVotes).to.equal(1);
    });

    it("should prevent double voting", async function () {
      await campaign.connect(owner).createMilestone("Build MVP", ethers.parseEther("2"));
      await campaign.connect(donor1).voteMilestone(0, true);

      await expect(
        campaign.connect(donor1).voteMilestone(0, true)
      ).to.be.revertedWith("Already voted on this milestone");
    });

    it("should prevent creator from self-voting", async function () {
      const now = await latestTimestamp();
      await factory.connect(donor1).createCampaign(
        "Creator Donor Test",
        "Desc",
        ethers.parseEther("3"),
        now + 86400,
        1,
        "",
        ""
      );
      const campaigns = await factory.getDeployedCampaigns();
      const c2 = await ethers.getContractAt("Campaign", campaigns[1]);

      // Creator (donor1) donates to their own campaign
      await c2.connect(donor1).donate({ value: ethers.parseEther("1") });
      await c2.connect(donor2).donate({ value: ethers.parseEther("2") });

      await c2.connect(donor1).createMilestone("Test", ethers.parseEther("1"));

      await expect(
        c2.connect(donor1).voteMilestone(0, true)
      ).to.be.revertedWith("Creator cannot self-vote");
    });

    it("should release funds when >50% vote yes", async function () {
      // 3 contributors, need >1 (i.e., 2 votes) for >50%
      await campaign.connect(owner).createMilestone("Build MVP", ethers.parseEther("2"));

      const creatorBalBefore = await ethers.provider.getBalance(owner.address);

      await campaign.connect(donor1).voteMilestone(0, true);
      await campaign.connect(donor2).voteMilestone(0, true); // 2 > 3/2 = 2 > 1 ✓

      const m = await campaign.getMilestoneDetails(0);
      expect(m._status).to.equal(2); // Approved

      const creatorBalAfter = await ethers.provider.getBalance(owner.address);
      expect(creatorBalAfter).to.be.gt(creatorBalBefore);
    });

    it("should reject milestone when >50% vote no", async function () {
      await campaign.connect(owner).createMilestone("Bad milestone", ethers.parseEther("2"));

      await campaign.connect(donor1).voteMilestone(0, false);
      await campaign.connect(donor2).voteMilestone(0, false);

      const m = await campaign.getMilestoneDetails(0);
      expect(m._status).to.equal(3); // Rejected
    });

    it("should allow submitting GitHub evidence", async function () {
      await campaign.connect(owner).createMilestone("Build MVP", ethers.parseEther("2"));
      await campaign.connect(owner).submitMilestoneEvidence(0, "https://github.com/test/repo/commit/abc123");

      const m = await campaign.getMilestoneDetails(0);
      expect(m._githubEvidence).to.equal("https://github.com/test/repo/commit/abc123");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REFUND TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Campaign - Refunds", function () {
    it("should allow refunds when campaign expires", async function () {
      const now = await latestTimestamp();
      // Create campaign with deadline 1 day ahead (we'll fast-forward)
      await factory.createCampaign(
        "Short Campaign",
        "Will expire",
        ethers.parseEther("100"),
        now + 86400,
        1,
        "",
        ""
      );

      const campaigns = await factory.getDeployedCampaigns();
      const campaign = await ethers.getContractAt("Campaign", campaigns[0]);

      // Donate
      await campaign.connect(donor1).donate({ value: ethers.parseEther("1") });

      // Fast-forward past deadline
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      // Trigger expiry
      await campaign.checkExpiry();
      expect(await campaign.state()).to.equal(2); // Expired

      // Request refund
      const balBefore = await ethers.provider.getBalance(donor1.address);
      await campaign.connect(donor1).requestRefund();
      const balAfter = await ethers.provider.getBalance(donor1.address);

      expect(balAfter).to.be.gt(balBefore);
    });

    it("should not allow refunds during active fundraising", async function () {
      const now = await latestTimestamp();
      await factory.createCampaign("Active", "Desc", ethers.parseEther("10"), now + 86400, 1, "", "");

      const campaigns = await factory.getDeployedCampaigns();
      const campaign = await ethers.getContractAt("Campaign", campaigns[0]);

      await campaign.connect(donor1).donate({ value: ethers.parseEther("1") });

      await expect(
        campaign.connect(donor1).requestRefund()
      ).to.be.revertedWith("Campaign not in refundable state");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REPUTATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Reputation System", function () {
    it("should update reputation when milestones are approved", async function () {
      const now = await latestTimestamp();
      await factory.createCampaign("Rep Test", "Desc", ethers.parseEther("3"), now + 86400, 1, "", "");

      const campaigns = await factory.getDeployedCampaigns();
      const campaign = await ethers.getContractAt("Campaign", campaigns[0]);

      // Need 3 contributors so 2 votes > 3/2 = 1
      await campaign.connect(donor1).donate({ value: ethers.parseEther("1") });
      await campaign.connect(donor2).donate({ value: ethers.parseEther("1") });
      await campaign.connect(donor3).donate({ value: ethers.parseEther("1") });

      await campaign.connect(owner).createMilestone("Deliver feature", ethers.parseEther("3"));

      // Vote yes — need >50% of 3 contributors, so need 2 votes
      await campaign.connect(donor1).voteMilestone(0, true);
      await campaign.connect(donor2).voteMilestone(0, true);

      // After approval: +5 (milestone) + 10 (campaign complete) = 15
      const rep = await factory.getReputation(owner.address);
      expect(rep).to.be.gte(5);
    });

    it("should decrease reputation when campaign expires", async function () {
      const now = await latestTimestamp();
      await factory.createCampaign("Expire Test", "Desc", ethers.parseEther("100"), now + 86400, 1, "", "");

      const campaigns = await factory.getDeployedCampaigns();
      const campaign = await ethers.getContractAt("Campaign", campaigns[0]);

      await campaign.connect(donor1).donate({ value: ethers.parseEther("1") });

      // Fast-forward past deadline
      await ethers.provider.send("evm_increaseTime", [86401]);
      await ethers.provider.send("evm_mine");

      await campaign.checkExpiry();

      const rep = await factory.getReputation(owner.address);
      expect(rep).to.equal(-10);
    });

    it("should return correct reputation tiers", async function () {
      expect(await factory.getReputationTier(owner.address)).to.equal("Newcomer");
    });

    it("should prevent non-campaign addresses from updating reputation", async function () {
      await expect(
        factory.connect(donor1).updateReputation(owner.address, 100, "cheat")
      ).to.be.revertedWith("Only campaigns can update reputation");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION TEST — FULL LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Full Campaign Lifecycle", function () {
    it("should complete full lifecycle: create → fund → milestone → vote → release", async function () {
      const now = await latestTimestamp();

      // 1. Create campaign with 2 milestones
      await factory.createCampaign(
        "Full Lifecycle Test",
        "Testing complete flow",
        ethers.parseEther("4"),
        now + 86400,
        2,
        "https://github.com/test/lifecycle",
        "https://example.com/image.png"
      );

      const campaigns = await factory.getDeployedCampaigns();
      const campaign = await ethers.getContractAt("Campaign", campaigns[0]);

      // 2. Donate — 3 contributors (so 2 votes = >50% of 3)
      await campaign.connect(donor1).donate({ value: ethers.parseEther("2") });
      await campaign.connect(donor2).donate({ value: ethers.parseEther("1") });
      await campaign.connect(donor3).donate({ value: ethers.parseEther("1") });

      expect(await campaign.state()).to.equal(1); // Successful

      // 3. Create milestone 1
      await campaign.connect(owner).createMilestone("Phase 1: Design", ethers.parseEther("2"));
      expect(await campaign.state()).to.equal(3); // MilestonePhase

      // 4. Submit evidence
      await campaign.connect(owner).submitMilestoneEvidence(0, "https://github.com/test/commit/1");

      // 5. Vote to approve milestone 1 — need 2 out of 3
      await campaign.connect(donor1).voteMilestone(0, true);
      await campaign.connect(donor2).voteMilestone(0, true);

      const m1 = await campaign.getMilestoneDetails(0);
      expect(m1._status).to.equal(2); // Approved

      // 6. Create and approve milestone 2
      await campaign.connect(owner).createMilestone("Phase 2: Build", ethers.parseEther("2"));
      await campaign.connect(donor1).voteMilestone(1, true);
      await campaign.connect(donor2).voteMilestone(1, true);

      // Campaign should be completed (all milestones approved)
      expect(await campaign.state()).to.equal(4); // Completed

      // 7. Verify details
      const details = await campaign.getCampaignDetails();
      expect(details._title).to.equal("Full Lifecycle Test");
      expect(details._totalRaised).to.equal(ethers.parseEther("4"));
      expect(details._totalContributors).to.equal(3);

      // 8. Verify reputation
      const rep = await factory.getReputation(owner.address);
      // +5 (milestone 1) + 5 (milestone 2) + 10 (campaign complete) = 20
      expect(rep).to.equal(20);
    });
  });
});
