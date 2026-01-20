export enum SkillName {
  Academics = "Academics",
  Athletics = "Athletics",
  Burglary = "Burglary",
  Contacts = "Contacts",
  Crafts = "Crafts",
  Deceive = "Deceive",
  Drive = "Drive",
  Empathy = "Empathy",
  Fight = "Fight",
  Investigate = "Investigate",
  Lore = "Lore",
  Notice = "Notice",
  Physique = "Physique",
  Provoke = "Provoke",
  Rapport = "Rapport",
  Resources = "Resources",
  Shoot = "Shoot",
  Stealth = "Stealth",
  Will = "Will"
}

export const SKILL_LIST = Object.values(SkillName);

export type FateAction = 'Overcome' | 'Create Advantage' | 'Attack' | 'Defend';

export type ItemType = 'weapon' | 'armor' | 'gear' | 'consumable';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  bonus?: number; // e.g., Weapon:2
  aspect?: string; // e.g., "Heavy Plating"
  equipped?: boolean;
}

export interface Character {
  name: string;
  pronouns: string;
  highConcept: string;
  trouble: string;
  relationship: string;
  aspect1: string;
  aspect2: string;
  backstory: string;
  skills: { [key in SkillName]?: number }; // Map skill name to rank
  stunts: string[];
  refresh: number;
  physicalStress: boolean[]; // true = marked
  mentalStress: boolean[];
  consequences: {
    mild: string;
    moderate: string;
    severe: string;
  };
  inventory: Item[];
}

export type DiceFace = -1 | 0 | 1;

export interface RollResult {
  faces: DiceFace[];
  total: number;
}

export interface ChatMessage {
  id: string;
  sender: 'player' | 'gm' | 'system';
  text: string;
  type?: 'narrative' | 'combat_log';
  roll?: {
    skill: string;
    bonus: number;
    faces: DiceFace[];
    result: number;
    total: number; // result + bonus
    action?: FateAction;
  };
}

export const ADJECTIVE_LADDER = {
  8: 'Legendary',
  7: 'Epic',
  6: 'Fantastic',
  5: 'Superb',
  4: 'Great',
  3: 'Good',
  2: 'Fair',
  1: 'Average',
  0: 'Mediocre',
  [-1]: 'Poor',
  [-2]: 'Terrible'
};