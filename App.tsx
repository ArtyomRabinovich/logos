import React, { useState, useEffect, useRef } from 'react';
import { Character, ChatMessage, RollResult, ADJECTIVE_LADDER, FateAction } from './types';
import CharacterCreator from './components/CharacterCreator';
import CharacterSheet from './components/CharacterSheet';
import DiceRoller from './components/DiceRoller';
import { initializeAI, startNewGame, sendPlayerMessage } from './services/geminiService';
import { BookOpen, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fatePoints, setFatePoints] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [setting, setSetting] = useState('A noir detective story in 1920s Chicago mixed with Eldritch Horror');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.API_KEY) {
      initializeAI(process.env.API_KEY);
    } else {
        console.warn("API Key missing. AI features will fail.");
        initializeAI("MISSING_KEY"); 
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCharacterComplete = async (newChar: Character) => {
    setCharacter(newChar);
    setFatePoints(newChar.refresh);
    setIsLoading(true);
    
    const introText = await startNewGame(newChar, setting);
    
    setMessages([
      { id: '1', sender: 'gm', text: introText }
    ]);
    setIsLoading(false);
  };

  const handleCharacterUpdate = (updatedChar: Character) => {
    setCharacter(updatedChar);
  };

  // Pure Roleplay / Chat Action
  const handleChatAction = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'player',
      text: message
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const aiResponse = await sendPlayerMessage(userMsg.text);
    
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      sender: 'gm',
      text: aiResponse
    }]);
    setIsLoading(false);
  };

  // Mechanics + Narrative Action
  const handleRollAction = async (roll: RollResult, skillName: string, skillValue: number, action: FateAction, narrative: string) => {
    const total = roll.total + skillValue;
    const ladderResult = ADJECTIVE_LADDER[total as keyof typeof ADJECTIVE_LADDER] || `+${total}`;
    
    // 1. Add Player Narrative first
    const playerMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'player',
      text: narrative
    };
    setMessages(prev => [...prev, playerMsg]);

    // 2. Add System Roll Result
    const rollMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
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
    
    // 3. Construct Context with Current Status (Stress/Consequences)
    const activeConsequences = [
        character?.consequences.mild && `Mild: ${character.consequences.mild}`,
        character?.consequences.moderate && `Moderate: ${character.consequences.moderate}`,
        character?.consequences.severe && `Severe: ${character.consequences.severe}`
    ].filter(Boolean).join(', ');

    const statusContext = `
      PLAYER STATUS:
      Physical Stress: [${character?.physicalStress.map(s => s ? 'X' : 'O').join('')}]
      Mental Stress: [${character?.mentalStress.map(s => s ? 'X' : 'O').join('')}]
      Consequences: ${activeConsequences || 'None'}
    `;

    const systemPrompt = `
      ACTION: ${action}
      SKILL: ${skillName}
      ROLL TOTAL: ${total} (${ladderResult})
      ${statusContext}
      
      Interpret this result based on the player's narrative description and their current status/injuries.
    `;

    // 4. Send to AI
    setIsLoading(true);
    const aiResponse = await sendPlayerMessage(narrative, systemPrompt);
    
    setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        sender: 'gm',
        text: aiResponse
    }]);
    setIsLoading(false);
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
      <div className="w-96 p-4 hidden lg:block h-screen">
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
          <h1 className="text-xl font-bold text-gray-800 fate-font flex items-center gap-2">
            <BookOpen className="text-blue-600" /> 
            Fate Weaver: {character.name}
          </h1>
          <div className="flex items-center gap-4">
             <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button onClick={() => adjustFatePoints(-1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded">-</button>
                <div className="px-3 font-bold text-yellow-600 flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    {fatePoints} FP
                </div>
                <button onClick={() => adjustFatePoints(1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded">+</button>
             </div>
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
            <div className="bg-gray-50 border-t border-gray-200 p-4">
                <div className="max-w-4xl mx-auto space-y-4">
                    <DiceRoller 
                        character={character} 
                        onRollAction={handleRollAction}
                        onChatAction={handleChatAction}
                        isLoading={isLoading}
                    />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;