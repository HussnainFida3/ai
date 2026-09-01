import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://picsum.photos/**"), new URL("https://res.cloudinary.com/**")],
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/admin/v2/dashboard", permanent: false },
      { source: "/admin/dashboard", destination: "/admin/v2/dashboard", permanent: false },
      { source: "/admin/users", destination: "/admin/v2/users", permanent: false },
      { source: "/admin/vendors", destination: "/admin/v2/providers", permanent: false },
      { source: "/admin/providers", destination: "/admin/v2/providers", permanent: false },
      { source: "/admin/bookings", destination: "/admin/v2/bookings", permanent: false },
      { source: "/admin/orders", destination: "/admin/v2/bookings", permanent: false },
      { source: "/admin/emergency", destination: "/admin/v2/bookings", permanent: false },
      { source: "/admin/categories", destination: "/admin/v2/services", permanent: false },
      { source: "/admin/zones", destination: "/admin/v2/services", permanent: false },
      { source: "/admin/reviews", destination: "/admin/v2/reviews", permanent: false },
      { source: "/admin/promo", destination: "/admin/v2/marketing", permanent: false },
      { source: "/admin/bills", destination: "/admin/v2/wallet", permanent: false },
      { source: "/admin/reports", destination: "/admin/v2/analytics", permanent: false },
      { source: "/admin/ai-usage", destination: "/admin/v2/system", permanent: false },
      { source: "/admin/audit-logs", destination: "/admin/v2/system", permanent: false },
      { source: "/admin/admin-users", destination: "/admin/v2/system", permanent: false },
      { source: "/admin/system-health", destination: "/admin/v2/system", permanent: false },
      { source: "/admin/settings", destination: "/admin/v2/system", permanent: false },
    ];
  },
};

export default nextConfig;
