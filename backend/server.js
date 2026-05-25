const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// GitHub API Headers setup
const getGithubHeaders = () => {
  const headers = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
};

// Route: Get recent commits for a repository
app.get("/api/github/commits", async (req, res) => {
  const { owner, repo } = req.query;

  if (!owner || !repo) {
    return res.status(400).json({ error: "Missing 'owner' or 'repo' query parameters." });
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`;
    const response = await axios.get(url, { headers: getGithubHeaders() });
    
    const commits = response.data.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
      html_url: c.html_url
    }));

    res.json({ commits });
  } catch (error) {
    console.error("GitHub API error:", error.message);
    res.status(error.response?.status || 500).json({
      error: "Failed to fetch commits from GitHub.",
      details: error.response?.data?.message || error.message
    });
  }
});

// Route: Verify a specific commit exists and is part of the repo
app.get("/api/github/verify-commit", async (req, res) => {
  const { owner, repo, sha } = req.query;

  if (!owner || !repo || !sha) {
    return res.status(400).json({ error: "Missing required query parameters: owner, repo, sha." });
  }

  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
    const response = await axios.get(url, { headers: getGithubHeaders() });

    res.json({
      verified: true,
      commit: {
        sha: response.data.sha,
        message: response.data.commit.message,
        author: response.data.commit.author.name,
        date: response.data.commit.author.date,
        html_url: response.data.html_url
      }
    });
  } catch (error) {
    console.error("GitHub verification error:", error.message);
    res.status(error.response?.status || 500).json({
      verified: false,
      error: "Commit could not be verified on GitHub.",
      details: error.response?.data?.message || error.message
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 CodeRaise Backend running on port ${PORT}`);
});
