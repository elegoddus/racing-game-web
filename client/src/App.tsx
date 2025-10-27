import { useState, useEffect, useCallback } from 'react';
import { t, getLocale, setLocale, subscribe } from './i18n';
import './App.css';
import GameCanvas from './components/GameCanvas.jsx';
import { loadAudio, playBGM, playSFX, setBGMVolume, setSFXVolume, getBGMVolume, getSFXVolume } from './game/audio.js';

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
  const [, setLocaleForRender] = useState(getLocale());

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

  const startGame = () => {
    playSFX('start');
    // Save current names to settings before starting
    const newSettings = { ...settings, p1Name: settings.p1Name, p2Name: settings.p2Name };
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    setPlayerNames({ p1: settings.p1Name, p2: settings.p2Name });
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (capturingFor) {
      e.preventDefault();
      const newControls = { ...settings.controls, [capturingFor]: e.key };
      handleSettingsChange({ ...settings, controls: newControls });
      setCapturingFor(null);
    }
  }, [capturingFor, settings]);

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

  if (playerNames) {
    return (
      <div className="App">
        <GameCanvas playerNames={playerNames} />
      </div>
    );
  }

  return (
    <div className={`App-menu lang-${settings.locale}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '480px' }}>
        <h1>Racing Car</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="game-button" onClick={() => { playSFX('navigate'); setShowSettings(true); }}>{t('settingsTitle')}</button>
        </div>
      </div>
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
      <button className="game-button" onClick={startGame}>{t('start')}</button>
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
                // Re-load settings from storage to discard changes
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
}

export default App;
