import { useState, useEffect, useCallback } from 'react';
import { t, getLocale, setLocale, subscribe } from './i18n';
import './App.css';
import GameCanvas from './components/GameCanvas.jsx';
import { loadAudio, playBGM, playSFX, setBGMVolume, setSFXVolume, getBGMVolume, getSFXVolume } from './game/audio.js';
import { socket } from './socket.ts';

const SETTINGS_KEY = 'racing:settings';

// Default settings
const getDefaultSettings = () => ({
  locale: 'en',
  p1Name: 'Player 1',
  p2Name: 'Player 2',
  controls: {
    p1_left: 'a',
    p1_right: 'd',
    p2_left: 'ArrowLeft',
    p2_right: 'ArrowRight',
  },
  bgmVolume: 0.5,
  sfxVolume: 1.0,
});


function App() {
  const [screen, setScreen] = useState('menu'); // menu, multiplayer, game, leaderboard
  const [playerNames, setPlayerNames] = useState<{ p1: string; p2: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    const initialSettings = saved ? JSON.parse(saved) : getDefaultSettings();
    // Ensure volume properties exist
    initialSettings.bgmVolume = initialSettings.bgmVolume ?? 0.5;
    initialSettings.sfxVolume = initialSettings.sfxVolume ?? 1.0;
    return initialSettings;
  });
  const [capturingFor, setCapturingFor] = useState<string | null>(null);
  const [capturingForMultiplayer, setCapturingForMultiplayer] = useState<string | null>(null);
  const [multiplayerControls, setMultiplayerControls] = useState({
    p1_left: 'a',
    p1_right: 'd',
    p2_left: 'a',
    p2_right: 'd',
  });
  const [, setLocaleForRender] = useState(getLocale());
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [playerName, setPlayerName] = useState('Player');
  const [roomId, setRoomId] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [players, setPlayers] = useState([]);
  const [myPlayerIndex, setMyPlayerIndex] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [numPlayers, setNumPlayers] = useState(1);
  const [leaderboard, setLeaderboard] = useState([]);

  // Load audio and play BGM on initial load
  useEffect(() => {
    loadAudio();
    playBGM('menu');
  }, []);

  // Subscribe to i18n changes
  useEffect(() => {
    const unsubscribe = subscribe((newLocale) => {
      setLocaleForRender(newLocale);
    });
    return unsubscribe; // Cleanup on unmount
  }, []);

  // Apply settings on initial load and when settings change
  useEffect(() => {
    setLocale(settings.locale);
    setBGMVolume(settings.bgmVolume);
    setSFXVolume(settings.sfxVolume);
  }, [settings]);

  // Fetch leaderboard data when screen changes to 'leaderboard'
  useEffect(() => {
    if (screen === 'leaderboard') {
      fetch('http://localhost:3001/api/leaderboard')
        .then(res => {
          if (!res.ok) {
            throw new Error('Network response was not ok');
          }
          return res.json();
        })
        .then(data => setLeaderboard(data))
        .catch(error => console.error('Error fetching leaderboard:', error));
    }
  }, [screen]);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onRoomJoined({ roomId, players, playerIndex }) {
      setRoomId(roomId);
      setPlayers(players);
      setMyPlayerIndex(playerIndex);
    }

    function onPlayerJoined(player) {
      setPlayers((prevPlayers) => [...prevPlayers, player]);
    }

    function onPlayerLeft({ playerId }) {
      setPlayers((prevPlayers) => prevPlayers.filter((p) => p.id !== playerId));
    }

    function onGameStarted() {
      setScreen('game');
    }

    function onRoomNotFound() {
      alert('Room not found!');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('roomJoined', onRoomJoined);
    socket.on('playerJoined', onPlayerJoined);
    socket.on('playerLeft', onPlayerLeft);
    socket.on('gameStarted', onGameStarted);
    socket.on('roomNotFound', onRoomNotFound);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('roomJoined', onRoomJoined);
      socket.off('playerJoined', onPlayerJoined);
      socket.off('playerLeft', onPlayerLeft);
      socket.off('gameStarted', onGameStarted);
      socket.off('roomNotFound', onRoomNotFound);
      socket.disconnect();
    };
  }, []);

  const handleSettingsChange = (newSettings: any) => {
    setSettings(newSettings);
  };

  const saveSettings = () => {
    playSFX('click');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setShowSettings(false);
  };

  const resetSettings = () => {
    playSFX('click');
    localStorage.removeItem(SETTINGS_KEY);
    setSettings(getDefaultSettings());
  };

  const startGame = (num) => {
    playSFX('start');
    // Save current names to settings before starting
    const newSettings = { ...settings, p1Name: settings.p1Name, p2Name: settings.p2Name };
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    
    setPlayerNames({ p1: settings.p1Name, p2: settings.p2Name });
    setNumPlayers(num);
    setScreen('game');
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (capturingFor) {
      e.preventDefault();
      const newControls = { ...settings.controls, [capturingFor]: e.key };
      handleSettingsChange({ ...settings, controls: newControls });
      setCapturingFor(null);
    }
    if (capturingForMultiplayer) {
      e.preventDefault();
      const newControls = { ...multiplayerControls, [capturingForMultiplayer]: e.key };
      setMultiplayerControls(newControls);
      setCapturingForMultiplayer(null);
    }
  }, [capturingFor, settings, capturingForMultiplayer, multiplayerControls]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);


  const controlLabelKeys: { [key: string]: string } = {
    p1_left: 'p1LeftLabel',
    p1_right: 'p1RightLabel',
    p2_left: 'p2LeftLabel',
    p2_right: 'p2RightLabel',
  };

  const handleGameOver = (scores, options) => {
    setFinalScores(scores);
    // Only switch to the React game-over screen for multiplayer games.
    // Single-player games will handle their own UI inside the canvas.
    if (options && options.isMultiplayer) {
      setScreen('gameover');
    }
  }

  const renderMenu = () => (
    <div className={`App-menu lang-${settings.locale}`}>
      <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
        <button className="game-button game-button-small" onClick={() => { playSFX('navigate'); setShowSettings(true); }}>{t('settingsTitle')}</button>
      </div>
      <h1>Racing Car</h1>
      <button className="game-button" onClick={() => setScreen('single_player_setup')}>{t('singlePlayer')}</button>
      <button className="game-button" onClick={() => setScreen('multiplayer')}>{t('multiplayer')}</button>
      <button className="game-button" onClick={() => setScreen('leaderboard')}>{t('leaderboard')}</button>
      {showSettings && (
        <div className="settings-modal" style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
          <div style={{ background: '#222831', padding: 20, borderRadius: 8, width: 480, color: '#fff' }}>
            <h2>{t('settingsTitle')}</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="game-button game-button-small" onClick={() => { playSFX('click'); handleSettingsChange({ ...settings, locale: 'en' }); }}>EN</button>
              <button className="game-button game-button-small" onClick={() => { playSFX('click'); handleSettingsChange({ ...settings, locale: 'vi' }); }}>VI</button>
            </div>

            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>{t('bgmVolume')}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={settings.bgmVolume}
                onInput={(e) => setBGMVolume(parseFloat(e.currentTarget.value))}
                onChange={(e) => handleSettingsChange({ ...settings, bgmVolume: parseFloat(e.currentTarget.value) })}
              />
            </div>

            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>{t('sfxVolume')}</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={settings.sfxVolume}
                onInput={(e) => setSFXVolume(parseFloat(e.currentTarget.value))}
                onChange={(e) => handleSettingsChange({ ...settings, sfxVolume: parseFloat(e.currentTarget.value) })}
              />
            </div>
            
            {Object.keys(settings.controls).map(controlKey => (
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} key={controlKey}>
                <label>{t(controlLabelKeys[controlKey])}</label>
                <button className="game-button game-button-small" onClick={() => { playSFX('click'); setCapturingFor(controlKey); }} style={{ width: '120px' }}>
                  {capturingFor === controlKey ? t('pressKey') : settings.controls[controlKey]}
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="game-button" onClick={resetSettings}>{t('resetButton')}</button>
              <button className="game-button" onClick={saveSettings}>{t('saveButton')}</button>
              <button className="game-button" onClick={() => {
                playSFX('navigate');
                const saved = localStorage.getItem(SETTINGS_KEY);
                setSettings(saved ? JSON.parse(saved) : getDefaultSettings());
                setShowSettings(false);
              }}>{t('closeButton')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderLeaderboard = () => (
    <div className={`App-menu lang-${settings.locale}`}>
      <h1>{t('leaderboard')}</h1>
      <div className="leaderboard">
        <table>
          <thead>
            <tr>
              <th>{t('rank')}</th>
              <th>{t('playerName')}</th>
              <th>{t('score')}</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry._id}>
                <td>{index + 1}</td>
                <td>{entry.playerName}</td>
                <td>{Math.floor(entry.score)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="game-button" onClick={() => setScreen('menu')}>{t('back')}</button>
    </div>
  );

  const renderSinglePlayerSetup = () => (
    <div className={`App-menu lang-${settings.locale}`}>
      <h1>{t('singlePlayer')}</h1>
      <div className="player-input">
        <label htmlFor="p1-name">{t('player1Label')}</label>
        <input
          id="p1-name"
          type="text"
          value={settings.p1Name}
          onChange={(e) => handleSettingsChange({ ...settings, p1Name: e.target.value })}
        />
      </div>
      <div className="player-input">
        <label htmlFor="p2-name">{t('player2Label')}</label>
        <input
          id="p2-name"
          type="text"
          value={settings.p2Name}
          onChange={(e) => handleSettingsChange({ ...settings, p2Name: e.target.value })}
        />
      </div>
      <button className="game-button" onClick={() => startGame(1)}>{t('onePlayer')}</button>
      <button className="game-button" onClick={() => startGame(2)}>{t('twoPlayers')}</button>
      <button className="game-button" onClick={() => setScreen('menu')}>{t('back')}</button>
    </div>
  );

  const renderMultiplayer = () => {
    const handleCreateRoom = () => {
      socket.emit('createRoom', { playerName });
    };

    const handleJoinRoom = () => {
      socket.emit('joinRoom', { roomId: roomCodeInput, playerName });
    };

    if (roomId) {
      const isHost = players.length > 0 && players[0].id === socket.id;
      const myControls = myPlayerIndex === 0 ? { left: 'p1_left', right: 'p1_right' } : { left: 'p2_left', right: 'p2_right' };

      return (
        <div className={`App-menu lang-${settings.locale}`}>
          <h2>Room: {roomId}</h2>
          <h3>Players:</h3>
          <ul>
            {players.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ul>
          
          <div className="controls-setup">
            <h4>My Controls</h4>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Left</label>
              <button className="game-button game-button-small" onClick={() => setCapturingForMultiplayer(myControls.left)} style={{ width: '120px' }}>
                {capturingForMultiplayer === myControls.left ? t('pressKey') : multiplayerControls[myControls.left]}
              </button>
            </div>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Right</label>
              <button className="game-button game-button-small" onClick={() => setCapturingForMultiplayer(myControls.right)} style={{ width: '120px' }}>
                {capturingForMultiplayer === myControls.right ? t('pressKey') : multiplayerControls[myControls.right]}
              </button>
            </div>
          </div>

          {isHost && <button className="game-button" onClick={() => socket.emit('startGame', { roomId })}>{t('startGame')}</button>}
          <button className="game-button" onClick={() => {socket.emit('leaveRoom'); setRoomId('');}}>{t('leaveRoom')}</button>
        </div>
      );
    }

    return (
      <div className={`App-menu lang-${settings.locale}`}>
        <div style={{ position: 'absolute', top: '10px', right: '10px', color: isConnected ? 'green' : 'red' }}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        <h1>Multiplayer</h1>
        <div className="player-input">
          <label htmlFor="player-name">{t('playerName')}</label>
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
        </div>
        <button className="game-button" onClick={handleCreateRoom}>{t('createRoom')}</button>
        <div className="player-input">
          <label htmlFor="room-id">{t('roomId')}</label>
          <input
            id="room-id"
            type="text"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
          />
        </div>
        <button className="game-button" onClick={handleJoinRoom}>{t('joinRoom')}</button>
        <button className="game-button" onClick={() => setScreen('menu')}>{t('back')}</button>
      </div>
    );
  };

  const isMultiplayerGame = myPlayerIndex !== null;
  const controlsForGame = isMultiplayerGame ? multiplayerControls : settings.controls;

  if (screen === 'game') {
    return (
      <div className="App">
        <GameCanvas 
          playerNames={isMultiplayerGame ? { p1: players[0]?.name, p2: players[1]?.name } : { p1: settings.p1Name, p2: settings.p2Name }} 
          onGameOver={handleGameOver} 
          numPlayers={isMultiplayerGame ? players.length : numPlayers}
          isMultiplayer={isMultiplayerGame}
          activeControls={controlsForGame}
          myPlayerIndex={myPlayerIndex}
          settings={settings}
        />
      </div>
    );
  }
  
  if (screen === 'gameover') {
    return (
      <div className={`App-menu lang-${settings.locale}`}>
        <h1>Game Over</h1>
        <h3>Scores:</h3>
        <ul>
          {finalScores.map((player) => (
            <li key={player.id}>{player.name}: {Math.floor(player.score)}</li>
          ))}
        </ul>
        <button className="game-button" onClick={() => window.location.reload()}>{t('mainMenu')}</button>
      </div>
    );
  }

  if (screen === 'single_player_setup') {
    return renderSinglePlayerSetup();
  }

  if (screen === 'menu') {
    return renderMenu();
  }

  if (screen === 'multiplayer') {
    return renderMultiplayer();
  }

  if (screen === 'leaderboard') {
    return renderLeaderboard();
  }

  return null;
}

export default App;

