import React, { useState } from 'react';
import { DiceFace, RollResult, SkillName, Character, FateAction } from '../types';
import { Dices, Plus, Minus, Swords, Shield, Sparkles, ArrowRight, Send, X } from 'lucide-react';

interface DiceRollerProps {
  character: Character;
  isLoading: boolean;
  onRollAction: (result: RollResult, skillName: string, skillValue: number, action: FateAction, narrative: string) => void;
  onChatAction: (message: string) => void;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ character, isLoading, onRollAction, onChatAction }) => {
  const [selectedSkill, setSelectedSkill] = useState<SkillName | ''>('');
  const [selectedAction, setSelectedAction] = useState<FateAction>('Overcome');
  const [narrativeText, setNarrativeText] = useState('');
  const [isRolling, setIsRolling] = useState(false);

  // Helper to render a single die face
  const renderDie = (face: DiceFace, index: number) => {
    let content;
    let colorClass = "bg-neutral-100 text-neutral-800 border-2 border-neutral-300";

    if (face === 1) {
      content = <Plus size={24} strokeWidth={4} />;
      colorClass = "bg-green-100 text-green-700 border-2 border-green-500";
    } else if (face === -1) {
      content = <Minus size={24} strokeWidth={4} />;
      colorClass = "bg-red-100 text-red-700 border-2 border-red-500";
    } else {
      content = <div className="w-4 h-4 rounded-full bg-neutral-300" />; // Blank face representation
      colorClass = "bg-neutral-100 text-neutral-400 border-2 border-neutral-300";
    }

    return (
      <div
        key={index}
        className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-sm text-2xl font-bold transition-all duration-300 ${isRolling ? 'animate-spin' : ''} ${colorClass}`}
      >
        {content}
      </div>
    );
  };

  const handleAction = () => {
    if (isLoading || isRolling) return;
    if (!narrativeText.trim()) return;

    if (selectedSkill) {
      // Mechanics Action (Roll + Narrative)
      setIsRolling(true);
      
      setTimeout(() => {
        const faces: DiceFace[] = Array.from({ length: 4 }, () => {
          const r = Math.floor(Math.random() * 3); // 0, 1, 2
          return (r - 1) as DiceFace; // -1, 0, 1
        });

        const total = faces.reduce((acc, curr) => acc + curr, 0);
        const skillValue = character.skills[selectedSkill as SkillName] || 0;
        
        setIsRolling(false);
        onRollAction({ faces, total }, selectedSkill, skillValue, selectedAction, narrativeText);
        setNarrativeText('');
      }, 600);

    } else {
      // Pure Narrative Action (Chat only)
      onChatAction(narrativeText);
      setNarrativeText('');
    }
  };

  // Sort skills by rank for the dropdown
  const sortedSkills = Object.entries(character.skills)
    .sort(([, a], [, b]) => (b as number) - (a as number));

  const actions: { id: FateAction, icon: React.ReactNode, label: string, color: string }[] = [
    { id: 'Overcome', icon: <ArrowRight size={18} />, label: 'Overcome', color: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200' },
    { id: 'Create Advantage', icon: <Sparkles size={18} />, label: 'Create Adv.', color: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' },
    { id: 'Attack', icon: <Swords size={18} />, label: 'Attack', color: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' },
    { id: 'Defend', icon: <Shield size={18} />, label: 'Defend', color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200' },
  ];

  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 space-y-4">
      
      {/* Top Row: Action Type Selectors */}
      <div className="grid grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => setSelectedAction(action.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
              selectedAction === action.id 
                ? 'ring-2 ring-offset-1 ring-blue-500 ' + action.color 
                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="mb-1">{action.icon}</span>
            <span className="text-[10px] font-bold uppercase leading-tight text-center">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Middle Row: Unified Input Area */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Skill Selector */}
        <div className="relative min-w-[160px]">
           <select
            className={`w-full p-3 border rounded-lg appearance-none cursor-pointer font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors ${selectedSkill ? 'bg-blue-50 border-blue-300 text-blue-900' : 'bg-gray-50 border-gray-300 text-gray-500'}`}
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value as SkillName)}
          >
            <option value="">No Roll (Chat)</option>
            <optgroup label="Your Skills">
              {sortedSkills.map(([skill, rank]) => (
                <option key={skill} value={skill}>
                  {skill} (+{rank})
                </option>
              ))}
            </optgroup>
            <optgroup label="Unranked (+0)">
              {Object.values(SkillName).filter(s => character.skills[s] === undefined).map(s => (
                <option key={s} value={s}>{s} (+0)</option>
              ))}
            </optgroup>
          </select>
          {selectedSkill && (
            <button 
              onClick={() => setSelectedSkill('')}
              className="absolute right-8 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 p-1"
              title="Clear Skill (Switch to Chat)"
            >
              <X size={14} />
            </button>
          )}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
             {selectedSkill ? <Dices size={16} className="text-blue-500" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
          </div>
        </div>

        {/* Narrative Input */}
        <div className="flex-1 relative">
           <input
            type="text"
            value={narrativeText}
            onChange={(e) => setNarrativeText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAction()}
            placeholder={selectedSkill ? `Describe your ${selectedAction}...` : "Say or describe something..."}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-inner"
            disabled={isLoading || isRolling}
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleAction}
          disabled={isLoading || isRolling || !narrativeText.trim()}
          className={`px-6 py-3 rounded-lg font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 min-w-[140px] ${
            isLoading || !narrativeText.trim()
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : selectedSkill
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                : 'bg-slate-600 hover:bg-slate-700 hover:shadow-lg'
          }`}
        >
          {isRolling ? (
            'Rolling...' 
          ) : selectedSkill ? (
             <><Dices size={20} /> Roll & Act</>
          ) : (
             <><Send size={20} /> Send</>
          )}
        </button>
      </div>
    </div>
  );
};

export default DiceRoller;