import React from "react";
import { useWeb3 } from "../context/Web3Context";
import { Link } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

export default function Dashboard() {
  const { account, campaigns, reputation, tier } = useWeb3();

  // Filter campaigns
  const myCreatedCampaigns = campaigns.filter(
    (c) => account && c.creator.toLowerCase() === account.toLowerCase()
  );

  // For this mock representation, let's build some simple chart data from user's created campaigns
  const chartData = myCreatedCampaigns.map((c, i) => ({
    name: `Campaign ${i + 1}`,
    Raised: parseFloat(c.totalRaised),
    Goal: parseFloat(c.goalAmount)
  }));

  // Standard metrics
  const totalRaisedByMe = myCreatedCampaigns.reduce((sum, c) => sum + parseFloat(c.totalRaised), 0);
  const totalCampaigns = myCreatedCampaigns.length;

  return (
    <div className="flex-1 space-y-8">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Creator Hub</h2>
          <p className="text-gray-400 text-sm">Track your reputation, check campaign metrics, and manage milestone disbursements.</p>
        </div>

        {/* Reputation Score Card */}
        <div className="flex items-center space-x-4 bg-indigo-950/20 border border-indigo-900/30 px-5 py-3.5 rounded-2xl">
          <div className="text-center">
            <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Reputation</span>
            <span className="text-2xl font-extrabold text-white">{reputation} PTS</span>
          </div>
          <div className="h-8 w-[1px] bg-indigo-900/30"></div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Rank Tier</span>
            <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-300 block uppercase tracking-wide mt-0.5">
              {tier}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Total Launched</span>
          <span className="text-3xl font-extrabold text-white">{totalCampaigns}</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Total ETH Raised</span>
          <span className="text-3xl font-extrabold text-indigo-400">{totalRaisedByMe.toFixed(3)} ETH</span>
        </div>
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block mb-1">Wallet Address</span>
          <span className="text-sm font-mono text-gray-400 truncate block mt-2">
            {account ? account : "Not Connected"}
          </span>
        </div>
      </div>

      {/* Analytics Chart */}
      {myCreatedCampaigns.length > 0 && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-6">Funding Performance</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRaised" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="Raised" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRaised)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4">Your Campaigns</h3>
        
        {myCreatedCampaigns.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 text-sm mb-4">You have not launched any campaigns yet.</p>
            <Link
              to="/create"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl"
            >
              Launch First Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase text-gray-500 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Goal</th>
                  <th className="py-3 px-4">Raised</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {myCreatedCampaigns.map((c) => {
                  const stateLabels = ["Fundraising", "Successful", "Expired", "Milestones", "Completed", "Refunding"];
                  return (
                    <tr key={c.address} className="hover:bg-slate-900/40">
                      <td className="py-4 px-4 font-semibold text-white">{c.title}</td>
                      <td className="py-4 px-4">{c.goalAmount} ETH</td>
                      <td className="py-4 px-4 text-indigo-400 font-bold">{c.totalRaised} ETH</td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                          {stateLabels[c.state]}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          to={`/campaign/${c.address}`}
                          className="text-xs text-indigo-400 hover:underline font-bold"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
