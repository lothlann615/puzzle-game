
import React, { useState, useEffect, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { UIOverlay } from './components/UIOverlay';
import { GameStatus, Accuracy, SpeedRating, type ScoreFeedback, GameMode } from './types';
import { GAME_CONFIG, STORAGE_KEYS, ASSETS } from './constants';
import { audio } from './services/audioService';

const renderEmoji = (content?: string, sizeClass: string = "w-12 h-12") => {
  if (!content) return null;
  const isImage = content.includes('/') || content.startsWith('data:');
  const containerClass = `${sizeClass} flex items-center justify-center bg-white rounded-full shadow-lg border-2 border-blue-100 animate-bounce`;
  
  if (isImage) {
    return (
      <div className={containerClass}>
        <img src={content} alt="icon" className="w-[70%] h-[70%] object-contain" />
      </div>
    );
  }
  return (
      <div className={containerClass}>
          <span className="text-2xl filter drop-shadow-sm select-none">{content}</span>
      </div>
  );
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MODE_SELECT);
  const [activeMode, setActiveMode] = useState<GameMode>(GameMode.CRAZY);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1); // 0.0 to 1.0
  
  const [comboCount, setComboCount] = useState(0);
  const [isComboMode, setIsComboMode] = useState(false);
  const [hasShield, setHasShield] = useState(false);
  
  const [gameOverReason, setGameOverReason] = useState('');
  const [feedback, setFeedback] = useState<ScoreFeedback | null>(null);

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HIGH_SCORE);
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  const updateHighScore = (currentScore: number) => {
    if (currentScore > highScore) {
      setHighScore(currentScore);
      localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, currentScore.toString());
    }
  };

  const startGame = (mode: GameMode) => {
    setActiveMode(mode);
    setStatus(GameStatus.PLAYING);
    setLevel(1);
    setScore(0);
    setComboCount(0);
    setIsComboMode(false);
    setTimeLeft(1); // Ensure bar is full at start
  };

  const handleGameOver = useCallback((reason: string) => {
    updateHighScore(score);
    setGameOverReason(reason);
    setStatus(GameStatus.GAME_OVER);
  }, [score, highScore]);

  const handleLevelComplete = useCallback((stats: { accuracy: Accuracy; speed: SpeedRating; timeRatio: number }) => {
    let multiplier = 1.0;
    let feedbackText = "";
    let subText = "";
    let emoji = ASSETS.IMAGES.GOOD;
    
    // Check states based on CURRENT combo count (before this hit updates it)
    const isProtectionActive = comboCount >= GAME_CONFIG.maxCombo;
    const isHighEnergyActive = comboCount >= GAME_CONFIG.highEnergyThreshold;

    // --- SCORING LOGIC ---
    if (stats.accuracy === Accuracy.PERFECT) {
      multiplier *= 2.0;
      feedbackText = "PERFECT";
      emoji = ASSETS.IMAGES.PERFECT;
    } else if (stats.accuracy === Accuracy.GOOD) {
      multiplier *= 1.5;
      feedbackText = "GOOD";
      emoji = ASSETS.IMAGES.GOOD;
    }

    if (stats.speed === SpeedRating.GODLIKE) {
      multiplier *= 1.5;
      feedbackText += " + FAST!";
      subText = "Speed Bonus x1.5";
    } else if (stats.speed === SpeedRating.SLOW) {
      multiplier *= 0.8;
    } else {
      subText = "Nice Catch";
    }

    // Protection/Combo Bonus
    if (isProtectionActive) {
      multiplier *= 2.0;
      subText = `Combo Mode x2`;
    }

    // HIGH ENERGY BONUS (New Requirement 4)
    if (isHighEnergyActive) {
        multiplier *= 1.5; // Additional 50%
        subText = "HIGH ENERGY x3"; // Roughly 2 * 1.5 = 3x total base
        feedbackText = "⚡ HIGH ENERGY! ⚡";
    }

    // Regular mode scores less to encourage Crazy mode
    if (activeMode === GameMode.REGULAR) {
      multiplier *= 0.5;
      subText = "(Regular Mode)";
    }

    const points = Math.floor(GAME_CONFIG.baseScore * multiplier);
    
    setFeedback({
      id: Date.now(),
      text: feedbackText,
      subText: subText,
      score: points,
      type: 'success',
      emoji: emoji
    });
    setTimeout(() => setFeedback(null), 700);

    setScore(prev => prev + points);

    // --- COMBO STATE LOGIC ---
    if (stats.accuracy === Accuracy.PERFECT) {
      // Perfect always increments combo
      const newCount = comboCount + 1;
      setComboCount(newCount);
      
      // Enter Protection Mode
      if (newCount >= GAME_CONFIG.maxCombo && !isProtectionActive) {
        setIsComboMode(true);
        setHasShield(true);
        audio.playCombo();
      }
      
      // Enter High Energy Audio Cue (Optional)
      if (newCount === GAME_CONFIG.highEnergyThreshold) {
          audio.playCombo(); // Or a stronger sound
      }

    } else if (stats.accuracy === Accuracy.GOOD) {
      // Logic for GOOD hit
      if (isHighEnergyActive) {
          // Requirement 4: GOOD breaks High Energy -> enters normal protection state (Combo = 3)
          setComboCount(GAME_CONFIG.maxCombo); // Set to 3
          // Ensure shield stays active
          setHasShield(true); 
          setIsComboMode(true);
          // High Energy bonus is lost for next turn
      } else if (isProtectionActive) {
          // Requirement 3: GOOD in Protection mode -> Combo stays same (doesn't reset, doesn't add)
          // setComboCount(prev => prev); // No change
      } else {
          // Requirement 2: GOOD before Protection -> Reset to 0
          setComboCount(0);
          setIsComboMode(false);
      }
    } else if (stats.accuracy === Accuracy.BAD) {
      // Bad always resets
      setIsComboMode(false);
      setComboCount(0);
    }

    setTimeLeft(1); // Jump to full instantly
    setTimeout(() => {
        setLevel(prev => prev + 1);
    }, 50); 
    
  }, [comboCount, activeMode]); // Added comboCount dependency

  const handleLevelFail = useCallback((reason: string) => {
    if (!isComboMode) {
      handleGameOver(reason);
      return;
    }
    
    setFeedback({
      id: Date.now(),
      text: reason, 
      subText: "Combo Lost - Survival",
      score: 0,
      type: 'fail',
      emoji: ASSETS.IMAGES.BAD
    });
    setTimeout(() => setFeedback(null), 700);

    setIsComboMode(false);
    setComboCount(0);
    setHasShield(false);

    setTimeLeft(1); // Jump to full instantly
    setTimeout(() => {
       setLevel(prev => prev + 1);
    }, 500);
  }, [isComboMode, handleGameOver]);

  const handleRevive = () => {
    setTimeout(() => {
      setStatus(GameStatus.PLAYING);
      setHasShield(true);
      setTimeLeft(1);
    }, 1000);
  };

  const handleBuyShield = () => {
     setTimeout(() => {
        setHasShield(true);
        audio.playGood();
     }, 1000);
  };

  const handleRestart = () => {
    setStatus(GameStatus.MODE_SELECT);
    setHasShield(false);
  };

  const consumeShield = useCallback(() => {
    setHasShield(false);
  }, []);

  let barColor = 'bg-green-500';
  if (timeLeft < 0.3) barColor = 'bg-red-500';
  else if (timeLeft < 0.7) barColor = 'bg-yellow-400';

  // Dynamic Combo Display Styles
  const isHighEnergy = comboCount >= GAME_CONFIG.highEnergyThreshold;
  const comboScale = Math.min(1 + (comboCount * 0.15), 2.5); 
  
  // Color Logic
  let comboColorClass = "text-yellow-400";
  if (isHighEnergy) comboColorClass = "text-purple-400 animate-pulse";
  else if (comboCount >= 5) comboColorClass = "text-red-500";
  else if (comboCount >= 3) comboColorClass = "text-orange-400";

  return (
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center overflow-hidden font-sans select-none">
      <div className="relative w-full max-w-[calc(100vh*9/16)] aspect-[9/16] h-full max-h-screen bg-white shadow-2xl overflow-hidden flex flex-col">
        
        {/* CSS Animations */}
        <style>{`
          @keyframes float-up {
            0% { transform: translateY(0) scale(0.5); opacity: 0; }
            15% { transform: translateY(0) scale(1.1); opacity: 1; }
            25% { transform: translateY(0) scale(1.0); opacity: 1; }
            70% { transform: translateY(0) scale(1.0); opacity: 1; }
            100% { transform: translateY(-80px) scale(0.8); opacity: 0; }
          }
          .animate-float-up {
            animation: float-up 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          @keyframes bounce-in {
             0% { transform: scale(0.8); opacity: 0; }
             50% { transform: scale(1.1); opacity: 1; }
             100% { transform: scale(1); opacity: 1; }
          }
          .animate-bounce-in {
             animation: bounce-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          @keyframes blue-breath {
            0%, 100% { box-shadow: inset 0 0 30px 5px rgba(37, 99, 235, 0.5); }
            50% { box-shadow: inset 0 0 80px 20px rgba(37, 99, 235, 0.85); }
          }
          .animate-blue-breath {
            animation: blue-breath 2s ease-in-out infinite;
          }
           @keyframes red-flash {
            0%, 100% { box-shadow: inset 0 0 0px 0px rgba(239, 68, 68, 0); }
            50% { box-shadow: inset 0 0 60px 20px rgba(239, 68, 68, 0.85); }
          }
          .animate-red-flash {
            animation: red-flash 0.7s ease-in-out;
          }
           @keyframes purple-glow {
            0%, 100% { box-shadow: inset 0 0 30px 5px rgba(168, 85, 247, 0.4); }
            50% { box-shadow: inset 0 0 70px 15px rgba(168, 85, 247, 0.7); }
          }
          .animate-purple-glow {
            animation: purple-glow 1s ease-in-out infinite;
          }
        `}</style>
        
        {/* FEEDBACK OVERLAY (Center Screen, Solid Gradient Text, Floating Animation) */}
        {feedback && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none">
             <div className="animate-float-up flex flex-col items-center justify-center gap-2 w-full text-center">
                 {/* Emoji / Image - No Background Container */}
                 {feedback.emoji && (
                    <div className="w-24 h-24 flex items-center justify-center drop-shadow-2xl">
                         {feedback.emoji.includes('/') || feedback.emoji.startsWith('data:') ? (
                           <img src={feedback.emoji} alt="icon" className="w-full h-full object-contain" />
                         ) : (
                           <span className="text-7xl">{feedback.emoji}</span>
                         )}
                    </div>
                 )}
                 
                 {/* Solid Gradient Text with Stroke */}
                 <div 
                   className={`text-6xl font-black italic tracking-tighter text-transparent bg-clip-text drop-shadow-xl ${
                     feedback.type === 'fail' 
                       ? 'bg-gradient-to-b from-red-500 to-red-700' 
                       : 'bg-gradient-to-b from-yellow-300 to-orange-500'
                   }`}
                   style={{
                     WebkitTextStroke: '2px white', // Solid White Stroke
                     filter: 'drop-shadow(0 4px 2px rgba(0,0,0,0.3))'
                   }}
                 >
                   {feedback.text}
                 </div>
                 
                 {/* Subtext - Minimal style */}
                 {feedback.subText && (
                   <div className="text-white/95 text-lg font-bold uppercase tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                     {feedback.subText}
                   </div>
                 )}
             </div>
          </div>
        )}

        {status !== GameStatus.MODE_SELECT && (
          <div className="w-full bg-slate-800 text-white p-4 pb-6 flex flex-col gap-2 relative z-20 shadow-md flex-shrink-0">
              
              {/* SCORE FEEDBACK (Floating Number Only - Kept separate for visibility) */}
              {feedback && feedback.score > 0 && (
                <div className="absolute left-1/2 bottom-2 transform -translate-x-1/2 translate-y-full z-50 pointer-events-none">
                   <div className="text-4xl font-black text-yellow-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] animate-bounce" style={{WebkitTextStroke: '1px #a16207'}}>
                     +{Math.floor(feedback.score)}
                   </div>
                </div>
              )}

              <div className="flex justify-between items-center relative">
                  <div className="flex items-center gap-2">
                      <span className="bg-slate-700 px-3 py-1 rounded text-sm font-bold border border-slate-600">LVL {level}</span>
                      {hasShield && (
                          <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded animate-pulse ${isHighEnergy ? 'bg-purple-600' : 'bg-blue-600'} text-white`}>
                              🛡️ {isHighEnergy ? 'MAX ENERGY' : 'SHIELD'}
                          </span>
                      )}
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${activeMode === GameMode.CRAZY ? 'bg-orange-600' : 'bg-green-600'}`}>
                        {activeMode === GameMode.CRAZY ? 'CRAZY' : 'REGULAR'}
                      </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">BEST: {highScore}</div>
              </div>

              <div className="flex justify-between items-end mt-1 relative">
                  <div className="h-10 flex items-center relative w-1/2">
                      {comboCount > 1 && (
                          <div 
                            className="absolute left-0 bottom-0 transform origin-bottom-left transition-all duration-300 z-50 flex flex-col pointer-events-none"
                            style={{ transform: `scale(${comboScale})` }}
                          >
                              <span className={`text-2xl font-black italic tracking-tighter drop-shadow-md whitespace-nowrap ${comboColorClass} ${isComboMode ? 'animate-bounce' : ''}`}>
                                  {comboCount}x COMBO
                              </span>
                              {isHighEnergy && <span className="text-[0.6rem] bg-purple-600 px-1 rounded text-center leading-none py-0.5 font-bold uppercase text-white shadow-sm border border-purple-300">HIGH ENERGY</span>}
                              {!isHighEnergy && isComboMode && <span className="text-[0.6rem] bg-yellow-600 px-1 rounded text-center leading-none py-0.5 font-bold uppercase text-white shadow-sm">PROTECTED</span>}
                          </div>
                      )}
                  </div>
                  <div className="text-4xl font-black tracking-tight tabular-nums text-white drop-shadow-sm">
                      {Math.floor(score)}
                  </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-900 overflow-hidden">
                   <div 
                      className={`h-full ${barColor} ${timeLeft >= 0.99 ? '' : 'transition-all duration-100 ease-linear'} shadow-[0_0_10px_rgba(255,255,255,0.5)]`} 
                      style={{ width: `${Math.max(0, timeLeft * 100)}%` }}
                   />
              </div>
          </div>
        )}

        <div className="relative flex-1 w-full bg-gray-100 overflow-hidden">
            <GameCanvas 
              status={status}
              level={level}
              hasShield={hasShield}
              comboCount={comboCount}
              isComboMode={isComboMode}
              onLevelComplete={handleLevelComplete}
              onLevelFail={handleLevelFail}
              onConsumeShield={consumeShield}
              onUpdateCombo={setComboCount}
              onTimeUpdate={setTimeLeft}
              onGameOver={handleGameOver}
            />
            
            {/* Screen Edge Effects Layer - Placed AFTER GameCanvas to overlay on top */}
            <div className={`absolute inset-0 z-10 pointer-events-none transition-all duration-300
                ${isHighEnergy ? 'animate-purple-glow' : (hasShield ? 'animate-blue-breath' : '')}
                ${feedback?.type === 'fail' ? 'animate-red-flash' : ''}
            `} />
            
            <UIOverlay 
              status={status}
              score={score}
              highScore={highScore}
              level={level}
              timeLeft={0} 
              comboCount={comboCount}
              isComboMode={isComboMode}
              hasShield={hasShield}
              gameOverReason={gameOverReason}
              onStart={startGame}
              onRevive={handleRevive}
              onRestart={handleRestart}
              onBuyShield={handleBuyShield}
              onOpenModeSelect={() => setStatus(GameStatus.MODE_SELECT)}
            />
        </div>

      </div>
    </div>
  );
};

export default App;
