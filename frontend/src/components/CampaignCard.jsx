import React from "react";
import { Link } from "react-router-dom";

export default function CampaignCard({ campaign }) {
  const {
    address,
    title,
    description,
    goalAmount,
    totalRaised,
    deadline,
    imageUrl,
    state,
    githubRepo,
    totalContributors
  } = campaign;

  // Calculate progress percent
  const raisedNum = parseFloat(totalRaised);
  const goalNum = parseFloat(goalAmount);
  const progressPercent = Math.min(Math.round((raisedNum / goalNum) * 100), 100);

  // States description mapping
  const stateLabels = ["Fundraising", "Successful", "Expired", "Milestones", "Completed", "Refunding"];
  const stateColors = [
    "bg-blue-500/10 text-blue-400 border border-blue-500/20",       // Fundraising
    "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20", // Successful
    "bg-rose-500/10 text-rose-400 border border-rose-500/20",       // Expired
    "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20", // MilestonePhase
    "bg-purple-500/10 text-purple-400 border border-purple-500/20", // Completed
    "bg-amber-500/10 text-amber-400 border border-amber-500/20"     // Refunding
  ];

  // Calculate days remaining
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = deadline - now;
  const daysLeft = Math.max(0, Math.ceil(timeLeft / 86400));

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-full border border-slate-800">
      {/* Campaign Image */}
      <div className="relative h-44 overflow-hidden bg-slate-900">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover transition duration-500 hover:scale-105"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600";
          }}
        />
        {/* Status Badge */}
        <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${stateColors[state] || stateColors[0]}`}>
          {stateLabels[state] || "Unknown"}
        </span>
      </div>

      {/* Campaign Details */}
      <div className="p-5 flex-grow flex flex-col">
        {/* Title */}
        <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">{title}</h3>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{description}</p>

        {/* GitHub Badge */}
        {githubRepo && (
          <div className="flex items-center space-x-1.5 mb-4 text-xs text-gray-300 bg-slate-950/60 w-fit px-2.5 py-1 rounded-lg border border-slate-800">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="font-mono">{githubRepo.replace("https://github.com/", "")}</span>
          </div>
        )}

        <div className="mt-auto space-y-4">
          {/* Progress Section */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-indigo-400 font-bold">{progressPercent}% Funded</span>
              <span className="text-gray-400">{totalRaised} / {goalAmount} ETH</span>
            </div>
            <div className="w-full bg-slate-950/60 rounded-full h-2 overflow-hidden border border-slate-900">
              <div
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Contributors & Time Left */}
          <div className="flex justify-between items-center text-xs text-gray-400 pt-3 border-t border-slate-900/60">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{totalContributors} backer{totalContributors !== 1 && "s"}</span>
            </div>
            <div>
              {state === 0 ? (
                <span className="font-bold text-gray-300">{daysLeft} days left</span>
              ) : (
                <span className="text-gray-500">Ended</span>
              )}
            </div>
          </div>

          {/* View Details Button */}
          <Link
            to={`/campaign/${address}`}
            className="w-full py-2.5 bg-indigo-950/40 hover:bg-indigo-900/40 active:scale-98 transition text-indigo-300 hover:text-indigo-200 border border-indigo-900/40 hover:border-indigo-800/60 text-sm font-semibold rounded-xl flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>View Campaign</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
