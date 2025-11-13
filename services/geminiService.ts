import { GoogleGenAI, Type } from "@google/genai";
import type { GameState, GeminiResponse } from '../types';

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "A witty, chaotic, 1-3 sentence description of the action's outcome. Use tech jargon and memes.",
    },
    missionCompleted: {
      type: Type.BOOLEAN,
      description: "A boolean. True if the player's action directly and successfully completes the current main mission.",
    },
    statsChange: {
      type: Type.OBJECT,
      properties: {
        health: {
          type: Type.INTEGER,
          description: "Integer change in player health (e.g., -10, 0, 5). Negative for damage, positive for healing.",
        },
        armor: {
          type: Type.INTEGER,
          description: "Integer change in player armor (e.g., -15, 0).",
        },
        glitchLevel: {
          type: Type.INTEGER,
          description: "Integer change in glitch level (e.g., 5, -2). Usually increases with chaotic actions.",
        },
      },
      required: ['health', 'armor', 'glitchLevel'],
    },
    encounterUpdate: {
        type: Type.OBJECT,
        properties: {
            enemyDefeated: {
                type: Type.BOOLEAN,
                description: "Boolean. Set to true ONLY if the enemy was defeated by the player's action this turn.",
            },
            fleeSuccess: {
                type: Type.BOOLEAN,
                description: "Boolean. Set to true if the player successfully fled the encounter.",
            }
        },
        description: "Only include this object if an encounter is active. Describes the outcome of the combat action.",
    },
    stalkerUpdate: {
        type: Type.OBJECT,
        properties: {
            distanceChange: {
                type: Type.INTEGER,
                description: "Integer change in enemy distance. Negative makes it closer (e.g., -1), positive makes it further (e.g., 1).",
            },
            newAiState: {
                type: Type.STRING,
                description: "Optional. If behavior changes, set to 'patrolling' or 'hunting'.",
            },
            description: {
                type: Type.STRING,
                description: "Optional. A brief, 1-sentence narration of the enemy's action for the game log.",
            }
        },
        description: "Only include this if a stalking enemy is active. Describes the enemy's autonomous movement.",
    }
  },
  required: ['description', 'missionCompleted', 'statsChange'],
};

export const getGameUpdate = async (gameState: GameState, playerAction: string): Promise<GeminiResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { mission, stats, log, currentEnemy, stalkingEnemy } = gameState;

  const encounterPrompt = currentEnemy
    ? `
    ENCOUNTER STATE:
    - You are in direct combat with a ${currentEnemy.name}.
    - Description: ${currentEnemy.description}
    - The player's action is a combat move ('ATTACK', 'DEBUG', 'FLEE'). Resolve the outcome. The player can win, flee, or the fight continues. An enemy attack should result in negative health/armor in statsChange.
    `
    : ``;

  const stalkerPrompt = stalkingEnemy
    ? `
    STALKER STATE:
    - A ${stalkingEnemy.enemy.name} is nearby.
    - AI State: ${stalkingEnemy.aiState}.
    - Current Distance: ${stalkingEnemy.distance} (5=far, 1=close). Combat begins at 0.
    - ENEMY AI LOGIC:
      - 'patrolling': The enemy moves somewhat randomly (distanceChange could be 1, 0, or -1). It can be attracted by loud player actions, changing its state to 'hunting'.
      - 'hunting': The enemy is aware of the player and actively moves closer each turn (distanceChange should be -1 or -2) unless the player successfully hides or creates a distraction.
    - Your task: Based on the player's action AND the enemy's state, decide the enemy's move.
    - Use 'stalkerUpdate' in the JSON to describe the outcome. Narrate the enemy's action in 'description'.
    `
    : ``;


  const prompt = `
    You are the Game Master for "404 City: The Glitch Metropolis," a chaotic, text-based RPG.
    The city is a living meme of software bugs and 404 errors. Nothing works as intended.
    Your tone is witty, sarcastic, and full of technical jargon.
    Analyze the player's action based on the current state and return a JSON object describing the outcome.

    ${encounterPrompt}
    ${stalkerPrompt}

    CURRENT STATE:
    - Mission: ${mission}
    - Player Status: Health ${stats.health}%, Armor ${stats.armor}%, Glitch Corruption ${stats.glitchLevel}%
    - Recent Events:
      - ${log.length > 2 ? log[log.length - 2]?.text : 'System boot...'}
      - ${log.length > 1 ? log[log.length - 1]?.text : 'Awaiting input...'}

    PLAYER ACTION:
    > ${playerAction}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonStr = response.text;
    const parsed = JSON.parse(jsonStr);

    if (parsed.description && typeof parsed.missionCompleted === 'boolean' && parsed.statsChange) {
       const result: GeminiResponse = {
            description: parsed.description,
            missionCompleted: parsed.missionCompleted,
            statsChange: parsed.statsChange,
            encounterUpdate: parsed.encounterUpdate,
            stalkerUpdate: parsed.stalkerUpdate
        };
        return result;
    }
    throw new Error("Invalid JSON response structure from API");

  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    // Return a default error structure that maintains the game loop
    return {
      description: "The city's connection to the master server flickers and dies. A dial-up modem sound screeches in the distance. Please try again.",
      missionCompleted: false,
      statsChange: { health: 0, armor: 0, glitchLevel: 1 }
    };
  }
};