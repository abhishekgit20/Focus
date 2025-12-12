import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, SkipForward, SkipBack } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Highly reliable, verified tracks only
const RELIABLE_TRACKS = [
  {
    name: "Shakuhachi Flute",
    src: "https://archive.org/download/bamboo-flute-music-for-relaxing-meditation-and-healing/Shakuhachi.mp3"
  },
  {
    name: "Om Chanting",
    src: "https://archive.org/download/OmChanting/OmChanting_vbr.mp3"
  },
  {
    name: "Gentle Rain",
    src: "https://archive.org/download/RainSound13/Gentle%20Rain%20and%20Thunder.mp3"
  },
  {
    name: "Forest Birds",
    src: "https://archive.org/download/various-bird-sounds/birds-in-forest-on-sunny-day-14444.mp3"
  },
  {
    name: "Bamboo Meditation",
    src: "https://archive.org/download/bamboo-flute-music-peace-calm-soft/Bamboo%20Flute%20-%20Meditation%20Music.mp3"
  }
];

export function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Select a random track on initial load
    const randomIndex = Math.floor(Math.random() * RELIABLE_TRACKS.length);
    setCurrentTrackIndex(randomIndex);
    setIsLoading(false);
  }, []);

  const currentTrack = RELIABLE_TRACKS[currentTrackIndex];

  useEffect(() => {
    if (!currentTrack) return;

    // Cleanup previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    const audio = new Audio(currentTrack.src);
    audio.loop = true;
    audio.volume = 0.5;
    audio.crossOrigin = "anonymous";
    
    // Error handling
    audio.addEventListener('error', (e) => {
      console.error("Audio error:", e);
      // Auto-skip to next track on error
      if (isPlaying) {
        handleNext();
      }
    });

    audioRef.current = audio;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Audio playback error:", e);
            setIsPlaying(false);
          }
        });
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [currentTrackIndex]); 

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % RELIABLE_TRACKS.length);
    setIsPlaying(true); // Auto-play next
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + RELIABLE_TRACKS.length) % RELIABLE_TRACKS.length);
    setIsPlaying(true); // Auto-play prev
  };

  if (isLoading) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-full border shadow-lg transition-all hover:bg-background/95">
      <TooltipProvider>
        
        {isPlaying && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handlePrev}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous Sound</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className={`rounded-full h-10 w-10 transition-all duration-500 ${
                isPlaying 
                  ? "bg-primary text-primary-foreground animate-pulse-slow" 
                  : "bg-muted text-muted-foreground hover:bg-primary/20"
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
          <TooltipContent side="top">
            <p>{isPlaying ? `Playing: ${currentTrack.name}` : "Play Meditation Music"}</p>
          </TooltipContent>
        </Tooltip>

        {isPlaying && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={handleNext}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next Sound</TooltipContent>
          </Tooltip>
        )}

      </TooltipProvider>
      
      {/* Track Name Display (only when playing) */}
      {isPlaying && (
        <span className="text-xs font-medium px-2 animate-in fade-in slide-in-from-left-2 truncate max-w-[100px]">
          {currentTrack.name}
        </span>
      )}

      {/* Visual Equalizer Effect when playing */}
      {isPlaying && (
        <div className="flex gap-0.5 h-3 items-end mx-1">
          <div className="w-1 bg-primary rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ animationDelay: "0s" }} />
          <div className="w-1 bg-primary rounded-full animate-[music-bar_1.2s_ease-in-out_infinite]" style={{ animationDelay: "0.2s" }} />
          <div className="w-1 bg-primary rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ animationDelay: "0.4s" }} />
        </div>
      )}
    </div>
  );
}
