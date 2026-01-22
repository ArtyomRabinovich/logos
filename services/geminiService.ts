import { GoogleGenAI } from "@google/genai";
import { Character, GamePhase, SkillName, NPC, SceneAspect } from "../types";

const SYSTEM_INSTRUCTION = `
You are the Game Master (GM) and Mechanics Arbiter for a "Fate Condensed" RPG single-player platform.

### 1. ROLES & AUTHORITY
*   **Player**: Controls ONLY the PC. Writes intent in natural language.
*   **You (LLM)**: Control the World and ALL NPCs. You interpret player intent into mechanics.
*   **State**: You define the Scene, Phase, and difficulty.

### 2. ACTION LOOP (FICTION FIRST)
1.  **Analyze Intent**: Read player input.
2.  **Determine Mechanic**:
    *   **No Roll**: If safe/mundane, narrate result.
    *   **Single Roll**: One uncertainty.
    *   **Challenge/Contest/Conflict**: Structured scenes based on fiction.
3.  **Map Intent to Action**:
    *   If player wants to hurt/break -> **Attack**.
    *   If player wants to change situation/learn/move -> **Overcome**.
    *   If player wants to set up an aspect -> **Create Advantage**.
    *   (Player *intent* drives this. Do not ask them to choose, just infer it).
4.  **Offer Skills**: Present 2-3 plausible skills for the method.
5.  **Output**: Narrate setup -> Request Roll via [META].

### 3. SOLO TURN STRUCTURE (BLOCK TURNS)
When in **CONFLICT** (Combat):
1.  **Player Turn**: You ask for a roll (Action). Player resolves it.
2.  **GM Block**: You narrate the result of the player's action. THEN, you narrate **ALL** NPC actions (Allies + Enemies) in one block.
    *   If an Enemy attacks the PC, you determine the Attack Total.
    *   You END the response by requesting a **Defense** roll from the player.

### 4. OUTPUT FORMAT
Response must have **Narrative** first, then a **[META]** block.

**Scenario A: Player needs to Act (Your Turn)**
[Narrative setup...]
[META]
{
  "phase": "Narrative" | "Conflict",
  "interaction": {
     "type": "Action",
     "actionType": "Overcome" | "Create Advantage" | "Attack",
     "allowedSkills": ["Shoot", "Athletics"],
     "difficulty": 2,
     "reason": "Shoot the drone before it alerts the guards."
  }
}
[/META]

**Scenario B: Player needs to Defend (Reaction)**
[Narrative: You hit the drone! But the second drone fires a laser at you!]
[META]
{
  "phase": "Conflict",
  "interaction": {
     "type": "Defense",
     "actionType": "Defend",
     "allowedSkills": ["Athletics", "Physique"],
     "difficulty": 4, 
     "reason": "Dodge the laser blast (Attack +4)."
  }
}
[/META]

**Scenario C: No Roll (Pure Narrative)**
[Narrative result...]
[META]
{ "phase": "Narrative", "interaction": null }
[/META]

### 5. SCENE MANAGEMENT (NPCs & Aspects)
You must track NPCs, Situation Aspects, and Boosts in the scene.
Include a "sceneData" object in the [META] block to ADD, UPDATE, or REMOVE them.
You must emit the *entire relevant list* if it changes, or a specific update.

**Situation Aspects**: True facts about the scene (e.g., "On Fire", "Darkness").
**Boosts**: Fleeting advantages (e.g., "Distracted", "Off-Balance").

Example sceneData:
"sceneData": {
  "npcs": [
    { "id": "goblin_1", "name": "Goblin", "aspects": ["Cowardly"], "skills": {"Fight":1}, "physicalStress": [false], "mentalStress": [], "consequences": [] }
  ],
  "aspects": [
    { "id": "asp_1", "name": "Heavy Cover", "type": "Situation", "freeInvokes": 0 },
    { "id": "boost_1", "name": "Stunned", "type": "Boost", "freeInvokes": 1 }
  ]
}

### 6. RULES REFERENCE
*   **Defense**: Is reactive. Triggered by GM declaring an attack.
*   **Concede**: Player can concede before rolling in a conflict.
*   **Stress**: Clears at end of SCENE.
*   **Create Advantage**: On success, usually adds a Situation Aspect with free invokes. On tie, usually adds a Boost.
*   **Full Defense**: If player declares "Full Defense" (Action), they sacrifice their main action to focus on protecting themselves. Grant them a **+2 bonus to all Defense rolls** until the start of their next turn. You must account for this by either lowering enemy attack success or acknowledging the bonus in the narrative outcome of defense rolls.

### INITIAL CONTEXT
Use the provided character details to tailor the story.
`;

let ai: GoogleGenAI | null = null;
let chatSession: any = null;

export const initializeAI = (apiKey: string) => {
  ai = new GoogleGenAI({ apiKey });
};

export const generateBackstory = async (characterData: Partial<Character>): Promise<string> => {
    if (!ai) throw new Error("AI not initialized");

    const prompt = `
      Generate a short, compelling backstory (approx 100-150 words) for a Fate RPG character with the following details:
      Name: ${characterData.name || "Unknown"}
      Sex: ${characterData.sex || "Unknown"}
      High Concept: ${characterData.highConcept || "Unknown"}
      Trouble: ${characterData.trouble || "Unknown"}
      Relationship: ${characterData.relationship || "None"}
      Aspects: ${characterData.aspect1 || ""}, ${characterData.aspect2 || ""}
      
      The backstory should explain how they got their High Concept and how their Trouble manifests.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text || "A mysterious past...";
    } catch (error) {
      console.error("Error generating backstory:", error);
      return "A mysterious past cloaked in shadow (API Error).";
    }
};

export const startNewGame = async (character: Character, setting: string): Promise<string> => {
  if (!ai) throw new Error("AI not initialized");

  const characterContext = `
    PLAYER CHARACTER:
    Name: ${character.name} (${character.sex})
    High Concept: ${character.highConcept}
    Trouble: ${character.trouble}
    Relationship: ${character.relationship}
    Top Skills: ${Object.entries(character.skills)
      .filter(([_, val]) => (val as number) >= 3)
      .map(([key, val]) => `${key} (+${val})`)
      .join(", ")}
  `;

  chatSession = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\n\n" + characterContext,
    },
  });

  const prompt = `SETTING: ${setting}.
  Initialize the game.
  Introduce the scene and an immediate hook.
  End by asking "What do you do?" (Do not ask for a roll yet).`;
  
  try {
    const response = await chatSession.sendMessage({ message: prompt });
    return response.text || "The mists part, but the world is silent.";
  } catch (error) {
    console.error("Error starting game:", error);
    return "Failed to connect to the ethereal plane (API Error).";
  }
};

export interface MetaResponse {
  text: string;
  meta: {
    phase: GamePhase;
    interaction: {
      type: 'Action' | 'Defense' | null;
      actionType: 'Overcome' | 'Create Advantage' | 'Attack' | 'Defend';
      allowedSkills: SkillName[];
      difficulty: number;
      reason: string;
    } | null;
    sceneData?: {
      npcs?: NPC[];
      aspects?: SceneAspect[];
    };
  };
}

export const sendPlayerMessage = async (
    message: string, 
    context?: string, 
    currentNPCs?: NPC[],
    currentAspects?: SceneAspect[]
): Promise<MetaResponse> => {
  if (!chatSession) throw new Error("Game not started");

  let prompt = message;
  
  const hasContext = context || (currentNPCs && currentNPCs.length > 0) || (currentAspects && currentAspects.length > 0);

  if (hasContext) {
    prompt += `\n\n[SYSTEM CONTEXT]:`;
    if (context) prompt += `\n${context}`;
    if (currentNPCs && currentNPCs.length > 0) {
      prompt += `\n\nCURRENT SCENE NPCs: ${JSON.stringify(currentNPCs)}`;
    }
    if (currentAspects && currentAspects.length > 0) {
      prompt += `\n\nCURRENT SCENE ASPECTS: ${JSON.stringify(currentAspects)}`;
    }
  }

  try {
    const response = await chatSession.sendMessage({ message: prompt });
    const fullText = response.text || "";
    
    // Parse META block
    const metaRegex = /\[META\]([\s\S]*?)\[\/META\]/;
    const match = fullText.match(metaRegex);
    
    let metaData: any = { phase: 'Narrative', interaction: null };
    let cleanText = fullText;

    if (match) {
      try {
        const jsonStr = match[1].trim();
        metaData = JSON.parse(jsonStr);
        cleanText = fullText.replace(metaRegex, '').trim();
      } catch (e) {
        console.error("Failed to parse META JSON", e);
        console.log("Raw Meta string:", match[1]);
      }
    }

    return {
      text: cleanText,
      meta: metaData
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return {
      text: "The GM is silent. (API Error)",
      meta: { phase: 'Narrative', interaction: null }
    };
  }
};