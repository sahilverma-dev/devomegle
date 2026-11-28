export const VIDEO_LAYOUTS = ["pip", "split", "call"] as const;

export type VideoLayout = (typeof VIDEO_LAYOUTS)[number];

export const VIDEO_LAYOUT_META: Record<
  VideoLayout,
  { label: string; hint: string }
> = {
  pip: { label: "Picture in picture", hint: "Them large, you in the corner" },
  split: { label: "Split 50/50", hint: "Both of you, equally sized" },
  call: { label: "Call view", hint: "Them large, you in a side pane" },
};

const LAYOUT_KEY = "devomegle.video-layout.v1";
const FLIPPED_KEY = "devomegle.video-flipped.v1";

const isVideoLayout = (value: unknown): value is VideoLayout =>
  typeof value === "string" &&
  (VIDEO_LAYOUTS as readonly string[]).includes(value);

export const readVideoLayout = (): VideoLayout => {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    return isVideoLayout(raw) ? raw : "pip";
  } catch {
    return "pip";
  }
};

export const writeVideoLayout = (layout: VideoLayout) => {
  try {
    window.localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    // A browser with storage disabled simply keeps the in-memory choice.
  }
};

export const readFlipped = (): boolean => {
  try {
    return window.localStorage.getItem(FLIPPED_KEY) === "true";
  } catch {
    return false;
  }
};

export const writeFlipped = (flipped: boolean) => {
  try {
    window.localStorage.setItem(FLIPPED_KEY, String(flipped));
  } catch {
    // Ignored for the same reason as above.
  }
};

export { isVideoLayout };
