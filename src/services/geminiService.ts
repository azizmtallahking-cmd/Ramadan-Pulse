import { Part } from "@google/genai";

export const generateRamadanManResponse = async (
  history: { role: 'user' | 'model', parts: any[] }[], 
  message: string,
  context?: { files: any[], goals: any[] }
) => {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, message, context })
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch AI response from sovereign backend');
  }
  
  return await response.json();
};

export const generateCommandMessage = async (profile: any, goals: any[], files: any[]) => {
  const response = await fetch('/api/ai/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, goals, files })
  });
  
  if (!response.ok) {
    return "أنا أراقب تحركاتك.. استمر في المجاهدة.";
  }
  
  const data = await response.json();
  return data.text || "أنا أراقب تحركاتك.. استمر في المجاهدة.";
};
