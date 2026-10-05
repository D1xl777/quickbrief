import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Creative images are uploaded through server actions. 4 MB files + form
    // overhead. (Vercel functions accept request bodies up to ~4.5 MB.)
    serverActions: { bodySizeLimit: "5mb" },
  },
  // @react-pdf/renderer is used server-side for approval record PDFs.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
