import { HomepageRefresh } from "@/components/marketing/homepage-refresh";

export const revalidate = 300; // ISR — regenerate every 5 minutes

export default function MarketingHomePage() {
  return <HomepageRefresh />;
}
