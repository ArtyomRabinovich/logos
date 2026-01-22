import React from 'react';
import { NPC, ADJECTIVE_LADDER } from '../types';
import { Skull, Heart, Brain, Shield, Trash2 } from 'lucide-react';

interface NPCSheetProps {
  npc: NPC;
  onUpdate: (npc: NPC) => void;
  onRemove: (id: string) => void;
}

const NPCSheet: React.FC<NPCSheetProps> = ({ npc, onUpdate, onRemove }) => {
  
  const togglePhysicalStress = (index: number) => {
    const newStress = [...npc.physicalStress];
    newStress[index] = !newStress[index];
    onUpdate({ ...npc, physicalStress: newStress });
  };

  const toggleMentalStress = (index: number) => {
    const newStress = [...npc.mentalStress];
    newStress[index] = !newStress[index];
    onUpdate({ ...npc, mentalStress: newStress });
  };

  const getAdjective = (val: number) => 
    ADJECTIVE_LADDER[val as keyof typeof ADJECTIVE_LADDER] || `+${val}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
      {/* Header */}
      <div className="bg-red-50 p-3 border-b border-red-100 flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-800 fate-font flex items-center gap-2">
            <Skull size={16} className="text-red-500" />
            {npc.name}
          </h3>
          <p className="text-xs text-gray-600 italic">{npc.description}</p>
        </div>
        <button 
          onClick={() => onRemove(npc.id)}
          className="text-gray-400 hover:text-red-500 p-1"
          title="Remove NPC"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Aspects */}
        {npc.aspects.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Aspects</div>
            <div className="flex flex-wrap gap-1">
              {npc.aspects.map((aspect, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-200">
                  {aspect}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Top Skills</div>
            <div className="grid grid-cols-2 gap-1">
                {Object.entries(npc.skills).map(([skill, rank]) => (
                    <div key={skill} className="flex justify-between text-xs bg-slate-50 px-2 py-1 rounded">
                        <span className="font-medium text-gray-700">{skill}</span>
                        <span className="font-bold text-slate-600">+{rank}</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Stress Tracks */}
        <div className="grid grid-cols-2 gap-2">
            {/* Physical */}
            <div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    <Heart size={10} /> Physical
                </div>
                <div className="flex gap-1">
                    {npc.physicalStress.map((marked, i) => (
                        <button 
                            key={i}
                            onClick={() => togglePhysicalStress(i)}
                            className={`w-6 h-6 rounded border flex items-center justify-center text-xs font-bold transition-colors ${
                                marked ? 'bg-red-500 border-red-600 text-white' : 'bg-white border-gray-300 text-gray-300 hover:border-red-300'
                            }`}
                        >
                            1
                        </button>
                    ))}
                </div>
            </div>

            {/* Mental */}
            <div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    <Brain size={10} /> Mental
                </div>
                <div className="flex gap-1">
                    {npc.mentalStress.map((marked, i) => (
                        <button 
                            key={i}
                            onClick={() => toggleMentalStress(i)}
                            className={`w-6 h-6 rounded border flex items-center justify-center text-xs font-bold transition-colors ${
                                marked ? 'bg-blue-500 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-300 hover:border-blue-300'
                            }`}
                        >
                            1
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Consequences */}
        {npc.consequences.length > 0 && (
             <div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    <Shield size={10} /> Consequences
                </div>
                <div className="space-y-1">
                    {npc.consequences.map((c, i) => (
                         <div key={i} className="text-xs text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded italic">
                            {c}
                         </div>
                    ))}
                </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default NPCSheet;