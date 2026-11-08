/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameMode,
  GameState,
  GameOptions,
  Team,
  Worm,
  WeaponId,
} from './types/game';
import { GameCanvas } from './components/GameCanvas';
import { GamebuinoChassis } from './components/GamebuinoChassis';
import { HUD } from './components/HUD';
import { LobbyModal } from './components/LobbyModal';
import { OptionsModal } from './components/OptionsModal';
import { HelpModal } from './components/HelpModal';
import { VictoryModal } from './components/VictoryModal';
import { GalleryModal } from './components/GalleryModal';
import { DEFAULT_WEAPON_AMMO } from './utils/weapons';
import { sounds } from './utils/audio';
import { AIEngine } from './utils/ai';
import { network } from './utils/network';
import { TerrainEngine, WATER_LEVEL } from './utils/terrain';

// Default initial teams
const createInitialTeams = (wormsCount: number, hp: number): Team[] => [
  {
    id: 1,
    name: 'Gamebuino AKA Clan',
    color: '#10B981', // Emerald green
    secondaryColor: '#059669',
    isAI: false,
    deviceType: 'gamebuino',
    currentWormIndex: 0,
    weapons: { ...DEFAULT_WEAPON_AMMO },
    worms: Array.from({ length: wormsCount }, (_, i) => ({
      id: `team1_w${i}`,
      name: ['Pixel', 'Chiptune', 'Bit', 'Glitch'][i] || `Ver ${i + 1}`,
      teamId: 1,
      x: 300 + i * 150,
      y: 400,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      isAlive: true,
      facing: 'right',
      aimAngle: 45,
      aimPower: 0,
      isGrounded: true,
      isDrowning: false,
      tombstone: false,
      color: '#10B981',
      hat: 'bandana',
    })),
  },
  {
    id: 2,
    name: 'PC & Android Titans',
    color: '#EF4444', // Ruby Red
    secondaryColor: '#DC2626',
    isAI: false,
    deviceType: 'pc',
    currentWormIndex: 0,
    weapons: { ...DEFAULT_WEAPON_AMMO },
    worms: Array.from({ length: wormsCount }, (_, i) => ({
      id: `team2_w${i}`,
      name: ['Titan', 'Nexus', 'Turbo', 'Matrix'][i] || `Ver ${i + 1}`,
      teamId: 2,
      x: 1000 + i * 150,
      y: 400,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      isAlive: true,
      facing: 'left',
      aimAngle: 45,
      aimPower: 0,
      isGrounded: true,
      isDrowning: false,
      tombstone: false,
      color: '#EF4444',
      hat: 'helmet',
    })),
  },
];

export default function App() {
  // Game Configuration & State
  const [gameState, setGameState] = useState<GameState>('LOBBY');
  const [gameMode, setGameMode] = useState<GameMode>('PASS_AND_PLAY');

  const [options, setOptions] = useState<GameOptions>({
    turnDuration: 45,
    wormsPerTeam: 2,
    wormHp: 100,
    windEffect: 'normal',
    mapPreset: 'islands',
    displayMode: 'gamebuino_aka', // Gamebuino AKA (ESP32-S3 · 320x240) by default
    graphicStyle: 'hd_cartoon', // High-fidelity rich graphics & textures
    enhancedGraphics: true, // Screen shake, shockwaves, weather particles & reflections
    fpsLimit: 60,
    rgb565Mode: false, // Disabled by default for maximum graphical richness and vivid colors
    fastZoomMode: true,
    retroFilter: false, // Clean crisp display by default
    soundEnabled: true,
    volume: 0.7,
    musicEnabled: true,
    musicVolume: 0.45,
    musicTrack: 0,
  });

  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(false);

  const [teams, setTeams] = useState<Team[]>(() =>
    createInitialTeams(options.wormsPerTeam, options.wormHp)
  );

  const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);
  const [activeWormIndex, setActiveWormIndex] = useState<number>(0);

  // Weapon & Turn Status
  const [currentWeapon, setCurrentWeapon] = useState<WeaponId>('bazooka');
  const [grenadeTimer, setGrenadeTimer] = useState<number>(3);
  const [turnTimeLeft, setTurnTimeLeft] = useState<number>(45);
  const [wind, setWind] = useState<number>(2.4);

  // Charging Power
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [power, setPower] = useState<number>(0);

  // Rapid Zoom
  const [isQuickZoomActive, setIsQuickZoomActive] = useState<boolean>(false);

  // Chassis visual feedback (LEDs flash when exploding)
  const [isExploding, setIsExploding] = useState<boolean>(false);

  // Targeting Modes
  const [isAirstrikeMode, setIsAirstrikeMode] = useState<boolean>(false);
  const [isTeleportMode, setIsTeleportMode] = useState<boolean>(false);

  // Modals
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [winningTeam, setWinningTeam] = useState<Team | null>(null);

  // Network State
  const [roomId, setRoomId] = useState<string>('');
  const [isConnectedPeer, setIsConnectedPeer] = useState<boolean>(false);

  // Movement Interval Ref
  const moveIntervalRef = useRef<number | null>(null);
  const chargeIntervalRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  const activeTeam = teams[activeTeamIndex];
  const activeWorm = activeTeam?.worms[activeWormIndex];

  // Initialize Network Manager
  useEffect(() => {
    network.setCallbacks(
      (msg) => {
        if (msg.type === 'START_GAME') {
          setGameState('PLAYING');
        } else if (msg.type === 'WORM_AIM') {
          handleAimChange(msg.payload.angle);
        } else if (msg.type === 'WORM_CHARGE') {
          setPower(msg.payload.power);
          setIsCharging(msg.payload.isCharging);
        } else if (msg.type === 'WORM_FIRE') {
          setPower(msg.payload.power);
          setIsCharging(false);
        } else if (msg.type === 'WEAPON_SELECT') {
          setCurrentWeapon(msg.payload.weaponId);
        } else if (msg.type === 'WORM_JUMP') {
          executeJump();
        } else if (msg.type === 'END_TURN') {
          nextTurn();
        }
      },
      () => {
        setIsConnectedPeer(true);
      },
      () => {
        setIsConnectedPeer(false);
      }
    );
  }, []);

  // Update room creation when online mode is toggled
  useEffect(() => {
    if (gameMode === 'ONLINE_HOST' && !roomId) {
      network.hostRoom().then((code) => {
        setRoomId(code);
      });
    }
  }, [gameMode]);

  // Turn Countdown Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      return;
    }

    timerIntervalRef.current = window.setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          sounds.playTimerTick();
          nextTurn();
          return options.turnDuration;
        }
        if (prev <= 6) {
          sounds.playTimerTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [gameState, activeTeamIndex, activeWormIndex, options.turnDuration]);

  // Turn Switcher
  const nextTurn = useCallback(() => {
    setIsCharging(false);
    setPower(0);
    setIsAirstrikeMode(false);
    setIsTeleportMode(false);

    // Compute random wind for next turn
    let newWind = 0;
    if (options.windEffect !== 'none') {
      const maxWind = options.windEffect === 'high' ? 8 : options.windEffect === 'low' ? 3 : 5.5;
      newWind = (Math.random() * 2 - 1) * maxWind;
    }
    setWind(parseFloat(newWind.toFixed(1)));
    setTurnTimeLeft(options.turnDuration);

    setTeams((prevTeams) => {
      // Find which team goes next
      const nextTeamIdx = (activeTeamIndex + 1) % prevTeams.length;
      const targetTeam = prevTeams[nextTeamIdx];

      // Find next living worm
      let nextWormIdx = (targetTeam.currentWormIndex + 1) % targetTeam.worms.length;
      let attempts = 0;
      while (
        (!targetTeam.worms[nextWormIdx].isAlive || targetTeam.worms[nextWormIdx].tombstone) &&
        attempts < targetTeam.worms.length
      ) {
        nextWormIdx = (nextWormIdx + 1) % targetTeam.worms.length;
        attempts++;
      }

      const updated = prevTeams.map((t, idx) =>
        idx === nextTeamIdx ? { ...t, currentWormIndex: nextWormIdx } : t
      );

      setActiveTeamIndex(nextTeamIdx);
      setActiveWormIndex(nextWormIdx);

      return updated;
    });
  }, [activeTeamIndex, options.turnDuration, options.windEffect]);

  // Check Game Over Conditions
  const checkGameOver = useCallback((updatedTeams: Team[]) => {
    const aliveTeams = updatedTeams.filter((t) =>
      t.worms.some((w) => w.isAlive && !w.tombstone)
    );

    if (aliveTeams.length <= 1) {
      setGameState('GAME_OVER');
      setWinningTeam(aliveTeams[0] || null);
    }
  }, []);

  // Damage Applied Callback from Canvas
  const handleDamageApplied = (updatedTeams: Team[]) => {
    setTeams(updatedTeams);
    checkGameOver(updatedTeams);
  };

  // Turn Fired Callback
  const handleFireComplete = (turnEnded: boolean) => {
    if (turnEnded) {
      setTimeout(() => {
        nextTurn();
      }, 1000);
    }
  };

  // AI Turn Bot Handler
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const currentTeam = teams[activeTeamIndex];
    if (!currentTeam || !currentTeam.isAI) return;

    const botWorm = currentTeam.worms[activeWormIndex];
    if (!botWorm || !botWorm.isAlive) return;

    // Simulate AI thinking delay
    const aiTimer = setTimeout(() => {
      // Create temporary terrain checker
      const dummyTerrain = new TerrainEngine();
      dummyTerrain.generate(options.mapPreset);

      const decision = AIEngine.calculateTurn(botWorm, teams, dummyTerrain, wind);

      // 1. Select weapon
      setCurrentWeapon(decision.weapon);
      if (decision.timer) setGrenadeTimer(decision.timer);

      // 2. Adjust Aim
      handleAimChange(decision.angle);

      // 3. Charge power and fire
      setTimeout(() => {
        setIsCharging(true);
        sounds.playCharge(0.5);

        // Gradually charge power to calculated target
        let curP = 0;
        const interval = setInterval(() => {
          curP += 5;
          setPower(curP);
          if (curP >= decision.power) {
            clearInterval(interval);
            setIsCharging(false); // Triggers launchActiveWeapon in Canvas
          }
        }, 40);
      }, 1200);
    }, 1200);

    return () => clearTimeout(aiTimer);
  }, [gameState, activeTeamIndex, activeWormIndex]);

  // Movement & Aiming Handlers
  const handleMoveLeft = () => {
    if (!activeWorm || !activeWorm.isAlive) return;
    activeWorm.facing = 'left';
    activeWorm.x = Math.max(40, activeWorm.x - 3.5);
    setTeams([...teams]);
  };

  const handleMoveRight = () => {
    if (!activeWorm || !activeWorm.isAlive) return;
    activeWorm.facing = 'right';
    activeWorm.x = Math.min(1560, activeWorm.x + 3.5);
    setTeams([...teams]);
  };

  const handleAimUp = () => {
    if (!activeWorm || !activeWorm.isAlive) return;
    const newAngle = Math.min(85, activeWorm.aimAngle + 3);
    activeWorm.aimAngle = newAngle;
    setTeams([...teams]);
    network.sendMessage('WORM_AIM', { angle: newAngle });
  };

  const handleAimDown = () => {
    if (!activeWorm || !activeWorm.isAlive) return;
    const newAngle = Math.max(5, activeWorm.aimAngle - 3);
    activeWorm.aimAngle = newAngle;
    setTeams([...teams]);
    network.sendMessage('WORM_AIM', { angle: newAngle });
  };

  const handleAimChange = (angle: number) => {
    if (!activeWorm || !activeWorm.isAlive) return;
    activeWorm.aimAngle = angle;
    setTeams([...teams]);
  };

  const executeJump = () => {
    if (!activeWorm || !activeWorm.isAlive || !activeWorm.isGrounded) return;
    sounds.playWormJump();
    const isLeft = activeWorm.facing === 'left';
    activeWorm.vx = isLeft ? -3.5 : 3.5;
    activeWorm.vy = -6.5; // Upward leap
    activeWorm.y -= 4;
    activeWorm.isGrounded = false;
    setTeams([...teams]);
    network.sendMessage('WORM_JUMP', {});
  };

  // Charging Power for Fire
  const startCharging = () => {
    if (!activeWorm || !activeWorm.isAlive || isCharging) return;
    setIsCharging(true);
    setPower(5);

    if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    chargeIntervalRef.current = window.setInterval(() => {
      setPower((prev) => {
        const next = prev + 2.5;
        sounds.playCharge(next / 100);
        if (next >= 100) {
          // Auto release at 100% max power
          releaseCharging();
          return 100;
        }
        return next;
      });
    }, 25);
  };

  const releaseCharging = () => {
    if (chargeIntervalRef.current) {
      clearInterval(chargeIntervalRef.current);
      chargeIntervalRef.current = null;
    }
    setIsCharging(false);
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        handleMoveLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        handleMoveRight();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        handleAimUp();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        handleAimDown();
      } else if (e.code === 'Space') {
        if (!e.repeat) startCharging();
      } else if (e.code === 'Enter') {
        executeJump();
      } else if (e.code === 'KeyZ') {
        // Core request: Quick Zoom Toggle!
        setIsQuickZoomActive((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;

      if (e.code === 'Space') {
        releaseCharging();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, activeWorm, isCharging]);

  // Start match
  const handleStartGame = () => {
    // Configure AI team if VS_AI
    const updated = createInitialTeams(options.wormsPerTeam, options.wormHp);
    if (gameMode === 'VS_AI') {
      updated[1].isAI = true;
      updated[1].name = 'Robot Gamebuino AKA';
    }
    setTeams(updated);
    setActiveTeamIndex(0);
    setActiveWormIndex(0);
    setTurnTimeLeft(options.turnDuration);
    setGameState('PLAYING');

    if (options.musicEnabled) {
      sounds.startMusic(options.musicTrack);
      setIsMusicPlaying(true);
    }

    if (gameMode === 'ONLINE_HOST') {
      network.sendMessage('START_GAME', { teams: updated, options });
    }
  };

  const handleToggleMusic = () => {
    const playing = sounds.toggleMusic();
    setIsMusicPlaying(playing);
    setOptions((prev) => ({ ...prev, musicEnabled: playing }));
  };

  const handleRematch = () => {
    handleStartGame();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans flex flex-col items-center justify-center p-0 md:p-3">
      {/* 1. Game Canvas Container (wrapped in Gamebuino AKA Chassis if AKA selected) */}
      {options.displayMode === 'gamebuino_aka' ? (
        <GamebuinoChassis
          onDpadPress={(dir) => {
            if (dir === 'left') handleMoveLeft();
            else if (dir === 'right') handleMoveRight();
            else if (dir === 'up') handleAimUp();
            else if (dir === 'down') handleAimDown();
          }}
          onDpadRelease={() => {}}
          onButtonAPress={startCharging}
          onButtonARelease={releaseCharging}
          onButtonBPress={executeJump}
          onButtonCPress={() => setIsQuickZoomActive((prev) => !prev)}
          onMenuPress={() => setIsOptionsOpen(true)}
          teamColor={activeTeam?.color}
          isExploding={isExploding}
        >
          <GameCanvas
            teams={teams}
            activeTeamIndex={activeTeamIndex}
            activeWormIndex={activeWormIndex}
            currentWeapon={currentWeapon}
            grenadeTimer={grenadeTimer}
            isFiring={isCharging}
            power={power}
            wind={wind}
            options={options}
            isAirstrikeMode={isAirstrikeMode}
            isTeleportMode={isTeleportMode}
            onFireComplete={handleFireComplete}
            onDamageApplied={handleDamageApplied}
            isQuickZoomActive={isQuickZoomActive}
            onToggleQuickZoom={() => setIsQuickZoomActive((p) => !p)}
            onExplosionOccurred={() => {
              setIsExploding(true);
              setTimeout(() => setIsExploding(false), 350);
            }}
          />
        </GamebuinoChassis>
      ) : (
        /* Fullscreen HD Panoramic View (PC / Android) */
        <div className="relative w-full h-full">
          <GameCanvas
            teams={teams}
            activeTeamIndex={activeTeamIndex}
            activeWormIndex={activeWormIndex}
            currentWeapon={currentWeapon}
            grenadeTimer={grenadeTimer}
            isFiring={isCharging}
            power={power}
            wind={wind}
            options={options}
            isAirstrikeMode={isAirstrikeMode}
            isTeleportMode={isTeleportMode}
            onFireComplete={handleFireComplete}
            onDamageApplied={handleDamageApplied}
            isQuickZoomActive={isQuickZoomActive}
            onToggleQuickZoom={() => setIsQuickZoomActive((p) => !p)}
            onExplosionOccurred={() => {
              setIsExploding(true);
              setTimeout(() => setIsExploding(false), 350);
            }}
          />
        </div>
      )}

      {/* 2. Floating Tactical HUD (Only in active gameplay) */}
      {gameState === 'PLAYING' && (
        <HUD
          teams={teams}
          activeTeamIndex={activeTeamIndex}
          activeWormIndex={activeWormIndex}
          currentWeapon={currentWeapon}
          onSelectWeapon={(w) => {
            setCurrentWeapon(w);
            network.sendMessage('WEAPON_SELECT', { weaponId: w });
          }}
          grenadeTimer={grenadeTimer}
          onChangeGrenadeTimer={setGrenadeTimer}
          turnTimeLeft={turnTimeLeft}
          wind={wind}
          options={options}
          isQuickZoomActive={isQuickZoomActive}
          onToggleQuickZoom={() => setIsQuickZoomActive((prev) => !prev)}
          onOpenOptions={() => setIsOptionsOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onOpenGallery={() => setIsGalleryOpen(true)}
          onToggleDisplayMode={() =>
            setOptions((prev) => ({
              ...prev,
              displayMode: prev.displayMode === 'gamebuino_aka' ? 'pc_android' : 'gamebuino_aka',
            }))
          }
          onToggleMusic={handleToggleMusic}
          isMusicPlaying={isMusicPlaying}
          currentTrackName={sounds.getCurrentTrack().name}
          onMoveLeft={handleMoveLeft}
          onMoveRight={handleMoveRight}
          onMoveStop={() => {}}
          onAimUp={handleAimUp}
          onAimDown={handleAimDown}
          onJump={executeJump}
          onChargeStart={startCharging}
          onChargeRelease={releaseCharging}
          isCharging={isCharging}
          power={power}
        />
      )}

      {/* 3. Setup Lobby Modal */}
      <LobbyModal
        isOpen={gameState === 'LOBBY'}
        gameMode={gameMode}
        onSelectGameMode={setGameMode}
        teams={teams}
        onUpdateTeams={setTeams}
        options={options}
        onUpdateOptions={setOptions}
        roomId={roomId}
        onJoinRoom={(code) => {
          network.joinRoom(code).then(() => {
            setGameState('PLAYING');
          });
        }}
        onStartGame={handleStartGame}
        isConnectedPeer={isConnectedPeer}
        onOpenGallery={() => setIsGalleryOpen(true)}
      />

      {/* 4. Options Modal */}
      <OptionsModal
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        options={options}
        onChangeOptions={setOptions}
      />

      {/* 5. Help & Controls Guide Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* 6. Victory Screen */}
      <VictoryModal
        isOpen={gameState === 'GAME_OVER'}
        winningTeam={winningTeam}
        onRematch={handleRematch}
        onReturnToMenu={() => setGameState('LOBBY')}
      />

      {/* 7. Maps Explorer & Worms Animation Studio Gallery */}
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
    </div>
  );
}
