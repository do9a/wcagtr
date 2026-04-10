import { WcagtrNav } from "@/components/ui/wcagtr-nav";
import { WcagtrHero } from "@/components/ui/wcagtr-hero";
import { WcagtrFeatures } from "@/components/ui/wcagtr-features";
import { WcagtrHow } from "@/components/ui/wcagtr-how";
import { WcagtrPanelCta } from "@/components/ui/wcagtr-panel-cta";
import { WcagtrFooter } from "@/components/ui/wcagtr-footer";

export default function Home() {
  return (
    <>
      <WcagtrNav />
      <main id="main-content" tabIndex={-1}>
        <WcagtrHero />
        <WcagtrFeatures />
        <WcagtrHow />
        <WcagtrPanelCta />
      </main>
      <WcagtrFooter />
    </>
  );
}
