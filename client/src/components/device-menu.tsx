import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Mic, RefreshCw, Settings2, Video } from "lucide-react";
import { toast } from "sonner";

import { useWebRTC } from "@/hooks";
import { cn } from "@/lib/utils";

const DEVICE_KINDS = ["audioinput", "videoinput"] as const;

const DeviceSelect = ({
  label,
  icon,
  devices,
  value,
  disabled,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  devices: MediaDeviceInfo[];
  value: string;
  disabled: boolean;
  onChange: (deviceId: string) => void;
}) => (
  <label className="block">
    <span className="mb-1.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
      {icon}
      {label}
    </span>
    <span className="relative block">
      <select
        value={value}
        disabled={disabled || devices.length === 0}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 w-full appearance-none truncate rounded-lg border border-white/10 bg-black/40 px-2.5 pr-8 text-[13px] text-foreground shadow-recessed",
          "transition-colors focus-visible:border-signal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/15",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {devices.length === 0 ? (
          <option value="">No device found</option>
        ) : (
          devices.map((device, index) => (
            <option key={device.deviceId || index} value={device.deviceId}>
              {device.label || `${label} ${index + 1}`}
            </option>
          ))
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
    </span>
  </label>
);

/**
 * Camera and microphone picker. Device labels only become readable once the
 * call has mic/camera permission, which is exactly when this menu is visible.
 */
const DeviceMenu = ({ className }: { className?: string }) => {
  const { localStream, selectDevice } = useWebRTC();
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((device) => DEVICE_KINDS.includes(device.kind as (typeof DEVICE_KINDS)[number])));
    } catch {
      // Enumeration is best effort; the menu still shows what it has.
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    void refresh();

    const handleChange = () => void refresh();
    navigator.mediaDevices.addEventListener("devicechange", handleChange);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", handleChange);
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const cameras = devices.filter((device) => device.kind === "videoinput");
  const microphones = devices.filter((device) => device.kind === "audioinput");

  const activeCameraId =
    localStream?.getVideoTracks()[0]?.getSettings().deviceId ?? "";
  const activeMicrophoneId =
    localStream?.getAudioTracks()[0]?.getSettings().deviceId ?? "";

  const cameraValue = cameras.some((d) => d.deviceId === activeCameraId)
    ? activeCameraId
    : cameras[0]?.deviceId ?? "";
  const microphoneValue = microphones.some(
    (d) => d.deviceId === activeMicrophoneId
  )
    ? activeMicrophoneId
    : microphones[0]?.deviceId ?? "";

  const choose = async (kind: "audio" | "video", deviceId: string) => {
    if (!deviceId || busy) return;

    setBusy(true);
    try {
      const switched = await selectDevice(kind, deviceId);
      if (!switched) toast.error("Could not switch to that device");
    } catch {
      toast.error("That device is not available right now");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Camera and microphone"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          open && "border-white/[0.14] bg-white/[0.08] text-foreground"
        )}
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Camera and microphone"
          className={cn(
            "fixed right-3 top-[4.5rem] z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-white/10 bg-popover p-3 shadow-float",
            "sm:absolute sm:right-0 sm:top-[calc(100%+10px)] sm:w-72"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              devices
            </span>
            <button
              type="button"
              onClick={() => void refresh()}
              aria-label="Refresh devices"
              className="grid h-6 w-6 place-items-center rounded-md text-faint transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-3 space-y-3">
            <DeviceSelect
              label="camera"
              icon={<Video className="h-3 w-3" />}
              devices={cameras}
              value={cameraValue}
              disabled={busy}
              onChange={(deviceId) => void choose("video", deviceId)}
            />
            <DeviceSelect
              label="microphone"
              icon={<Mic className="h-3 w-3" />}
              devices={microphones}
              value={microphoneValue}
              disabled={busy}
              onChange={(deviceId) => void choose("audio", deviceId)}
            />
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            Switching happens inside the call. The new device is used right
            away.
          </p>
        </div>
      )}
    </div>
  );
};

export default DeviceMenu;
