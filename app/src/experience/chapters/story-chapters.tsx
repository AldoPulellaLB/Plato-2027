// The 14 storyboard frames in four chapters: the home page journey.
// #story > #bean (f01 to f04), #pour (f05, the film f06 to f08, f09),
// #brand (f10 to f12), #menu (f13, f14). Chapter ids are the header's anchors.
import { useEffect } from "react";

import { resetStory, story } from "@/experience/story";
import { ensureGsap } from "@/lib/motion/smooth";

import { BeanChapter } from "./bean/bean-chapter";
import { BrandChapter } from "./brand/brand-chapter";
import { MenuChapter } from "./menu/menu-chapter";
import { PourChapter } from "./pour/pour-chapter";
import "./chapters.css";

export function StoryChapters() {
  // Whole-story progress and scroll velocity for the header line and the GL layer.
  useEffect(() => {
    const el = document.getElementById("story");
    if (!el) return;
    const { gsap, ScrollTrigger } = ensureGsap();
    let target = 0;
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        story.total = self.progress;
        target = self.getVelocity();
      },
      onRefresh: (self) => {
        story.total = self.progress;
      },
    });
    // Smoothed velocity that settles back to rest when scrolling stops.
    const settle = () => {
      story.velocity += (target - story.velocity) * 0.18;
      target *= 0.86;
      if (Math.abs(story.velocity) < 0.5 && Math.abs(target) < 0.5) story.velocity = 0;
    };
    gsap.ticker.add(settle);
    // Late images and fonts shift layout once; re-measure every trigger after they land.
    const refresh = () => ScrollTrigger.refresh();
    if (document.readyState === "complete") window.setTimeout(refresh, 60);
    else window.addEventListener("load", refresh, { once: true });
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      st.kill();
      gsap.ticker.remove(settle);
      window.removeEventListener("load", refresh);
      resetStory();
    };
  }, []);

  return (
    <div className="ch-story" id="story">
      <BeanChapter />
      <PourChapter />
      <BrandChapter />
      <MenuChapter />
    </div>
  );
}
