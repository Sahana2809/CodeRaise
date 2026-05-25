import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { FACTORY_ADDRESS, FACTORY_ABI, CAMPAIGN_ABI } from "../utils/contract";
import toast from "react-hot-toast";

const Web3Context = createContext();

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState("");
  const [reputation, setReputation] = useState(0);
  const [tier, setTier] = useState("Newcomer");
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [factoryAddress, setFactoryAddress] = useState(FACTORY_ADDRESS);

  // Initialize Provider & Signer
  const getProviderAndSigner = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask!");
      return { provider: null, signer: null };
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    try {
      const signer = await provider.getSigner();
      return { provider, signer };
    } catch (e) {
      return { provider, signer: null };
    }
  }, []);

  // Update reputation for current user
  const fetchReputation = useCallback(async (userAddr) => {
    if (!userAddr || !factoryAddress) return;
    try {
      const { provider } = await getProviderAndSigner();
      if (!provider) return;
      const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
      const score = await factoryContract.getReputation(userAddr);
      const userTier = await factoryContract.getReputationTier(userAddr);
      setReputation(Number(score));
      setTier(userTier);
    } catch (err) {
      console.error("Error fetching reputation:", err);
    }
  }, [factoryAddress, getProviderAndSigner]);

  // Connect Wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found!");
      return;
    }
    setLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts[0];
      setAccount(addr);
      toast.success("Wallet connected!");
      await fetchReputation(addr);
    } catch (err) {
      console.error(err);
      toast.error("Failed to connect wallet.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all campaigns and their details
  const fetchCampaigns = useCallback(async () => {
    if (!factoryAddress) return;
    try {
      const { provider } = await getProviderAndSigner();
      if (!provider) return;
      const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, provider);
      const campaignAddresses = await factoryContract.getDeployedCampaigns();
      
      const campaignsList = await Promise.all(
        campaignAddresses.map(async (addr) => {
          const campaignContract = new ethers.Contract(addr, CAMPAIGN_ABI, provider);
          try {
            const details = await campaignContract.getCampaignDetails();
            return {
              address: addr,
              creator: details[0],
              title: details[1],
              description: details[2],
              goalAmount: ethers.formatEther(details[3]),
              deadline: Number(details[4]),
              totalRaised: ethers.formatEther(details[5]),
              totalContributors: Number(details[6]),
              state: Number(details[7]), // 0: Fundraising, 1: Successful, 2: Expired, etc.
              githubRepo: details[8],
              imageUrl: details[9] || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600",
              milestoneCount: Number(details[10]),
              currentMilestone: Number(details[11]),
              balance: ethers.formatEther(details[12])
            };
          } catch (e) {
            console.error(`Failed to fetch details for ${addr}:`, e);
            return null;
          }
        })
      );

      setCampaigns(campaignsList.filter(Boolean));
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    }
  }, [factoryAddress, getProviderAndSigner]);

  // Create new campaign
  const createCampaign = async (title, description, goal, deadlineDays, milestoneCount, githubRepo, imageUrl) => {
    const { signer } = await getProviderAndSigner();
    if (!signer) {
      toast.error("Connect wallet first!");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Creating campaign transaction...");
    try {
      const factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, signer);
      const goalWei = ethers.parseEther(goal);
      const deadlineTimestamp = Math.floor(Date.now() / 1000) + (deadlineDays * 86400);

      const tx = await factoryContract.createCampaign(
        title,
        description,
        goalWei,
        deadlineTimestamp,
        milestoneCount,
        githubRepo,
        imageUrl
      );
      
      toast.loading("Waiting for confirmation...", { id: toastId });
      await tx.wait();
      
      toast.success("Campaign created successfully!", { id: toastId });
      await fetchCampaigns();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Transaction failed.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Donate to Campaign
  const donate = async (campaignAddr, amount) => {
    const { signer } = await getProviderAndSigner();
    if (!signer) {
      toast.error("Connect wallet first!");
      return;
    }
    setLoading(true);
    const toastId = toast.loading("Sending donation...");
    try {
      const campaignContract = new ethers.Contract(campaignAddr, CAMPAIGN_ABI, signer);
      const value = ethers.parseEther(amount);
      const tx = await campaignContract.donate({ value });
      
      toast.loading("Confirming transaction...", { id: toastId });
      await tx.wait();
      
      toast.success("Thank you for your donation!", { id: toastId });
      await fetchCampaigns();
      if (account) await fetchReputation(account);
    } catch (err) {
      console.error(err);
      toast.error(err.reason || "Transaction failed.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchReputation(accounts[0]);
        } else {
          setAccount("");
          setReputation(0);
          setTier("Newcomer");
        }
      });
    }
  }, [fetchReputation]);

  // Initial loads
  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          await fetchReputation(accounts[0]);
        }
      }
    };
    init();
  }, [fetchReputation]);

  useEffect(() => {
    if (factoryAddress) {
      fetchCampaigns();
    }
  }, [factoryAddress, fetchCampaigns]);

  return (
    <Web3Context.Provider
      value={{
        account,
        reputation,
        tier,
        campaigns,
        loading,
        factoryAddress,
        setFactoryAddress,
        connectWallet,
        fetchCampaigns,
        createCampaign,
        donate,
        getProviderAndSigner,
        fetchReputation
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
