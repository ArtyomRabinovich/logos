import React, { useState } from 'react';
import { SceneAspect } from '../types';
import { Sparkles, Trash2, Zap, Plus } from 'lucide-react';

interface SceneAspectsProps {
  aspects: SceneAspect[];
  onAdd: (aspect: SceneAspect) => void;
  onRemove: (id: string) => void;
}

const SceneAspects: React.FC<SceneAspectsProps> = ({ aspects, onAdd, onRemove }) => {
  const [newAspectName, setNewAspectName] = useState('');
  const [isBoost, setIsBoost] = useState(false);

  const handleAdd = () => {
    if (!newAspectName.trim()) return;
    onAdd({
      id: Date.now().toString(),
      name: newAspectName,
      type: isBoost ? 'Boost' : 'Situation',
      freeInvokes: isBoost ? 1 : 0
    });
    setNewAspectName('');
    setIsBoost(false);
  };

  const boosts = aspects.filter(a => a.type === 'Boost');
  const situationAspects = aspects.filter(a => a.type === 'Situation');

  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
        <Sparkles size={16} /> Scene Aspects
      </h2>

      {/* List */}
      <div className="space-y-2 mb-3">
        {aspects.length === 0 && (
          <p className="text-xs text-gray-400 italic">No active aspects.</p>
        )}
        
        {/* Boosts First */}
        {boosts.map(aspect => (
          <div key={aspect.id} className="bg-green-50 border border-green-200 rounded p-2 flex justify-between items-center group">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-green-700 uppercase flex items-center gap-1">
                <Zap size={10} /> Boost
              </span>
              <span className="text-sm font-medium text-gray-800">{aspect.name}</span>
            </div>
            <button 
              onClick={() => onRemove(aspect.id)}
              className="text-gray-400 hover:text-green-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* Situation Aspects */}
        {situationAspects.map(aspect => (
          <div key={aspect.id} className="bg-yellow-50 border border-yellow-200 rounded p-2 flex justify-between items-center group">
            <div className="flex flex-col">
               <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-yellow-700 uppercase">Aspect</span>
                {aspect.freeInvokes > 0 && (
                     <span className="text-[10px] bg-yellow-200 text-yellow-800 px-1.5 rounded-full font-bold" title="Free Invokes">
                        {aspect.freeInvokes}
                     </span>
                )}
               </div>
              <span className="text-sm font-medium text-gray-800">{aspect.name}</span>
            </div>
            <button 
              onClick={() => onRemove(aspect.id)}
              className="text-gray-400 hover:text-yellow-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Add Form */}
      <div className="flex gap-1 items-center bg-white p-1 rounded border border-gray-200">
        <input 
          type="text" 
          placeholder="New Aspect..." 
          value={newAspectName}
          onChange={(e) => setNewAspectName(e.target.value)}
          className="flex-1 text-xs p-1.5 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button 
            onClick={() => setIsBoost(!isBoost)}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase transition-colors ${isBoost ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-400 border-gray-200'}`}
            title="Toggle Boost"
        >
            Boost
        </button>
        <button 
          onClick={handleAdd}
          disabled={!newAspectName.trim()}
          className="bg-gray-100 hover:bg-blue-50 text-gray-500 hover:text-blue-600 p-1.5 rounded transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

export default SceneAspects;