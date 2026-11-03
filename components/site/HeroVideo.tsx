"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BlockData } from "@/lib/content/types";
import { Img, type Path } from "../edit/context";

type Connection = EventTarget & { saveData?: boolean };
type HeroVideoProps = { data: BlockData["hero"]; at: Path };
type VideoSources = BlockData["hero"]["video"];

const MOBILE_MEDIA = "(max-width: 960px)";
const REDUCED_MOTION_MEDIA = "(prefers-reduced-motion: reduce)";
const AV1_TYPE = 'video/webm; codecs="av01.0.08M.10"';
const VISIBILITY_THRESHOLD = 0.05;
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;
const PLAY_LABEL = "Play background video";
const PAUSE_LABEL = "Pause background video";
const PLAY_TEXT = "Play video";
const PAUSE_TEXT = "Pause video";
const RETRY_TEXT = "Retry video";

function mp4Source(sources: VideoSources) {
  return (window.matchMedia(MOBILE_MEDIA).matches && sources.mobileSrc) || sources.src;
}

function loadVideoSource(video: HTMLVideoElement, sources: VideoSources) {
  if (video.getAttribute("src")) return;
  const small = window.matchMedia(MOBILE_MEDIA).matches;
  const webm = (small && sources.mobileWebmSrc) || sources.webmSrc;
  video.src = webm && video.canPlayType(AV1_TYPE) ? webm : mp4Source(sources);
}

function playVideo(video: HTMLVideoElement, onFailure: () => void) {
  void video.play().catch((error: unknown) => {
    console.warn("Hero video playback could not start", error);
    onFailure();
  });
}

export function HeroVideo({ data, at }: HeroVideoProps) {
  const video = useRef<HTMLVideoElement>(null);
  const manualPause = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const sources = data.video;

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const motion = window.matchMedia(REDUCED_MOTION_MEDIA);
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    let visible = false;
    const sync = () => {
      if (motion.matches || connection?.saveData) {
        el.pause();
        if (el.hasAttribute("src")) {
          el.removeAttribute("src");
          el.load();
        }
        return;
      }
      if (!visible || document.hidden || manualPause.current) {
        el.pause();
        return;
      }
      loadVideoSource(el, sources);
      playVideo(el, () => setFailed(true));
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    }, { threshold: VISIBILITY_THRESHOLD });
    observer.observe(el);
    motion.addEventListener("change", sync);
    connection?.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", sync);
      connection?.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [sources]);

  const handleError = () => {
    const el = video.current;
    if (!el) return;
    if (el.currentSrc.endsWith(".webm")) {
      el.src = mp4Source(sources);
      playVideo(el, () => setFailed(true));
      return;
    }
    console.warn("Hero video could not load", el.error?.code);
    setFailed(true);
  };

  const togglePlayback = () => {
    const el = video.current;
    if (!el) return;
    manualPause.current = playing;
    if (playing) {
      el.pause();
      return;
    }
    if (el.error) {
      el.removeAttribute("src");
      el.load();
    }
    loadVideoSource(el, sources);
    playVideo(el, () => setFailed(true));
  };

  return (
    <div className="hero-media">
      <Img value={data.image} path={[...at, "image"]} className="hero-image" loading="eager" />
      <video
        ref={video}
        className="hero-video"
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        poster={data.image.src}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        onPlay={() => { setPlaying(true); setFailed(false); }}
        onPause={() => setPlaying(false)}
        onError={handleError}
      />
      <button
        type="button"
        className="hero-playback"
        aria-label={playing ? PAUSE_LABEL : PLAY_LABEL}
        onClick={togglePlayback}
      >
        {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        <span>{playing ? PAUSE_TEXT : failed ? RETRY_TEXT : PLAY_TEXT}</span>
      </button>
    </div>
  );
}
