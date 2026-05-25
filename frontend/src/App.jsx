import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignDetails from "./pages/CampaignDetails";
import Dashboard from "./pages/Dashboard";
import { Web3Provider } from "./context/Web3Context";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen bg-[#0b0f19] flex flex-col font-sans">
          {/* Main Layout Container */}
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-grow flex flex-col pb-12">
            <Navbar />
            
            <div className="flex flex-1 items-start">
              <Sidebar />
              
              {/* Content Area */}
              <main className="flex-1 min-w-0">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/create" element={<CreateCampaign />} />
                  <Route path="/campaign/:id" element={<CampaignDetails />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
              </main>
            </div>
          </div>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#161e31",
              color: "#fff",
              border: "1px solid rgba(255, 255, 255, 0.05)"
            }
          }}
        />
      </Router>
    </Web3Provider>
  );
}
