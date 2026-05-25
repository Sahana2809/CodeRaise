import React, { useState } from "react";
import { useWeb3 } from "../context/Web3Context";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateCampaign() {
  const { createCampaign, account, connectWallet } = useWeb3();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    goal: "",
    duration: "30",
    milestoneCount: "3",
    githubRepo: "",
    imageUrl: ""
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      toast.error("Please connect your wallet first!");
      return;
    }
    if (!form.title || !form.description || !form.goal || !form.githubRepo) {
      toast.error("Please fill all required fields!");
      return;
    }

    setSubmitting(true);
    try {
      await createCampaign(
        form.title,
        form.description,
        form.goal,
        Number(form.duration),
        Number(form.milestoneCount),
        form.githubRepo,
        form.imageUrl
      );
      navigate("/");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex-1">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800">
        <h2 className="text-2xl font-extrabold text-white mb-2">Launch a Campaign</h2>
        <p className="text-gray-400 text-sm mb-6">Define your goals, link your repository, and structure your milestones to invite backing.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Campaign Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. CodeRaise Escrow Protocol"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Description *</label>
            <textarea
              required
              rows={4}
              placeholder="Describe your open source project, technology stack, and what the funds will be used for..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm resize-none"
            />
          </div>

          {/* Goal & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Funding Goal (ETH) *</label>
              <input
                type="number"
                step="0.001"
                required
                placeholder="e.g. 2.5"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Duration (Days) *</label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm"
              >
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
                <option value="60">60 Days</option>
              </select>
            </div>
          </div>

          {/* Milestone Count & GitHub Repo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Milestone Count *</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={form.milestoneCount}
                onChange={(e) => setForm({ ...form, milestoneCount: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">GitHub Repo URL *</label>
              <input
                type="url"
                required
                placeholder="https://github.com/user/repo"
                value={form.githubRepo}
                onChange={(e) => setForm({ ...form, githubRepo: e.target.value })}
                className="w-full glass-input rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Image URL</label>
            <input
              type="url"
              placeholder="https://example.com/banner.png"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="w-full glass-input rounded-xl px-4 py-3 text-sm"
            />
          </div>

          {/* Submit */}
          <div className="pt-4">
            {account ? (
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-98 transition text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center space-x-2"
              >
                {submitting ? "Processing..." : "Deploy Campaign Contract"}
              </button>
            ) : (
              <button
                type="button"
                onClick={connectWallet}
                className="w-full py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-gray-300 font-bold rounded-xl cursor-pointer"
              >
                Connect Wallet to Launch Campaign
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
