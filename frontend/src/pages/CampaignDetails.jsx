import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { ethers } from "ethers";
import { CAMPAIGN_ABI } from "../utils/contract";
import toast from "react-hot-toast";

export default function CampaignDetails() {
  const { id } = useParams(); // Campaign address
  const { account, getProviderAndSigner, donate, fetchReputation } = useWeb3();

  const [campaign, setCampaign] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donating, setDonating] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [userContribution, setUserContribution] = useState("0");
  const [hasVotedOnMilestone, setHasVotedOnMilestone] = useState({});

  // Creator forms
  const [milestoneForm, setMilestoneForm] = useState({ description: "", amount: "" });
  const [evidenceForm, setEvidenceForm] = useState({ milestoneId: "", url: "" });
  const [creatorLoading, setCreatorLoading] = useState(false);

  const fetchCampaignData = useCallback(async () => {
    try {
      const { provider } = await getProviderAndSigner();
      if (!provider) return;

      const campaignContract = new ethers.Contract(id, CAMPAIGN_ABI, provider);

      // Fetch campaign basic details
      const details = await campaignContract.getCampaignDetails();
      const campaignInfo = {
        address: id,
        creator: details[0],
        title: details[1],
        description: details[2],
        goalAmount: ethers.formatEther(details[3]),
        deadline: Number(details[4]),
        totalRaised: ethers.formatEther(details[5]),
        totalContributors: Number(details[6]),
        state: Number(details[7]),
        githubRepo: details[8],
        imageUrl: details[9] || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600",
        milestoneCount: Number(details[10]),
        currentMilestone: Number(details[11]),
        balance: ethers.formatEther(details[12])
      };
      setCampaign(campaignInfo);

      // Fetch milestones
      const milestonesList = [];
      for (let i = 0; i < campaignInfo.currentMilestone; i++) {
        const m = await campaignContract.getMilestoneDetails(i);
        milestonesList.push({
          id: i,
          description: m[0],
          amount: ethers.formatEther(m[1]),
          status: Number(m[2]), // 0: Pending, 1: Active, 2: Approved, 3: Rejected
          yesVotes: Number(m[3]),
          noVotes: Number(m[4]),
          githubEvidence: m[5]
        });
      }
      setMilestones(milestonesList);

      // Check if current user has voted on each milestone
      if (account) {
        try {
          const votes = {};
          for (let i = 0; i < campaignInfo.currentMilestone; i++) {
            const voted = await campaignContract.hasVotedOnMilestone(i, account);
            votes[i] = voted;
          }
          setHasVotedOnMilestone(votes);
        } catch (err) {
          console.error("Error fetching votes:", err);
        }
      }

      // Fetch contributors
      try {
        const [addresses, amounts] = await campaignContract.getContributors();
        const contributorsList = addresses.map((addr, index) => ({
          address: addr,
          amount: ethers.formatEther(amounts[index])
        }));
        setContributors(contributorsList);

        // Fetch user contribution
        if (account) {
          try {
            const uContrib = await campaignContract.contributions(account);
            setUserContribution(ethers.formatEther(uContrib));
          } catch (e) {
            console.error("Error fetching user contribution:", e);
            // Fallback: check contributorList
            const match = contributorsList.find(c => c.address.toLowerCase() === account.toLowerCase());
            if (match) {
              setUserContribution(match.amount);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching contributors:", err);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load campaign details.");
    } finally {
      setLoading(false);
    }
  }, [id, account, getProviderAndSigner]);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  // Handle Donation
  const handleDonate = async (e) => {
    e.preventDefault();
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      toast.error("Enter valid donation amount!");
      return;
    }
    setDonating(true);
    try {
      await donate(id, donationAmount);
      setDonationAmount("");
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
    } finally {
      setDonating(false);
    }
  };

  // Creator: Create Milestone
  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    if (!milestoneForm.description || !milestoneForm.amount) {
      toast.error("Fill description and amount!");
      return;
    }
    const { signer } = await getProviderAndSigner();
    if (!signer) return;

    setCreatorLoading(true);
    const toastId = toast.loading("Creating milestone...");
    try {
      const campaignContract = new ethers.Contract(id, CAMPAIGN_ABI, signer);
      const amountWei = ethers.parseEther(milestoneForm.amount);
      const tx = await campaignContract.createMilestone(milestoneForm.description, amountWei);
      await tx.wait();
      toast.success("Milestone created!", { id: toastId });
      setMilestoneForm({ description: "", amount: "" });
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Failed to create milestone", { id: toastId });
    } finally {
      setCreatorLoading(false);
    }
  };

  // Creator: Submit Evidence
  const handleSubmitEvidence = async (milestoneId) => {
    const url = evidenceForm.url;
    if (!url) {
      toast.error("Please enter evidence URL!");
      return;
    }
    const { signer } = await getProviderAndSigner();
    if (!signer) return;

    setCreatorLoading(true);
    const toastId = toast.loading("Submitting evidence...");
    try {
      const campaignContract = new ethers.Contract(id, CAMPAIGN_ABI, signer);
      const tx = await campaignContract.submitMilestoneEvidence(milestoneId, url);
      await tx.wait();
      toast.success("Evidence submitted successfully!", { id: toastId });
      setEvidenceForm({ milestoneId: "", url: "" });
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Failed to submit evidence", { id: toastId });
    } finally {
      setCreatorLoading(false);
    }
  };

  // Contributor: Vote on Milestone
  const handleVote = async (milestoneId, approve) => {
    const { signer } = await getProviderAndSigner();
    if (!signer) return;

    const toastId = toast.loading(`Submitting ${approve ? 'yes' : 'no'} vote...`);
    try {
      const campaignContract = new ethers.Contract(id, CAMPAIGN_ABI, signer);
      const tx = await campaignContract.voteMilestone(milestoneId, approve);
      await tx.wait();
      toast.success("Vote registered!", { id: toastId });
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Failed to submit vote", { id: toastId });
    }
  };

  // Contributor: Request Refund
  const handleRefund = async () => {
    const { signer } = await getProviderAndSigner();
    if (!signer) return;

    const toastId = toast.loading("Claiming refund...");
    try {
      const campaignContract = new ethers.Contract(id, CAMPAIGN_ABI, signer);
      const tx = await campaignContract.requestRefund();
      await tx.wait();
      toast.success("Refund received!", { id: toastId });
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Failed to process refund", { id: toastId });
    }
  };

  // Check campaign expiry
  const handleCheckExpiry = async () => {
    const { signer } = await getProviderAndSigner();
    if (!signer) return;

    const toastId = toast.loading("Checking expiry...");
    try {
      const campaignContract = new ethers.Contract(id, CAMPAIGN_ABI, signer);
      const tx = await campaignContract.checkExpiry();
      await tx.wait();
      toast.success("Expiry processed!", { id: toastId });
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Expiry check failed", { id: toastId });
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-indigo-400 font-bold">Loading campaign details...</div>;
  }

  if (!campaign) {
    return <div className="text-center py-20 text-rose-500 font-bold">Campaign not found.</div>;
  }

  const isCreator = account && account.toLowerCase() === campaign.creator.toLowerCase();
  const isContributor = parseFloat(userContribution) > 0;
  const progressPercent = Math.min(Math.round((parseFloat(campaign.totalRaised) / parseFloat(campaign.goalAmount)) * 100), 100);

  const stateLabels = ["Fundraising", "Successful", "Expired", "Milestone escrow phase", "Completed", "Refunding"];

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Campaign Details (Left) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <img
            src={campaign.imageUrl}
            alt={campaign.title}
            className="w-full h-80 object-cover rounded-2xl mb-6 bg-slate-900"
          />
          <h2 className="text-3xl font-extrabold text-white mb-2">{campaign.title}</h2>
          
          {/* Creator tag */}
          <div className="flex items-center space-x-2 text-sm text-gray-400 mb-4 bg-slate-950/40 w-fit px-3 py-1.5 rounded-xl border border-slate-900/60 font-mono">
            <span>Creator:</span>
            <span className="text-indigo-400 font-bold">{campaign.creator.substring(0, 8)}...{campaign.creator.substring(campaign.creator.length - 6)}</span>
          </div>

          <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-line">{campaign.description}</p>
        </div>

        {/* Milestone escrows list */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Milestones Escrow Plan</h3>
            <span className="text-xs text-indigo-400 font-semibold">{campaign.currentMilestone} / {campaign.milestoneCount} Created</span>
          </div>

          {/* Timeline of milestones */}
          <div className="space-y-6 relative border-l border-slate-800 pl-6 ml-3">
            {milestones.map((m, index) => {
              const statusLabels = ["Pending", "Active Verification", "Approved & Released", "Rejected"];
              const statusColors = [
                "text-gray-400 bg-slate-800/30",
                "text-blue-400 bg-blue-500/10 border border-blue-500/20",
                "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20",
                "text-rose-400 bg-rose-500/10 border border-rose-500/20"
              ];

              return (
                <div key={m.id} className="relative">
                  {/* Circle Node */}
                  <div className="absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full bg-slate-900 border-2 border-indigo-500"></div>
                  
                  <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <h4 className="font-bold text-white text-base">Milestone {index + 1}: {m.description}</h4>
                        <span className="text-xs text-indigo-300 font-bold block mt-0.5">Allocation: {m.amount} ETH</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${statusColors[m.status]}`}>
                        {statusLabels[m.status]}
                      </span>
                    </div>

                    {/* GitHub Verification Evidence */}
                    {m.githubEvidence ? (
                      <div className="flex items-center space-x-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 font-mono text-gray-300">
                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
                        </svg>
                        <a href={m.githubEvidence} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline overflow-hidden text-ellipsis">
                          {m.githubEvidence.replace("https://github.com/", "")}
                        </a>
                      </div>
                    ) : (
                      isCreator && m.status === 1 && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="url"
                              placeholder="Link commit evidence (https://github.com/...)"
                              value={evidenceForm.milestoneId === m.id ? evidenceForm.url : ""}
                              onChange={(e) => setEvidenceForm({ milestoneId: m.id, url: e.target.value })}
                              className="flex-1 glass-input rounded-xl px-3 py-2 text-xs"
                            />
                            <button
                              onClick={() => handleSubmitEvidence(m.id)}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                            >
                              Submit
                            </button>
                          </div>
                          
                          {/* GitHub Commit Fetcher Integration */}
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const repoUrl = campaign.githubRepo || "";
                                const parts = repoUrl.replace("https://github.com/", "").split("/");
                                const owner = parts[0];
                                const repo = parts[1];
                                if (!owner || !repo) {
                                  toast.error("Invalid GitHub Repository URL");
                                  return;
                                }
                                const toastId = toast.loading("Fetching recent commits...");
                                try {
                                  const res = await fetch(`http://localhost:5001/api/github/commits?owner=${owner}&repo=${repo}`);
                                  const data = await res.json();
                                  if (data.commits && data.commits.length > 0) {
                                    toast.success("Fetched commits successfully!", { id: toastId });
                                    // Show a quick modal or options to select
                                    const commitUrls = data.commits.map(c => c.html_url);
                                    // Set the url to the most recent commit as default
                                    setEvidenceForm({ milestoneId: m.id, url: commitUrls[0] });
                                  } else {
                                    toast.error("No commits found in repository.", { id: toastId });
                                  }
                                } catch (err) {
                                  console.error(err);
                                  toast.error("Failed to connect to backend verification helper.", { id: toastId });
                                }
                              }}
                              className="text-[10px] text-indigo-400 font-bold hover:underline"
                            >
                              ⚡ Auto-fetch recent commit from GitHub
                            </button>
                          </div>
                        </div>
                      )
                    )}

                    {/* Voting Panel for contributors */}
                    {m.status === 1 && (
                      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 flex justify-between items-center">
                        <div>
                          <span className="text-xs text-gray-400 font-medium block">Approval Progress</span>
                          <span className="text-sm font-bold text-white">{m.yesVotes} Approve / {m.noVotes} Reject</span>
                          <span className="text-[10px] text-gray-500 block mt-0.5">Requires &gt; {Math.floor(campaign.totalContributors / 2)} Yes votes</span>
                        </div>

                        {isContributor && !isCreator && !hasVotedOnMilestone[m.id] && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVote(m.id, true)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleVote(m.id, false)}
                              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        
                        {hasVotedOnMilestone[m.id] && (
                          <span className="text-xs text-gray-400 font-bold bg-slate-900 px-3 py-1.5 rounded-lg">
                            Already Voted
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {milestones.length === 0 && (
              <p className="text-sm text-gray-500">No milestones active yet.</p>
            )}
          </div>

          {/* Creator Action: Add new milestone */}
          {isCreator && campaign.currentMilestone < campaign.milestoneCount && (campaign.state === 1 || campaign.state === 3) && (
            <form onSubmit={handleCreateMilestone} className="mt-8 border-t border-slate-850 pt-6 space-y-4">
              <h4 className="font-bold text-white text-base">Plan Next Milestone</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Milestone goal description..."
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                  className="glass-input rounded-xl px-4 py-3 text-sm"
                />
                <input
                  type="number"
                  step="0.001"
                  required
                  placeholder="Allocation (ETH)..."
                  value={milestoneForm.amount}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, amount: e.target.value })}
                  className="glass-input rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={creatorLoading}
                className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-550 text-white font-bold text-sm rounded-xl cursor-pointer"
              >
                Deploy Milestone Escrow
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Donation & Campaign Stats Sidebar (Right) */}
      <div className="space-y-6">
        {/* Campaign Stats Card */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">State</span>
            <span className="text-lg font-bold text-white uppercase tracking-wide bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl block text-center">
              {stateLabels[campaign.state] || "Fundraising"}
            </span>
          </div>

          {/* Goal progress */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-indigo-400 font-bold">{progressPercent}% Funded</span>
              <span className="text-gray-400">{campaign.totalRaised} / {campaign.goalAmount} ETH</span>
            </div>
            <div className="w-full bg-slate-950/60 rounded-full h-2.5 overflow-hidden border border-slate-900">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Stats grids */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl">
              <span className="block text-xl font-extrabold text-white">{campaign.totalContributors}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Contributors</span>
            </div>
            <div className="bg-slate-900/40 border border-slate-850 p-4 rounded-2xl">
              <span className="block text-xl font-extrabold text-white">{campaign.balance} ETH</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Escrow Balance</span>
            </div>
          </div>

          {/* Git repo link */}
          {campaign.githubRepo && (
            <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-2xl flex items-center space-x-3">
              <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
              </svg>
              <div className="overflow-hidden">
                <span className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold">Verification Repo</span>
                <a href={campaign.githubRepo} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 font-mono hover:underline truncate block">
                  {campaign.githubRepo.replace("https://github.com/", "")}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Donation action box */}
        {campaign.state === 0 && (
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Back this Campaign</h3>
            <p className="text-xs text-gray-400">All backing is locked in escrow, only released upon milestones approval.</p>

            <form onSubmit={handleDonate} className="space-y-3">
              <input
                type="number"
                step="0.001"
                required
                placeholder="Amount (ETH)..."
                value={donationAmount}
                disabled={donating}
                onChange={(e) => setDonationAmount(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={donating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition text-white font-bold rounded-xl cursor-pointer"
              >
                {donating ? "Sending ETH..." : "Contribute ETH"}
              </button>
            </form>
          </div>
        )}

        {/* Expiry Action / Refund Action Box */}
        {campaign.state === 0 && Math.floor(Date.now() / 1000) > campaign.deadline && (
          <div className="glass-panel p-6 rounded-3xl border border-rose-900/30 bg-rose-950/5 space-y-3">
            <h4 className="font-bold text-white text-sm">Campaign Deadline Reached</h4>
            <button
              onClick={handleCheckExpiry}
              className="w-full py-2.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-bold text-sm border border-rose-500/20 rounded-xl cursor-pointer"
            >
              Verify & Expire Campaign
            </button>
          </div>
        )}

        {/* User Backing Dashboard */}
        {isContributor && (
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-white text-sm">Your Contribution</h4>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Pledged:</span>
              <span className="text-sm font-bold text-indigo-300">{userContribution} ETH</span>
            </div>
            
            {(campaign.state === 2 || campaign.state === 5) && (
              <button
                onClick={handleRefund}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl cursor-pointer"
              >
                Withdraw Refund
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
