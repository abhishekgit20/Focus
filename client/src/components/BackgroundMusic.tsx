import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MEDITATION_TRACKS = [
  {
    name: "Bamboo Flute",
    src: "https://archive.org/download/bamboo-flute-music-for-relaxing-meditation-and-healing/Shakuhachi.mp3",
    fallback: "https://archive.org/download/bamboo-flute-music-peace-calm-soft/Bamboo%20Flute%20-%20Relaxing%20Music.mp3"
  },
  {
    name: "Om Chanting",
    src: "https://archive.org/download/OmChanting/OmChanting_vbr.mp3",
    fallback: null
  },
  {
    name: "Gentle Rain",
    src: "https://archive.org/download/RainSound13/Gentle%20Rain%20and%20Thunder.mp3",
    fallback: null
  },
  {
    name: "Forest Birds",
    src: "https://archive.org/download/various-bird-sounds/birds-in-forest-on-sunny-day-14444.mp3",
    fallback: null
  },
  {
    name: "Deep Meditation",
    src: "https://archive.org/download/bamboo-flute-music-for-relaxing-meditation-and-healing/Bamboo%20Flute%20Meditation%20%26%20Relaxation%20Music%20-.mp3",
    fallback: null
  }
];

export function BackgroundMusic() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(MEDITATION_TRACKS[0]);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Select a random track on component mount (page load)
    const randomTrack = MEDITATION_TRACKS[Math.floor(Math.random() * MEDITATION_TRACKS.length)];
    setCurrentTrack(randomTrack);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!currentTrack) return;

    // cleanup previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(currentTrack.src);
    audio.loop = true;
    audio.volume = 0.5;
    audio.crossOrigin = "anonymous";
    
    // Add event listeners for error handling
    audio.addEventListener('error', (e) => {
      console.error("Audio error:", e);
      if (currentTrack.fallback && audio.src === currentTrack.src) {
        console.log("Switching to fallback audio source...");
        audio.src = currentTrack.fallback;
        if (isPlaying) audio.play().catch(console.error);
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
        audioRef.current = null;
      }
    };
  }, [currentTrack]); // Re-run when random track is set

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

  if (isLoading) return null;

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
            <p>{isPlaying ? `Playing: ${currentTrack.name}` : "Play Meditation Music"}</p>
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
