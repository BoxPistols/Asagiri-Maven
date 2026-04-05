import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = "Asagiri-Maven";

const nextConfig: NextConfig = {
  // Static export for GitHub Pages
  output: "export",
  // Add trailing slash for correct routing on GitHub Pages
  trailingSlash: true,
  // Disable image optimization (not supported in static export)
  images: { unoptimized: true },
  // Set base path for GitHub Pages deployment (username.github.io/repo-name)
  basePath: isGithubPages ? `/${repoName}` : "",
  assetPrefix: isGithubPages ? `/${repoName}/` : "",
};

export default nextConfig;
