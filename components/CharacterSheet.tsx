import React, { useState } from 'react';
import { Character, ADJECTIVE_LADDER, Item, ItemType } from '../types';
import { User, Shield, Zap, Heart, Book, Package, Plus, Trash2, Sword, Briefcase, Pill, CheckCircle, Circle } from 'lucide-react';

interface CharacterSheetProps {
  character: Character;
  fatePoints: number;
  onUpdate: (updatedCharacter: Character) => void;
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, fatePoints, onUpdate }) => {
  // New Item State
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('gear');
  const [newItemBonus, setNewItemBonus] = useState('');

  // Sort skills by rank descending
  const skillsByRank: Record<number, string[]> = {};
  Object.entries(character.skills).forEach(([name, rank]) => {
    if (!skillsByRank[rank as number]) skillsByRank[rank as number] = [];
    skillsByRank[rank as number].push(name);
  });

  const ranks = Object.keys(skillsByRank).map(Number).sort((a, b) => b - a);

  const handleConsequenceChange = (type: 'mild' | 'moderate' | 'severe', value: string) => {
    onUpdate({
      ...character,
      consequences: {
        ...character.consequences,
        [type]: value
      }
    });
  };

  const toggleStress = (type: 'physical' | 'mental', index: number) => {
    const key = type === 'physical' ? 'physicalStress' : 'mentalStress';
    const newStress = [...character[key]];
    newStress[index] = !newStress[index];
    
    onUpdate({
      ...character,
      [key]: newStress
    });
  };

  // Inventory Handlers
  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const newItem: Item = {
      id: Date.now().toString(),
      name: newItemName,
      type: newItemType,
      description: '',
      bonus: newItemBonus ? parseInt(newItemBonus) : 0,
      equipped: false
    };

    onUpdate({
      ...character,
      inventory: [...character.inventory, newItem]
    });

    setNewItemName('');
    setNewItemBonus('');
    setNewItemType('gear');
  };

  const handleRemoveItem = (id: string) => {
    onUpdate({
      ...character,
      inventory: character.inventory.filter(item => item.id !== id)
    });
  };

  const handleClearInventory = () => {
    if (window.confirm("Are you sure you want to remove all items?")) {
      onUpdate({
        ...character,
        inventory: []
      });
    }
  };

  const handleToggleEquip = (id: string) => {
    onUpdate({
      ...character,
      inventory: character.inventory.map(item => 
        item.id === id ? { ...item, equipped: !item.equipped } : item
      )
    });
  };

  const getItemIcon = (type: ItemType) => {
    switch (type) {
      case 'weapon': return <Sword size={14} />;
      case 'armor': return <Shield size={14} />;
      case 'consumable': return <Pill size={14} />;
      default: return <Briefcase size={14} />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-t-8 border-blue-600 overflow-hidden h-full flex flex-col">
      <div className="p-6 bg-slate-50 border-b border-gray-200">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 fate-font">{character.name}</h2>
            <p className="text-sm text-gray-500 italic">{character.sex}</p>
          </div>
          <div className="flex flex-col items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
            <span className="text-xs font-bold text-yellow-700 uppercase tracking-wider">Fate Points</span>
            <span className="text-xl font-bold text-yellow-600">{fatePoints}</span>
          </div>
        </div>
        
        <div className="grid gap-2 mt-4">
          <div className="bg-blue-50 p-2 rounded border border-blue-100">
            <span className="text-xs font-bold text-blue-800 uppercase block">High Concept</span>
            <span className="text-gray-800 font-medium">{character.highConcept}</span>
          </div>
          <div className="bg-red-50 p-2 rounded border border-red-100">
            <span className="text-xs font-bold text-red-800 uppercase block">Trouble</span>
            <span className="text-gray-800 font-medium">{character.trouble}</span>
          </div>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1 space-y-6">
        
        {/* Skills */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase border-b border-gray-200 pb-1 mb-3">
            <Zap size={16} /> Skills
          </h3>
          <div className="space-y-2">
            {ranks.map(rank => (
              <div key={rank} className="flex text-sm">
                <div className="w-24 font-bold text-gray-400 text-right pr-3 pt-1 border-r border-gray-200">
                  {ADJECTIVE_LADDER[rank as keyof typeof ADJECTIVE_LADDER] || `+${rank}`} (+{rank})
                </div>
                <div className="flex-1 pl-3 py-1 flex flex-wrap gap-2">
                  {skillsByRank[rank].map(skill => (
                    <span key={skill} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Aspects */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase border-b border-gray-200 pb-1 mb-3">
            <User size={16} /> Other Aspects
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold uppercase">Relationship</span>
              <span className="text-gray-800 italic">"{character.relationship}"</span>
            </li>
            <li className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold uppercase">Aspect</span>
              <span className="text-gray-800 italic">"{character.aspect1}"</span>
            </li>
            <li className="flex flex-col">
              <span className="text-xs text-gray-400 font-bold uppercase">Aspect</span>
              <span className="text-gray-800 italic">"{character.aspect2}"</span>
            </li>
          </ul>
        </section>

        {/* Backstory */}
        {character.backstory && (
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase border-b border-gray-200 pb-1 mb-3">
              <Book size={16} /> Backstory
            </h3>
            <p className="text-sm text-gray-600 italic leading-relaxed">
              {character.backstory}
            </p>
          </section>
        )}

        {/* Stress */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase border-b border-gray-200 pb-1 mb-3">
            <Heart size={16} /> Stress
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold text-gray-600 mb-1">Physical</div>
              <div className="flex gap-1">
                {character.physicalStress.map((marked, i) => (
                  <button 
                    key={i} 
                    onClick={() => toggleStress('physical', i)}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center font-bold text-sm transition-colors ${marked ? 'bg-red-500 border-red-600 text-white hover:bg-red-600' : 'bg-white border-gray-300 text-gray-300 hover:border-red-300 hover:text-red-200'}`}
                  >
                    1
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-600 mb-1">Mental</div>
              <div className="flex gap-1">
                {character.mentalStress.map((marked, i) => (
                  <button 
                    key={i} 
                    onClick={() => toggleStress('mental', i)}
                    className={`w-8 h-8 rounded border-2 flex items-center justify-center font-bold text-sm transition-colors ${marked ? 'bg-blue-500 border-blue-600 text-white hover:bg-blue-600' : 'bg-white border-gray-300 text-gray-300 hover:border-blue-300 hover:text-blue-200'}`}
                  >
                    1
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
        
         {/* Consequences */}
         <section>
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase border-b border-gray-200 pb-1 mb-3">
            <Shield size={16} /> Consequences
          </h3>
          <div className="space-y-3 text-sm">
             {/* Mild */}
             <div className="flex gap-2 items-center">
                <span className="w-8 h-8 flex-shrink-0 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold" title="Absorbs 2 Shifts">-2</span>
                <input 
                    type="text" 
                    placeholder="Mild Consequence..." 
                    value={character.consequences.mild}
                    onChange={(e) => handleConsequenceChange('mild', e.target.value)}
                    className={`w-full p-1.5 border rounded text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors ${character.consequences.mild ? 'border-red-300 bg-red-50 text-red-800 font-medium' : 'border-gray-200 text-gray-600'}`}
                />
             </div>

             {/* Moderate */}
             <div className="flex gap-2 items-center">
                <span className="w-8 h-8 flex-shrink-0 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold" title="Absorbs 4 Shifts">-4</span>
                <input 
                    type="text" 
                    placeholder="Moderate Consequence..." 
                    value={character.consequences.moderate}
                    onChange={(e) => handleConsequenceChange('moderate', e.target.value)}
                    className={`w-full p-1.5 border rounded text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors ${character.consequences.moderate ? 'border-red-300 bg-red-50 text-red-800 font-medium' : 'border-gray-200 text-gray-600'}`}
                />
             </div>

             {/* Severe */}
             <div className="flex gap-2 items-center">
                <span className="w-8 h-8 flex-shrink-0 rounded bg-gray-200 text-gray-500 flex items-center justify-center text-xs font-bold" title="Absorbs 6 Shifts">-6</span>
                <input 
                    type="text" 
                    placeholder="Severe Consequence..." 
                    value={character.consequences.severe}
                    onChange={(e) => handleConsequenceChange('severe', e.target.value)}
                    className={`w-full p-1.5 border rounded text-sm focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors ${character.consequences.severe ? 'border-red-300 bg-red-50 text-red-800 font-medium' : 'border-gray-200 text-gray-600'}`}
                />
             </div>
          </div>
        </section>

        {/* Inventory */}
        <section>
          <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase">
              <Package size={16} /> Inventory
            </h3>
            {character.inventory.length > 0 && (
              <button 
                onClick={handleClearInventory}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 hover:bg-red-50 px-2 py-0.5 rounded transition-colors"
                title="Remove all items"
              >
                <Trash2 size={12} /> Clear All
              </button>
            )}
          </div>
          
          <div className="space-y-2 mb-4">
            {character.inventory.length === 0 && (
              <p className="text-xs text-gray-400 italic">Inventory is empty.</p>
            )}
            {character.inventory.map(item => (
              <div 
                key={item.id} 
                className={`flex items-center justify-between p-2 rounded border transition-all ${
                  item.equipped 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleToggleEquip(item.id)}
                    className={`transition-colors ${item.equipped ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}
                    title={item.equipped ? "Unequip" : "Equip"}
                  >
                    {item.equipped ? <CheckCircle size={18} /> : <Circle size={18} />}
                  </button>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium flex items-center gap-2 ${item.equipped ? 'text-blue-800' : 'text-gray-700'}`}>
                      {getItemIcon(item.type)} {item.name}
                    </span>
                    <div className="flex gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                      <span>{item.type}</span>
                      {item.bonus ? <span className="text-green-600">+{item.bonus}</span> : null}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                  title="Remove Item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Item Form */}
          <div className="flex gap-2 items-center bg-gray-50 p-2 rounded border border-gray-200">
            <div className="flex-1 space-y-2">
              <input 
                type="text" 
                placeholder="Item Name" 
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full p-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <select 
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as ItemType)}
                  className="p-1.5 text-xs border border-gray-300 rounded flex-1 focus:outline-none bg-white"
                >
                  <option value="weapon">Weapon</option>
                  <option value="armor">Armor</option>
                  <option value="gear">Gear</option>
                  <option value="consumable">Consumable</option>
                </select>
                <input 
                  type="number" 
                  placeholder="Bonus (+)" 
                  value={newItemBonus}
                  onChange={(e) => setNewItemBonus(e.target.value)}
                  className="w-16 p-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <button 
              onClick={handleAddItem}
              disabled={!newItemName.trim()}
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed h-full flex items-center justify-center"
            >
              <Plus size={20} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CharacterSheet;