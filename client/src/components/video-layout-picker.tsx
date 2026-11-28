import { LayoutGrid } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  VIDEO_LAYOUTS,
  VIDEO_LAYOUT_META,
  isVideoLayout,
  type VideoLayout,
} from "@/lib/video-layout";

const LayoutPreview = ({ layout }: { layout: VideoLayout }) => {
  if (layout === "split") {
    return (
      <span className="ml-auto grid h-7 w-10 shrink-0 grid-cols-2 gap-[2px] rounded-[4px] border border-white/10 bg-black/40 p-[3px]">
        <span className="rounded-[2px] bg-white/20" />
        <span className="rounded-[2px] bg-white/20" />
      </span>
    );
  }

  if (layout === "call") {
    return (
      <span className="ml-auto grid h-7 w-10 shrink-0 grid-cols-[1.7fr_1fr] gap-[2px] rounded-[4px] border border-white/10 bg-black/40 p-[3px]">
        <span className="rounded-[2px] bg-white/20" />
        <span className="rounded-[2px] bg-white/[0.09]" />
      </span>
    );
  }

  return (
    <span className="relative ml-auto h-7 w-10 shrink-0 overflow-hidden rounded-[4px] border border-white/10 bg-black/40 p-[3px]">
      <span className="block h-full w-full rounded-[2px] bg-white/20" />
      <span className="absolute bottom-[5px] right-[5px] h-2 w-2.5 rounded-[1px] border border-white/30 bg-white/40" />
    </span>
  );
};

interface Props {
  value: VideoLayout;
  onChange: (layout: VideoLayout) => void;
}

const VideoLayoutPicker = ({ value, onChange }: Props) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        aria-label="Change video layout"
        className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="w-64">
      <DropdownMenuLabel>Video layout</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={value}
        onValueChange={(next) => {
          if (isVideoLayout(next)) onChange(next);
        }}
      >
        {VIDEO_LAYOUTS.map((layout) => {
          const meta = VIDEO_LAYOUT_META[layout];
          return (
            <DropdownMenuRadioItem
              key={layout}
              value={layout}
              className="items-center gap-2.5 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] leading-tight">
                  {meta.label}
                </span>
                <span className="mt-0.5 block truncate text-[11px] leading-tight text-faint">
                  {meta.hint}
                </span>
              </span>
              <LayoutPreview layout={layout} />
            </DropdownMenuRadioItem>
          );
        })}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default VideoLayoutPicker;
