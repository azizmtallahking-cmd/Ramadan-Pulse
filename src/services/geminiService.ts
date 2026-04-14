import { 
  SYSTEM_INSTRUCTION, 
  moveFileToGoalsTool, 
  moveGoalToFileTool, 
  nestFileUnderParentTool, 
  updateFileStructureTool, 
  linkFilesTool,
  createGoalTool,
  createFileTool,
  updateGoalTool,
  logAchievementTool,
  confirmGoalTool,
  denyGoalTool,
  archiveDayTool,
  sendFloatingInsightTool,
  recordNegativeActivityTool,
  vetoAchievementTool,
  recordBreathOrThoughtTool,
  revalueGoalsTool,
  deleteFileTool,
  deleteGoalTool
} from "./aiTools";

const callAIProxy = async (payload: any) => {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'AI Proxy request failed');
  }
  return response.json();
};

export const generateRamadanManResponse = async (
  history: { role: 'user' | 'model', parts: any[] }[], 
  message: string,
  context?: { files: any[], goals: any[] }
) => {
  const contextText = context ? `
البيانات الحالية:
الملفات: ${JSON.stringify(context.files.map(f => ({ id: f.id, title: f.title, status: f.status })))}
الأهداف: ${JSON.stringify(context.goals.map(g => ({ id: g.id, text: g.text, type: g.type })))}
` : '';

  const payload = {
    model: "gemini-1.5-flash",
    contents: [...history, { role: 'user', parts: [{ text: contextText + message }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ 
        functionDeclarations: [
          moveFileToGoalsTool, 
          moveGoalToFileTool, 
          nestFileUnderParentTool, 
          updateFileStructureTool, 
          linkFilesTool,
          createGoalTool,
          createFileTool,
          updateGoalTool,
          logAchievementTool,
          confirmGoalTool,
          denyGoalTool,
          archiveDayTool,
          sendFloatingInsightTool,
          recordNegativeActivityTool,
          vetoAchievementTool,
          recordBreathOrThoughtTool,
          revalueGoalsTool,
          deleteFileTool,
          deleteGoalTool
        ] 
      }]
    }
  };

  return callAIProxy(payload);
};

export const generateCommandMessage = async (profile: any, goals: any[], files: any[]) => {
  const prompt = `أنت Ramadan Man. بصفتك سيد هذا النظام، أعطِ المستخدم رسالة تشخيصية سريعة (Diagnostic Message) بناءً على وضعه الحالي.
  
البيانات الحالية:
- النقاط: ${profile.points}
- المستوى: ${profile.level}
- النبض: ${profile.pulse}
- الأهداف النشطة: ${goals.length}
- الملفات النشطة: ${files.length}
- الوقت الحالي: ${new Date().toLocaleTimeString('ar-TN')}

القواعد:
1. كن "بوصلة" وليس مجرد مذيع.
2. حلل العلاقة بين النبض والإنجاز.
3. إذا كان النبض منخفضاً، كن حازماً ومحذراً.
4. إذا كان الإنجاز عالياً، كن فخوراً بلهجة سيادية.
5. اربط الرسالة بالوقت (مثلاً القرب من المغرب).
6. الرسالة يجب أن تكون قصيرة، قوية، وباللغة العربية الفصحى. لا تزد عن 20 كلمة.
7. لا تستخدم النجوم المزدوجة.
`;

  try {
    const payload = {
      model: "gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "أنت سيد النظام رمضان مان. وظيفتك إنتاج رسائل تشخيصية سيادية حادة وذكية."
      }
    };
    const response = await callAIProxy(payload);
    return response.candidates?.[0]?.content?.parts?.[0]?.text || "أنا أراقب تحركاتك.. استمر في المجاهدة.";
  } catch (error) {
    console.error("AI Command Error:", error);
    return "أنا أراقب تحركاتك.. استمر في المجاهدة.";
  }
};
