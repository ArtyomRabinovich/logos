import { GoogleGenAI } from "@google/genai";
import { Character } from "../types";

const SYSTEM_INSTRUCTION = `
You are the Game Master (GM) for a tabletop roleplaying game using the "Fate Condensed" rules system.
Your goal is to run an engaging, dramatic narrative for the player.

RULES SUMMARY:
1. **Fiction First**: Always describe what happens in the story.
2. **Dice**: Players roll 4 Fate Dice (-1, 0, +1). 
3. **Ladder**: +8 Legendary, +4 Great, +2 Fair, +0 Mediocre, -2 Terrible.
4. **Actions**: Overcome, Create Advantage, Attack, Defend.
5. **Outcomes**: Fail, Tie, Success, Success with Style (3+ shifts over target).

GUIDELINES:
- Be descriptive and evocative.
- **Do not** roll dice for the player. Ask the player to roll when the outcome is uncertain.
- When asking for a roll, specify the Skill and the Difficulty (e.g., "Roll Athletics against a Fair (+2) obstacle").
- Interpret the player's rolls based on the "Fate Condensed" rules (Success, Failure, etc.).
- Suggest Compels on the player's Aspects (High Concept, Trouble) to complicate their life in exchange for a Fate Point.
- Respect the player's agency.
- Keep responses concise (under 200 words) to keep the game moving, unless a major scene description is needed.

The player has provided their character sheet. Use their Name, Aspects, and Skills to tailor the experience.
`;

let ai: GoogleGenAI | null = null;
let chatSession: any = null;

export const initializeAI = (apiKey: string) => {
  ai = new GoogleGenAI({ apiKey });
};

export const generateBackstory = async (character: Partial<Character>): Promise<string> => {
  if (!ai) return "AI not initialized.";

  const prompt = `
    Write a short, engaging backstory (approx 100-150 words) for a Fate RPG character with the following details:
    Name: ${character.name || "Unknown"}
    Pronouns: ${character.pronouns || "They/Them"}
    High Concept: ${character.highConcept || "Unknown"}
    Trouble: ${character.trouble || "Unknown"}
    Relationship: ${character.relationship || "None"}
    Additional Aspects: ${character.aspect1 || "None"}, ${character.aspect2 || "None"}
    
    The backstory should explain their origins, how they acquired their High Concept, and the source of their Trouble.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate backstory.";
  } catch (error) {
    console.error("Error generating backstory:", error);
    return "The scribes are silent (API Error).";
  }
};

export const startNewGame = async (character: Character, setting: string): Promise<string> => {
  if (!ai) throw new Error("AI not initialized");

  const characterContext = `
    PLAYER CHARACTER:
    Name: ${character.name} (${character.pronouns})
    High Concept: ${character.highConcept}
    Trouble: ${character.trouble}
    Backstory: ${character.backstory}
    Top Skills: ${Object.entries(character.skills)
      .filter(([_, val]) => (val as number) >= 3)
      .map(([key, val]) => `${key} (+${val})`)
      .join(", ")}
    Inventory: ${character.inventory.map(i => i.name).join(", ")}
  `;

  chatSession = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\n\n" + characterContext,
    },
  });

  const prompt = `The setting is: ${setting}. Start the game by introducing the scene and an immediate hook or problem for ${character.name}.`;
  
  try {
    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "The mists part, but the world is silent. (Error generating response)";
  } catch (error) {
    console.error("Error starting game:", error);
    return "Failed to connect to the ethereal plane (API Error).";
  }
};

export const sendPlayerMessage = async (message: string, rollContext?: string): Promise<string> => {
  if (!chatSession) throw new Error("Game not started");

  let prompt = message;
  if (rollContext) {
    prompt += `\n\n[SYSTEM INFO]: ${rollContext}`;
  }

  try {
    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "...";
  } catch (error) {
    console.error("Error sending message:", error);
    return "The GM is silent. (API Error)";
  }
};