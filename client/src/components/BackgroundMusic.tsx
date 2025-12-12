import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Base URLs for Archive.org collections
const COL1_BASE = "https://archive.org/download/va-deep-meditation-50-tracks-healing-sounds-of-nature-2016/";
const COL2_BASE = "https://archive.org/download/RelaxingSpaMusicCalmingMusicRelaxationMusicMeditationMusicInstrumentalMusic689/";
const COL3_BASE = "https://archive.org/download/nature-sounds_202104/";

const MEDITATION_TRACKS = [
  // Collection 1: Deep Meditation 50 Tracks
  { name: "Deep Meditation (Morning Birds)", src: COL1_BASE + "01.%20Rebirth%20Yoga%20Music%20Academy%20-%20Deep%20Meditation%20%28Morning%20Birds%2C%20Waterfall%29.mp3" },
  { name: "Yoga Infinity Journey", src: COL1_BASE + "02.%20Calming%20Music%20Sanctuary%20-%20Yoga%20Infinity%20Journey.mp3" },
  { name: "Bali Spa Massage", src: COL1_BASE + "03.%20Om%20Meditation%20Music%20Academy%20-%20Bali%20Spa%20%28Music%20for%20Massage%29.mp3" },
  { name: "Zen Stress Reduction", src: COL1_BASE + "04.%20Healing%20Meditation%20Zone%20-%20Relaxing%20Zen%20Music%20for%20Reduce%20Stress.mp3" },
  { name: "Soft Music to Relax", src: COL1_BASE + "05.%20Serenity%20Music%20Relaxation%20-%20Soft%20Music%20to%20Relax.mp3" },
  { name: "Summer Reiki Music", src: COL1_BASE + "06.%20Rebirth%20Yoga%20Music%20Academy%20-%20Summer%20Reiki%20Music.mp3" },
  { name: "Spa Weekends", src: COL1_BASE + "07.%20Calming%20Music%20Sanctuary%20-%20Spa%20Weekends.mp3" },
  { name: "Healing Power of Water", src: COL1_BASE + "08.%20Om%20Meditation%20Music%20Academy%20-%20Healing%20Power%20of%20Water.mp3" },
  { name: "Mindfulness Meditation", src: COL1_BASE + "09.%20Healing%20Meditation%20Zone%20-%20Mindfulness%20Meditation.mp3" },
  { name: "Peaceful Insomnia Cure", src: COL1_BASE + "10.%20Serenity%20Music%20Relaxation%20-%20Peaceful%20Music%20Insomnia%20Cure.mp3" },
  { name: "Restorative Yoga", src: COL1_BASE + "11.%20Rebirth%20Yoga%20Music%20Academy%20-%20Deeply%20Restorative%20Yoga%20Meditation.mp3" },
  { name: "Perfect Harmony", src: COL1_BASE + "12.%20Calming%20Music%20Sanctuary%20-%20Perfect%20Harmony.mp3" },
  { name: "Morning Yoga", src: COL1_BASE + "13.%20Om%20Meditation%20Music%20Academy%20-%20Morning%20Yoga%20Meditation.mp3" },
  { name: "Zen White Noise", src: COL1_BASE + "14.%20Healing%20Meditation%20Zone%20-%20Zen%20Natural%20White%20Noise.mp3" },
  { name: "Ambient Lounge Cafe", src: COL1_BASE + "15.%20Serenity%20Music%20Relaxation%20-%20Ambient%20Lounge%20Cafe.mp3" },
  { name: "New Age Music", src: COL1_BASE + "16.%20Rebirth%20Yoga%20Music%20Academy%20-%20New%20Age%20Music.mp3" },
  { name: "Calm Meditation", src: COL1_BASE + "17.%20Calming%20Music%20Sanctuary%20-%20Learn%20Meditation%20and%20Calm%20Music.mp3" },
  { name: "Trouble Sleeping", src: COL1_BASE + "18.%20Om%20Meditation%20Music%20Academy%20-%20Trouble%20Sleeping.mp3" },
  { name: "Zen Study Concentration", src: COL1_BASE + "19.%20Healing%20Meditation%20Zone%20-%20Zen%20Study%20Concentration%20for%20Study.mp3" },
  { name: "New Age Calm", src: COL1_BASE + "20.%20Serenity%20Music%20Relaxation%20-%20New%20Age%20for%20Calm.mp3" },
  { name: "Relax Water Sounds", src: COL1_BASE + "21.%20Rebirth%20Yoga%20Music%20Academy%20-%20Relax%20%28Water%20Sounds%29.mp3" },
  { name: "Yoga Music", src: COL1_BASE + "22.%20Calming%20Music%20Sanctuary%20-%20Yoga%20Music.mp3" },
  { name: "Inner Peace", src: COL1_BASE + "23.%20Om%20Meditation%20Music%20Academy%20-%20Inner%20Peace.mp3" },
  { name: "Bird Sounds", src: COL1_BASE + "24.%20Healing%20Meditation%20Zone%20-%20Best%20Sounds%20of%20Nature%20%28Birds%29.mp3" },
  { name: "Peaceful Mind", src: COL1_BASE + "25.%20Serenity%20Music%20Relaxation%20-%20Peaceful%20Mind%20%28Soothing%20%26%20Calming%20Music%29.mp3" },
  { name: "Breathe In & Out", src: COL1_BASE + "26.%20Rebirth%20Yoga%20Music%20Academy%20-%20Breathe%20In%20%26%20Breathe%20Out.mp3" },
  { name: "Night Rain", src: COL1_BASE + "27.%20Calming%20Music%20Sanctuary%20-%20Night%20Rain%20Sound.mp3" },
  { name: "Introspection", src: COL1_BASE + "28.%20Om%20Meditation%20Music%20Academy%20-%20Introspection.mp3" },
  { name: "Buddhist Meditation", src: COL1_BASE + "29.%20Healing%20Meditation%20Zone%20-%20Buddhist%20Meditation%20Music.mp3" },
  { name: "The Meditation Song", src: COL1_BASE + "30.%20Serenity%20Music%20Relaxation%20-%20The%20Meditation%20Song.mp3" },
  { name: "Essentials", src: COL1_BASE + "31.%20Rebirth%20Yoga%20Music%20Academy%20-%20Essentials.mp3" },
  { name: "Life (New Age)", src: COL1_BASE + "32.%20Calming%20Music%20Sanctuary%20-%20Life%20%28New%20Age%20Song%29.mp3" },
  { name: "Deep Breathing", src: COL1_BASE + "33.%20Om%20Meditation%20Music%20Academy%20-%20Deep%20Breathing%20Exercises.mp3" },
  { name: "Flow of Energy", src: COL1_BASE + "34.%20Healing%20Meditation%20Zone%20-%20Flow%20of%20Energy%20%28Yoga%20Meditation%29.mp3" },
  { name: "Om Healing", src: COL1_BASE + "35.%20Serenity%20Music%20Relaxation%20-%20Om%20Healing%20Meditation.mp3" },
  { name: "Nature Sounds", src: COL1_BASE + "36.%20Rebirth%20Yoga%20Music%20Academy%20-%20Nature%20Sounds%20and%20Music.mp3" },
  { name: "Beautiful Breeze", src: COL1_BASE + "37.%20Calming%20Music%20Sanctuary%20-%20Beautiful%20Breeze.mp3" },
  { name: "Dreamscapes", src: COL1_BASE + "38.%20Om%20Meditation%20Music%20Academy%20-%20Dreamscapes.mp3" },
  { name: "Purity (Yoga)", src: COL1_BASE + "39.%20Healing%20Meditation%20Zone%20-%20Purity%20%28Yoga%20Music%29.mp3" },
  { name: "Healing Water", src: COL1_BASE + "40.%20Serenity%20Music%20Relaxation%20-%20Healing%20Water%20Sounds%20of%20Nature.mp3" },

  // Collection 2: Relaxing Spa Music
  { name: "Full Body Regeneration", src: COL2_BASE + "528Hz%20-%20Whole%20Body%20Regeneration%20-%20Full%20Body%20Healing%20%20Emotional%20%20Physical%20Healing.ogg" },
  { name: "Harmonize Relationships", src: COL2_BASE + "639Hz%20%20Harmonize%20Relationships%20%20Heal%20Old%20Negative%20Energy%20-%20Attract%20Love%20%20Solfeggio%20Healing%20Tones.ogg" },
  { name: "Earth Magnetic Field", src: COL2_BASE + "7.83%20Hz%20%20The%20Powerful%20Healing%20Frequency%20of%20Earths%20Magnetic%20Field%20%20Boost%20Positive%20Energy.ogg" },
  { name: "Nature with Birdsong", src: COL2_BASE + "8%20HOURS%20of%20Relaxing%20Nature%20Music%20with%20Birdsong%20-%20Meditation%20Work%20Study%20Sleep%20Relaxation.ogg" },
  { name: "Let Go of Fear", src: COL2_BASE + "852%20Hz%20-%20LET%20GO%20of%20Fear%20Overthinking%20%20Worries%20%20Cleanse%20Destructive%20Energy%20%20Awakening%20Intuition.ogg" },
  { name: "Indian Flute Meditation", src: COL2_BASE + "Indian%20Flute%20Meditation%20Music%20Pure%20Positive%20Vibes%20Instrumental%20Music%20for%20Meditation%20and%20Yoga.ogg" },
  { name: "Morning in Forest", src: COL2_BASE + "Morning%20in%20the%20Forest%208%20HOURS%20of%20Relaxing%20Nature%20Music%20-%20Meditation%20Yoga%20Calming%20Relaxation.ogg" },

  // Collection 3: Nature Sounds 2021
  { name: "2 Hour Relaxing", src: COL3_BASE + "02%20Hour%20Relaxing.mp3" },
  { name: "Forest Birds Singing", src: COL3_BASE + "Nature%20Sounds%20Forest%20Sounds%20Birds%20Singing%20Sound%20of%20Water.mp3" },
  { name: "River & Spring Birds", src: COL3_BASE + "%5BMP3FY%5D%20Morning%20on%20the%20River%20and%20the%20gentle%20singing%20of%20spring%20birds.mp3" },
  { name: "Soothing Morning Forest", src: COL3_BASE + "%5BMP3FY%5D%20Soothing%20Sounds%20Of%20Morning%20Forest.%20Birds%20singing%20To%20Relieve%20Anxiety%20and%20Stress..mp3" },

  // Original Tracks
  { name: "Bamboo Flute", src: "https://archive.org/download/bamboo-flute-music-for-relaxing-meditation-and-healing/Shakuhachi.mp3" },
  { name: "Om Chanting", src: "https://archive.org/download/OmChanting/OmChanting_vbr.mp3" },
  { name: "Gentle Rain", src: "https://archive.org/download/RainSound13/Gentle%20Rain%20and%20Thunder.mp3" },
  { name: "Forest Birds", src: "https://archive.org/download/various-bird-sounds/birds-in-forest-on-sunny-day-14444.mp3" },
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
      // Try next random track on error
      const nextTrack = MEDITATION_TRACKS[Math.floor(Math.random() * MEDITATION_TRACKS.length)];
      if (nextTrack.src !== currentTrack.src) {
        console.log("Switching to another track due to error...");
        setCurrentTrack(nextTrack);
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
