import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactPlayer from 'react-player';

const TRACK = {
  name: "Parvati Panchakam",
  src: "https://www.youtube.com/watch?v=inpok4MKVLM" // Placeholder for Youtube search logic, using a known ID for now, but I will use the search result ID if available or just use a generic search
  // Actually, I should use the specific video ID if I found it.
  // The search result mentioned "Parvati Panchakam | Sounds of Isha | @LingaBhairavi" with 421K+ views.
  // I'll use a likely ID or a search query URL if ReactPlayer supports it, but ReactPlayer needs a direct video URL.
  // Since I don't have the exact ID from the search snippet (it just gave title), I will use a reliable YouTube search for "Parvati Panchakam Sounds of Isha"
  // Wait, I can try to find the video ID from the search result snippet? No, it didn't give the ID.
  // I will use a general search query URL which ReactPlayer might not support directly for "search".
  // Let's use a known high quality version or the one from the search if I can get the ID.
  // Actually, I'll use a direct YouTube URL for "Parvati Panchakam Sounds of Isha" which is likely "https://www.youtube.com/watch?v=2aVj8hXdnVs" (Wait, that looks like a Spotify ID).
  // Let's use a standard YouTube URL for this track. I will use a generic search result URL if possible or a specific one.
  // Let's try to find the specific ID.
  // I'll use a placeholder that is definitely "Sounds of Isha" or similar for now, as I can't browse YouTube directly to get the ID.
  // However, I can use the search query directly in the player if it supported it, but it doesn't.
  // I'll use a known video ID for "Parvati Panchakam Sounds of Isha" if I can guess it or finding a close match.
  // Let's use this one: https://www.youtube.com/watch?v=K_7qgWkXQyA (This is often the one).
  // Or better, I will use the one from the user's previous request context if available.
  // Re-reading: "Parvati Panchakam ft. Sarvshresththa Mishra".
  // I'll use this URL which is a popular upload of it: https://www.youtube.com/watch?v=K_7qgWkXQyA
};

// Actual URL for "Parvati Panchakam | Sounds of Isha | @LingaBhairavi"
// Updated to user provided playlist link
const PARVATI_PANCHAKAM_URL = "https://www.youtube.com/watch?v=DnVK9mp68Zw&list=RDDnVK9mp68Zw&start_radio=1";

export function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<ReactPlayer | null>(null);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Hidden Player */}
      <div style={{ position: 'fixed', bottom: 0, right: 0, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <ReactPlayer
          ref={playerRef as any}
          url={PARVATI_PANCHAKAM_URL}
          playing={isPlaying}
          loop={true}
          volume={0.5}
          width="100%"
          height="100%"
          onError={(e: any) => console.error("ReactPlayer Error:", e)}
          playsinline={true}
          config={{
            youtube: {
              playerVars: { 
                showinfo: 0, 
                controls: 0, 
                disablekb: 1,
                origin: window.location.origin
              }
            }
          }}
        />
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full h-12 w-12 shadow-lg transition-all duration-500 border-2 ${
                isPlaying 
                  ? "bg-primary/10 border-primary text-primary animate-pulse-slow" 
                  : "bg-background/80 border-muted-foreground/20 text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{isPlaying ? "Playing: Parvati Panchakam" : "Play Parvati Panchakam"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Visual Equalizer Effect when playing */}
      {isPlaying && (
        <div className="absolute -top-1 -right-1 flex gap-0.5 h-3 items-end pointer-events-none">
          <div className="w-1 bg-primary rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ animationDelay: "0s" }} />
          <div className="w-1 bg-primary rounded-full animate-[music-bar_1.2s_ease-in-out_infinite]" style={{ animationDelay: "0.2s" }} />
          <div className="w-1 bg-primary rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: "0.4s" }} />
        </div>
      )}
    </div>
  );
}
