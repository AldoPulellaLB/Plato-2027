import { createFileRoute } from "@tanstack/react-router";

import { StoryChapters } from "@/experience/chapters/story-chapters";
import { StoryCanvas } from "@/experience/gl/story-canvas";
import { HomeAcademy, HomeEquipment, HomeShop, HomeVoices } from "@/experience/sections";

export const Route = createFileRoute("/")({
  // The home page inherits the site's page metadata from the root route.
  component: Index,
});

// The page IS the journey: a persistent WebGL layer behind fourteen storyboard
// frames (four chapters), then the shop, equipment, academy and testimonials.
function Index() {
  return (
    <main id="main" className="home">
      <StoryCanvas />
      <StoryChapters />
      <HomeShop />
      <HomeEquipment />
      <HomeAcademy />
      <HomeVoices />
    </main>
  );
}
