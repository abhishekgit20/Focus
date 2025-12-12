import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Using a direct MP3 link from Archive.org
    audioRef.current = new Audio("https://archive.org/download/bamboo-flute-music-peace-calm-soft/Bamboo%20Flute%20-%20Meditation%20Music.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5; // Start at 50% volume

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
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
            <p>{isPlaying ? "Pause Flute" : "Play Peaceful Flute"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Visual Equalizer Effect when playing */}
      {isPlaying && (
        <div className="absolute -top-1 -right-1 flex gap-0.5 h-3 items-end">
          <div className="w-1 bg-primary rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ animationDelay: "0s" }} />
          <div className="w-1 bg-primary rounded-full animate-[music-bar_1.2s_ease-in-out_infinite]" style={{ animationDelay: "0.2s" }} />
          <div className="w-1 bg-primary rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: "0.4s" }} />
        </div>
      )}
    </div>
  );
}
