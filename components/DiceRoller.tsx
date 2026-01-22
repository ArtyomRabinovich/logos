import React, { useState } from 'react';
import { DiceFace, RollResult, SkillName, Character, FateAction, PendingInteraction, GamePhase } from '../types';
import { Dices, Send, Shield, AlertCircle, Flag, Sword, Sparkles, ArrowRight, Zap } from 'lucide-react';

interface DiceRollerProps {
  character: Character;
  isLoading: boolean;
  pendingInteraction: PendingInteraction | null;
  phase: GamePhase;
  onRollAction: (result: RollResult, skillName: string, skillValue: number, action: FateAction, narrative: string) => void;
  onChatAction: (message: string) => void;
  onConcede: () => void;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ 
  character, 
  isLoading, 
  pendingInteraction, 
  phase,
  onRollAction, 
  onChatAction,
  onConcede
}) => {
  const [narrativeText, setNarrativeText] = useState('');
  const [selectedSkillOverride, setSelectedSkillOverride] = useState<SkillName | ''>('');
  const [isRolling, setIsRolling] = useState(false);

  // If we are in an interaction, we are waiting for a ROLL.
  // If we are NOT in an interaction, we are waiting for INTENT (Text).

  const handleRollClick = (skill: SkillName) => {
    if (isLoading || isRolling || !pendingInteraction) return;

    setIsRolling(true);
    setTimeout(() => {
      const faces: DiceFace[] = Array.from({ length: 4 }, () => {
        const r = Math.floor(Math.random() * 3); // 0, 1, 2
        return (r - 1) as DiceFace; // -1, 0, 1
      });

      const total = faces.reduce((acc, curr) => acc + curr, 0);
      const skillValue = character.skills[skill] || 0;
      
      setIsRolling(false);
      // Pass empty narrative for rolls, as the intent was already established
      onRollAction({ faces, total }, skill, skillValue, pendingInteraction.actionType, "");
      setSelectedSkillOverride('');
    }, 600);
  };

  const handleChatSubmit = () => {
    if (!narrativeText.trim() || isLoading) return;
    onChatAction(narrativeText);
    setNarrativeText('');
  };

  const handleFullDefense = () => {
    if (isLoading) return;
    // Sending a structured message helps the AI recognize the mechanic immediately
    onChatAction("[Action] I take the Full Defense action. (Sacrifice main action to gain +2 to all Defense rolls until next turn).");
  };

  const getActionIcon = (type: FateAction) => {
    switch (type) {
      case 'Attack': return <Sword size={18} />;
      case 'Defend': return <Shield size={18} />;
      case 'Create Advantage': return <Sparkles size={18} />;
      case 'Overcome': return <ArrowRight size={18} />;
    }
  };

  const sortedSkills = Object.entries(character.skills)
    .sort(([, a], [, b]) => (b as number) - (a as number));

  // --- STATE 1: PENDING INTERACTION (ROLL REQUIRED) ---
  if (pendingInteraction) {
    const isDefense = pendingInteraction.type === 'Defense';
    const borderColor = isDefense ? 'border-red-400' : 'border-blue-400';
    const bgColor = isDefense ? 'bg-red-50' : 'bg-blue-50';
    const textColor = isDefense ? 'text-red-900' : 'text-blue-900';

    return (
      <div className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden ${borderColor}`}>
        {/* Header */}
        <div className={`p-4 ${bgColor} border-b ${isDefense ? 'border-red-200' : 'border-blue-200'} flex justify-between items-center`}>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-full ${isDefense ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                {getActionIcon(pendingInteraction.actionType)}
             </div>
             <div>
                <h3 className={`font-bold ${textColor} text-lg flex items-center gap-2`}>
                   {pendingInteraction.actionType.toUpperCase()}
                   <span className="text-sm font-normal opacity-80">vs {pendingInteraction.difficultyLabel} ({pendingInteraction.difficulty})</span>
                </h3>
                <p className={`text-sm ${textColor} opacity-80`}>{pendingInteraction.description}</p>
             </div>
          </div>
          {phase === 'Conflict' && pendingInteraction.type === 'Action' && (
             <button
               onClick={() => {
                  if (window.confirm("Concede the conflict? You lose, but choose how you exit.")) onConcede();
               }}
               className="text-xs flex items-center gap-1 text-gray-500 hover:text-red-600 px-3 py-1 border rounded bg-white hover:bg-red-50 transition-colors"
             >
               <Flag size={12} /> Concede
             </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
           <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {isDefense ? "Choose Defense Skill" : "Choose Method (Skill)"}
              </span>
              
              <div className="flex flex-wrap gap-3">
                 {/* Suggested Skills */}
                 {pendingInteraction.allowedSkills.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => handleRollClick(skill)}
                      disabled={isRolling}
                      className={`relative group flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all shadow-sm hover:shadow-md
                        ${isDefense 
                            ? 'border-red-100 bg-white hover:border-red-500 text-gray-700' 
                            : 'border-blue-100 bg-white hover:border-blue-500 text-gray-700'}
                      `}
                    >
                       <Zap size={16} className={isDefense ? "text-red-400" : "text-blue-400"} />
                       <span className="font-bold">{skill}</span>
                       <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold ${isDefense ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {character.skills[skill] ? `+${character.skills[skill]}` : '+0'}
                       </span>
                    </button>
                 ))}

                 {/* Override Dropdown */}
                 <div className="relative">
                    <select 
                        className="appearance-none pl-3 pr-8 py-3 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors cursor-pointer"
                        value={selectedSkillOverride}
                        onChange={(e) => {
                            const val = e.target.value as SkillName;
                            setSelectedSkillOverride(val);
                            if (val) handleRollClick(val);
                        }}
                    >
                        <option value="">Other Skill...</option>
                        {sortedSkills.map(([s, r]) => (
                            <option key={s} value={s}>{s} (+{r})</option>
                        ))}
                    </select>
                 </div>
              </div>
           </div>
           
           {isRolling && (
               <div className="flex items-center gap-2 text-gray-500 text-sm animate-pulse">
                   <Dices size={16} className="animate-spin" /> Rolling the bones...
               </div>
           )}
        </div>
      </div>
    );
  }

  // --- STATE 2: NARRATIVE INTENT (TEXT INPUT) ---
  return (
    <div className="bg-white p-2 rounded-xl shadow-md border border-gray-200 flex gap-2 items-center">
       <div className="relative flex-1">
         <input
          type="text"
          value={narrativeText}
          onChange={(e) => setNarrativeText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
          placeholder="What does your character do?"
          className="w-full p-3 text-gray-800 bg-transparent focus:outline-none"
          disabled={isLoading}
          autoFocus
        />
       </div>
       
       <button
        onClick={handleFullDefense}
        disabled={isLoading}
        className="p-3 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-blue-600 border border-gray-200 transition-colors"
        title="Full Defense: Sacrifice your action to get +2 to all defense rolls until next turn."
      >
        <Shield size={20} />
      </button>

      <button
        onClick={handleChatSubmit}
        disabled={isLoading || !narrativeText.trim()}
        className={`p-3 rounded-lg transition-all ${
            isLoading || !narrativeText.trim() 
            ? 'bg-gray-100 text-gray-400' 
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
        }`}
      >
        <Send size={20} />
      </button>
    </div>
  );
};

export default DiceRoller;