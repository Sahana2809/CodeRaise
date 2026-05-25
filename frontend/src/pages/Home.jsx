import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import CampaignCard from "../components/CampaignCard";

export default function Home() {
  const { campaigns, loading } = useWeb3();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("all");

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterState === "all") return matchesSearch;
    if (filterState === "fundraising") return matchesSearch && campaign.state === 0;
    if (filterState === "milestones") return matchesSearch && campaign.state === 3;
    if (filterState === "completed") return matchesSearch && campaign.state === 4;
    return matchesSearch;
  });

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 md:p-12 mb-8">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 max-w-2xl">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider mb-4 inline-block">
            Escrow-gated Crowdfunding
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
            Fund the Future of <br/>
            <span className="text-gradient">Open Source Software</span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg mb-6">
            CodeRaise uses smart contracts to protect donors. Funds are locked in escrow and only released to creators as they complete pre-defined milestones verified by contributors.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
        {/* Search */}
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full glass-input rounded-xl px-4 py-3 pl-11 text-sm placeholder-gray-500"
          />
          <svg className="w-5 h-5 text-gray-500 absolute left-4 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* State Filter Buttons */}
        <div className="flex bg-slate-950/60 p-1.5 rounded-xl border border-slate-900 overflow-x-auto max-w-full">
          {["all", "fundraising", "milestones", "completed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterState(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap cursor-pointer ${
                filterState === tab
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading && campaigns.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card rounded-2xl h-96 animate-pulse border border-slate-800/40"></div>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl border border-slate-800/40">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-white font-bold text-lg mb-1">No campaigns found</h3>
          <p className="text-gray-400 text-sm">Try tweaking your search or filter settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.address} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
