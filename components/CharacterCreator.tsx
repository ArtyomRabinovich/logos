import React, { useState } from 'react';
import { Character, SkillName, SKILL_LIST } from '../types';
import { ChevronRight, ChevronLeft, Check, Sparkles, Loader2 } from 'lucide-react';
import { generateBackstory } from '../services/geminiService';

interface CharacterCreatorProps {
  onComplete: (character: Character) => void;
}

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState<Partial<Character>>({
    name: '',
    pronouns: '',
    highConcept: '',
    trouble: '',
    relationship: '',
    aspect1: '',
    aspect2: '',
    backstory: '',
    skills: {},
    stunts: ['', '', ''],
  });

  // Skills need specific slots: 1 Great (+4), 2 Good (+3), 3 Fair (+2), 4 Average (+1)
  const [skillSlots, setSkillSlots] = useState<{ [rank: number]: (SkillName | '')[] }>({
    4: [''],
    3: ['', ''],
    2: ['', '', ''],
    1: ['', '', '', ''],
  });

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleGenerateBackstory = async () => {
    setIsGenerating(true);
    const story = await generateBackstory(formData);
    setFormData(prev => ({ ...prev, backstory: story }));
    setIsGenerating(false);
  };

  const updateSkillSlot = (rank: number, index: number, skill: string) => {
    const newSlots = { ...skillSlots };
    newSlots[rank][index] = skill as SkillName | '';
    setSkillSlots(newSlots);
  };

  const getAvailableSkills = (currentRank: number, currentIndex: number) => {
    // Flatten all selected skills except the current one
    const selected = new Set<string>();
    (Object.entries(skillSlots) as [string, (SkillName | '')[]][]).forEach(([r, slots]) => {
      slots.forEach((s, idx) => {
        if (s && !(Number(r) === currentRank && idx === currentIndex)) {
          selected.add(s);
        }
      });
    });
    return SKILL_LIST.filter(s => !selected.has(s));
  };

  const finishCreation = () => {
    // Compile skills
    const skills: { [key in SkillName]?: number } = {};
    (Object.entries(skillSlots) as [string, (SkillName | '')[]][]).forEach(([rank, slotSkills]) => {
      slotSkills.forEach(skillName => {
        if (skillName) {
            skills[skillName as SkillName] = Number(rank);
        }
      });
    });

    const physique = skills[SkillName.Physique] || 0;
    const will = skills[SkillName.Will] || 0;

    const calculateBoxes = (rank: number) => {
      if (rank <= 0) return 3;
      if (rank <= 2) return 4;
      return 6; 
    };

    const char: Character = {
      name: formData.name || 'Unnamed Hero',
      pronouns: formData.pronouns || 'they/them',
      highConcept: formData.highConcept || 'Unknown',
      trouble: formData.trouble || 'Unknown',
      relationship: formData.relationship || 'None',
      aspect1: formData.aspect1 || '',
      aspect2: formData.aspect2 || '',
      backstory: formData.backstory || '',
      skills: skills,
      stunts: (formData.stunts || []).filter(s => s.trim() !== ''),
      refresh: 3,
      physicalStress: Array(calculateBoxes(physique)).fill(false),
      mentalStress: Array(calculateBoxes(will)).fill(false),
      consequences: { mild: '', moderate: '', severe: '' },
      inventory: []
    };

    onComplete(char);
  };

  const renderStep1_Basics = () => (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 fate-font">Who are you?</h2>
      <p className="text-gray-600 text-sm">Define your identity in the world.</p>
      <div>
        <label className="block text-sm font-medium text-gray-700">Name</label>
        <input
          type="text"
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g.  Cynere"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Pronouns</label>
        <input
          type="text"
          className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          value={formData.pronouns}
          onChange={e => setFormData({ ...formData, pronouns: e.target.value })}
          placeholder="e.g. She/Her"
        />
      </div>
    </div>
  );

  const renderStep2_Aspects = () => (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 fate-font">Aspects</h2>
      <p className="text-gray-600 text-sm">Phrases that describe who you are and what happens to you.</p>
      
      <div>
        <label className="block text-sm font-bold text-blue-800">High Concept (Required)</label>
        <p className="text-xs text-gray-500 mb-1">Your main role (e.g., "Wizard for Hire", "Knight of the Cross").</p>
        <input type="text" className="w-full p-2 border border-gray-300 rounded" value={formData.highConcept} onChange={e => setFormData({ ...formData, highConcept: e.target.value })} />
      </div>

      <div>
        <label className="block text-sm font-bold text-red-800">Trouble (Required)</label>
        <p className="text-xs text-gray-500 mb-1">What complicates your life (e.g., "The White Council Hates Me", "Sucker for a Pretty Face").</p>
        <input type="text" className="w-full p-2 border border-gray-300 rounded" value={formData.trouble} onChange={e => setFormData({ ...formData, trouble: e.target.value })} />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700">Relationship</label>
        <p className="text-xs text-gray-500 mb-1">A connection to another person or group.</p>
        <input type="text" className="w-full p-2 border border-gray-300 rounded" value={formData.relationship} onChange={e => setFormData({ ...formData, relationship: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
           <label className="block text-sm font-medium text-gray-700">Free Aspect 1</label>
           <input type="text" className="w-full p-2 border border-gray-300 rounded" value={formData.aspect1} onChange={e => setFormData({ ...formData, aspect1: e.target.value })} />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700">Free Aspect 2</label>
           <input type="text" className="w-full p-2 border border-gray-300 rounded" value={formData.aspect2} onChange={e => setFormData({ ...formData, aspect2: e.target.value })} />
        </div>
      </div>
    </div>
  );

  const renderStep3_Backstory = () => (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 fate-font">Backstory</h2>
      <p className="text-gray-600 text-sm">Tell us where you came from. You can write this yourself or ask the AI to draft one based on your Aspects.</p>
      
      <div className="flex justify-end">
        <button
          onClick={handleGenerateBackstory}
          disabled={isGenerating || !formData.highConcept || !formData.trouble}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-200 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {isGenerating ? "Weaving Fate..." : "Generate with AI"}
        </button>
      </div>

      <textarea
        className="w-full h-48 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none text-sm leading-relaxed"
        placeholder="Once upon a time..."
        value={formData.backstory}
        onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
      />
      {!formData.highConcept && (
         <p className="text-xs text-red-500">Please fill in High Concept and Trouble in Step 2 to use the AI generator.</p>
      )}
    </div>
  );

  const renderStep4_Skills = () => (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-xl font-bold text-gray-800 fate-font">Skill Pyramid</h2>
      <p className="text-gray-600 text-sm">Assign your skills. Higher ranks mean better competence.</p>

      {[4, 3, 2, 1].map((rank) => (
        <div key={rank} className="border-b border-gray-200 pb-2">
          <span className="text-sm font-bold text-gray-500 uppercase block mb-1">
             Rank +{rank} ({rank === 4 ? 'Great' : rank === 3 ? 'Good' : rank === 2 ? 'Fair' : 'Average'})
          </span>
          <div className="grid grid-cols-2 gap-2">
            {skillSlots[rank].map((skill, idx) => (
              <select
                key={idx}
                value={skill}
                onChange={(e) => updateSkillSlot(rank, idx, e.target.value)}
                className="p-2 text-sm border border-gray-300 rounded bg-white focus:ring-blue-500"
              >
                <option value="">Select Skill...</option>
                {skill ? <option value={skill}>{skill}</option> : null}
                {getAvailableSkills(rank, idx).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-2xl mt-10">
      <div className="mb-6 flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900 fate-font">Create Your Character</h1>
        <div className="flex gap-2">
           {[1, 2, 3, 4].map(i => (
             <div key={i} className={`w-3 h-3 rounded-full ${step === i ? 'bg-blue-600' : 'bg-gray-200'}`} />
           ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {step === 1 && renderStep1_Basics()}
        {step === 2 && renderStep2_Aspects()}
        {step === 3 && renderStep3_Backstory()}
        {step === 4 && renderStep4_Skills()}
      </div>

      <div className="flex justify-between mt-8 pt-4 border-t">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className={`flex items-center px-4 py-2 rounded text-gray-600 hover:text-gray-900 disabled:opacity-50`}
        >
          <ChevronLeft size={20} /> Back
        </button>
        
        {step < 4 ? (
          <button
            onClick={handleNext}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 shadow-md font-medium"
          >
            Next <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={finishCreation}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow-md font-medium"
          >
            Start Game <Check size={20} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CharacterCreator;