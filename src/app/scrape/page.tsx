import ProfileScraper from "@/components/Scraper/Scraper";
import AuthGuard from "@/components/AuthGuard";

const ScrapePage = () => {
  return (
    <AuthGuard>
      <ProfileScraper />
    </AuthGuard>
  );
}

export default ScrapePage;
