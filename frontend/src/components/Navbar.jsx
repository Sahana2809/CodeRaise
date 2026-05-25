import React from "react";
import { useWeb3 } from "../context/Web3Context";

export default function Navbar() {
  const { account, connectWallet, reputation, tier, loading } = useWeb3();

  return (
    <nav className="glass-panel sticky top-0 z-50 flex items-center justify-between px-6 py-4 mb-8">
      {/* Logo */}
      <div className="flex items-center space-x-3">
        <div className="bg-indigo-600/20 p-2.5 rounded-xl border border-indigo-500/30">
          <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div>
          <span className="font-extrabold text-xl tracking-tight text-white">Code<span className="text-indigo-400">Raise</span></span>
          <span className="block text-[10px] text-gray-400 tracking-wider uppercase font-medium">Web3 Open Source Escrow</span>
        </div>
      </div>

      {/* Wallet / Reputation Section */}
      <div className="flex items-center space-x-4">
        {account && (
          <div className="hidden sm:flex items-center space-x-3 bg-indigo-950/40 border border-indigo-900/40 rounded-xl px-4 py-2 text-sm">
            <span className="text-gray-400">Reputation:</span>
            <span className="font-bold text-indigo-300">{reputation} PTS</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
              {tier}
            </span>
          </div>
        )}

        {account ? (
          <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-mono text-gray-300">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </span>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition text-white font-semibold text-sm rounded-xl border border-indigo-400/20 shadow-lg shadow-indigo-600/20 flex items-center space-x-2 cursor-pointer"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            )}
            <span>Connect Wallet</span>
          </button>
        )}
      </div>
    </nav>
  );
}
