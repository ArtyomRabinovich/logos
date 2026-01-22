import React, { useState, useEffect, useRef } from 'react';
import { Character, ChatMessage, RollResult, ADJECTIVE_LADDER, FateAction, GamePhase, PendingInteraction, NPC, SceneAspect } from './types';
import CharacterCreator from './components/CharacterCreator';
import CharacterSheet from './components/CharacterSheet';
import DiceRoller from './components/DiceRoller';
import NPCSheet from './components/NPCSheet';
import SceneAspects from './components/SceneAspects';
import { initializeAI, startNewGame, sendPlayerMessage } from './services/geminiService';
import { BookOpen, RotateCcw, Flag, Map, Users } from 'lucide-react';

const App: React.FC = () => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fatePoints, setFatePoints] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [setting, setSetting] = useState('A noir detective story in 1920s Chicago mixed with Eldritch Horror');
  
  // Game State
  const [phase, setPhase] = useState<GamePhase>('Narrative');
  const [pendingInteraction, setPendingInteraction] = useState<PendingInteraction | null>(null);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [sceneAspects, setSceneAspects] = useState<SceneAspect[]>([]);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.API_KEY) {
      initializeAI(process.env.API_KEY);
    } else {
        console.warn("API Key missing.");
        initializeAI("MISSING_KEY"); 
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCharacterComplete = async (newChar: Character) => {
    setCharacter(newChar);
    setFatePoints(newChar.refresh);
    setIsLoading(true);
    
    // Initial Start
    const response = await startNewGame(newChar, setting);
    // Parse initial response (usually narrative only)
    const metaRegex = /\[META\]([\s\S]*?)\[\/META\]/;
    const cleanText = response.replace(metaRegex, '').trim();

    setMessages([{ id: '1', sender: 'gm', text: cleanText }]);
    setIsLoading(false);
  };

  const handleCharacterUpdate = (updatedChar: Character) => {
    setCharacter(updatedChar);
  };

  const handleEndScene = () => {
    if (!character) return;
    
    // Clear Stress for PC
    const newChar = { ...character };
    newChar.physicalStress = newChar.physicalStress.map(() => false);
    newChar.mentalStress = newChar.mentalStress.map(() => false);
    setCharacter(newChar);

    // Clear NPCs Stress
    const updatedNPCs = npcs.map(npc => ({
        ...npc,
        physicalStress: npc.physicalStress.map(() => false),
        mentalStress: npc.mentalStress.map(() => false)
    }));
    setNpcs(updatedNPCs);

    // Clear Scene Aspects (Boosts/Situation Aspects expire at scene end typically)
    setSceneAspects([]);

    // Notify AI
    const sysMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'system',
        text: "--- SCENE END ---\nStress tracks cleared. Scene Aspects cleared."
    };
    setMessages(prev => [...prev, sysMsg]);
    
    handleInput("The scene ends. We move to the next scene...", "PLAYER_TRIGGERED_SCENE_END");
  };

  const handleConcede = () => {
      handleInput("I Concede the conflict.", "PLAYER_CONCEDES");
      // Add Fate Points per concession rules (simplified: +1 + consequences)
      setFatePoints(prev => prev + 1); 
  };

  const handleNPCUpdate = (updatedNPC: NPC) => {
      setNpcs(prev => prev.map(n => n.id === updatedNPC.id ? updatedNPC : n));
  };

  const handleNPCRemove = (id: string) => {
      setNpcs(prev => prev.filter(n => n.id !== id));
  };
  
  const handleAspectAdd = (aspect: SceneAspect) => {
      setSceneAspects(prev => [...prev, aspect]);
  };

  const handleAspectRemove = (id: string) => {
      setSceneAspects(prev => prev.filter(a => a.id !== id));
  };

  // Main Loop Entry Point
  const handleInput = async (inputText: string, systemContext?: string) => {
    if (!inputText.trim() || isLoading) return;

    // 1. Add Player Message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'player',
      text: inputText
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setPendingInteraction(null); // Clear any pending interaction while thinking

    // 2. Send to AI (Include Current NPC & Aspect State)
    const response = await sendPlayerMessage(inputText, systemContext, npcs, sceneAspects);

    // 3. Process AI Response
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      sender: 'gm',
      text: response.text
    }]);

    // 4. Update Game State based on META
    if (response.meta) {
        setPhase(response.meta.phase || 'Narrative');
        
        // Handle Interaction
        if (response.meta.interaction && response.meta.interaction.type) {
            const i = response.meta.interaction;
            setPendingInteraction({
                type: i.type,
                actionType: i.actionType,
                allowedSkills: i.allowedSkills || [],
                difficulty: i.difficulty || 0,
                difficultyLabel: ADJECTIVE_LADDER[i.difficulty as keyof typeof ADJECTIVE_LADDER] || `+${i.difficulty}`,
                description: i.reason || "Make a roll"
            });
        }

        // Handle Scene Data (NPCs & Aspects)
        if (response.meta.sceneData) {
            if (response.meta.sceneData.npcs) {
                setNpcs(response.meta.sceneData.npcs);
            }
            if (response.meta.sceneData.aspects) {
                setSceneAspects(response.meta.sceneData.aspects);
            }
        }
    }
    
    setIsLoading(false);
  };

  // Mechanics Resolution
  const handleRollAction = async (roll: RollResult, skillName: string, skillValue: number, action: FateAction, narrative: string) => {
    const total = roll.total + skillValue;
    const ladderResult = ADJECTIVE_LADDER[total as keyof typeof ADJECTIVE_LADDER] || `+${total}`;
    
    // Display System Roll
    const rollMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'system',
      text: `[${action}] Rolled ${skillName} (${skillValue > 0 ? '+' : ''}${skillValue}). Result: ${ladderResult} (${total})`,
      roll: {
        skill: skillName,
        bonus: skillValue,
        faces: roll.faces,
        result: roll.total,
        total: total,
        action: action
      }
    };
    setMessages(prev => [...prev, rollMsg]);

    // Build Context for AI
    const context = `
      PLAYER ROLL RESOLUTION:
      Action: ${action}
      Skill: ${skillName}
      Total: ${total}
      
      Previous Context: ${pendingInteraction?.description}
      Target Difficulty: ${pendingInteraction?.difficulty}
      
      Narrate the outcome of this roll based on Success, Tie, or Failure.
      If Create Advantage was successful, ensure you add the Situation Aspect or Boost to 'sceneData'.
      If this was a Conflict action, proceed to the GM Turn (Enemy Actions).
    `;

    // Feed back into loop
    handleInput(narrative || "(Rolling dice)", context);
  };

  const adjustFatePoints = (delta: number) => {
    setFatePoints(prev => Math.max(0, prev + delta));
  };

  if (!character) {
    return (
      <div className="min-h-screen bg-fate-dark p-4 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white fate-font mb-2">Fate Weaver AI</h1>
            <p className="text-gray-400">Powered by Gemini & Fate Condensed</p>
        </div>
        <div className="w-full max-w-2xl bg-white p-4 rounded-t-xl mb-0 border-b">
            <label className="block text-sm font-bold text-gray-700 mb-1">Campaign Setting</label>
            <input 
                className="w-full p-2 border rounded bg-gray-50 text-sm"
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                placeholder="Describe the world..."
            />
        </div>
        <CharacterCreator onComplete={handleCharacterComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fate-dark flex overflow-hidden">
      {/* Sidebar - Character Sheet */}
      <div className="w-80 2xl:w-96 p-4 hidden lg:block h-screen flex-shrink-0">
        <CharacterSheet 
            character={character} 
            fatePoints={fatePoints} 
            onUpdate={handleCharacterUpdate}
        />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col h-screen bg-fate-paper relative">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-4 shadow-sm flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold text-gray-800 fate-font flex items-center gap-2">
                <BookOpen className="text-blue-600" /> 
                {character.name}
             </h1>
             <div className="px-3 py-1 bg-gray-100 rounded text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Map size={14} /> Phase: {phase}
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button 
                onClick={handleEndScene}
                className="text-xs font-bold text-gray-500 hover:text-blue-600 flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-50 transition-colors"
                title="Clears all Stress & Scene Aspects"
             >
                End Scene
             </button>
             <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button onClick={() => adjustFatePoints(-1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded">-</button>
                <div className="px-3 font-bold text-yellow-600 flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    {fatePoints} FP
                </div>
                <button onClick={() => adjustFatePoints(1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded">+</button>
             </div>
             <button 
               onClick={() => setShowRightSidebar(!showRightSidebar)}
               className="lg:hidden p-2 rounded bg-gray-100 text-gray-600"
             >
                <Users size={18} />
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
            {messages.map((msg) => (
                <div
                key={msg.id}
                className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}
                >
                <div
                    className={`max-w-[80%] rounded-lg p-4 shadow-sm ${
                    msg.sender === 'player'
                        ? 'bg-blue-600 text-white'
                        : msg.sender === 'system'
                        ? 'bg-gray-200 text-gray-800 font-mono text-sm border-l-4 border-gray-500'
                        : 'bg-white text-gray-800 border border-gray-100'
                    }`}
                >
                    {msg.sender === 'gm' && (
                        <div className="text-xs font-bold text-blue-600 mb-1 uppercase tracking-wider">Game Master</div>
                    )}
                    {msg.sender === 'system' && (
                        <div className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                            <RotateCcw size={12} /> System Roll
                        </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed">
                        {msg.text}
                    </div>
                </div>
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                </div>
                </div>
            )}
            <div ref={messagesEndRef} />
            </div>

            {/* Narrative Action Area */}
            <div className={`border-t p-4 transition-colors ${pendingInteraction ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="max-w-4xl mx-auto space-y-4">
                    <DiceRoller 
                        character={character} 
                        isLoading={isLoading}
                        pendingInteraction={pendingInteraction}
                        phase={phase}
                        onRollAction={handleRollAction}
                        onChatAction={(text) => handleInput(text)}
                        onConcede={handleConcede}
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Right Sidebar - NPCs & Scene */}
      {showRightSidebar && (
        <div className="w-72 2xl:w-80 bg-gray-100 border-l border-gray-200 p-4 overflow-y-auto hidden lg:block flex-shrink-0">
            {/* Scene Aspects & Boosts */}
            <SceneAspects 
                aspects={sceneAspects} 
                onAdd={handleAspectAdd} 
                onRemove={handleAspectRemove}
            />

            <hr className="border-gray-300 my-4" />

            <h2 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                <Users size={16} /> Scene / NPCs
            </h2>
            
            {npcs.length === 0 ? (
                <div className="text-center text-gray-400 text-sm italic py-4">
                    No active NPCs in scene.
                </div>
            ) : (
                npcs.map(npc => (
                    <NPCSheet 
                        key={npc.id} 
                        npc={npc} 
                        onUpdate={handleNPCUpdate} 
                        onRemove={handleNPCRemove}
                    />
                ))
            )}
        </div>
      )}
    </div>
  );
};

export default App;