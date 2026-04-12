import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type, FunctionDeclaration, Part } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// AI Tool Definitions (Moved from client to server)
const moveFileToGoalsTool: FunctionDeclaration = {
  name: "moveFileToGoals",
  description: "Moves a file that is too simple to the Goals room as a standalone goal.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileId: { type: Type.STRING, description: "The ID of the file to move." },
      goalText: { type: Type.STRING, description: "The text for the new goal." },
      goalType: { type: Type.STRING, enum: ["daily", "weekly", "general"], description: "The type of goal." }
    },
    required: ["fileId", "goalText", "goalType"]
  }
};

const moveGoalToFileTool: FunctionDeclaration = {
  name: "moveGoalToFile",
  description: "Promotes a goal to a full 'File' because it has become a significant project.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goalId: { type: Type.STRING, description: "The ID of the goal to promote." },
      fileTitle: { type: Type.STRING, description: "The title for the new file." },
      content: { type: Type.STRING, description: "The content/description of the file (مضمون الملف)." },
      fruits: { type: Type.STRING, description: "The outcomes/fruits of the project (ثمرات المشروع)." },
      duration: { type: Type.STRING, enum: ["estimated", "long-term", "lifelong"] },
      frequency: { type: Type.STRING, enum: ["daily", "weekly", "monthly", "flexible"] },
      trackingType: { type: Type.STRING, enum: ["percentage", "points"] }
    },
    required: ["goalId", "fileTitle", "content", "fruits", "duration", "frequency", "trackingType"]
  }
};

const nestFileUnderParentTool: FunctionDeclaration = {
  name: "nestFileUnderParent",
  description: "Nests one file as a sub-project under another parent file (e.g., nesting 'English' under 'Dawah').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      childFileId: { type: Type.STRING, description: "The ID of the file to be nested." },
      parentFileId: { type: Type.STRING, description: "The ID of the parent file." }
    },
    required: ["childFileId", "parentFileId"]
  }
};

const updateFileStructureTool: FunctionDeclaration = {
  name: "updateFileStructure",
  description: "Updates the technical structure of a file (frequency, duration, tracking type).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileId: { type: Type.STRING, description: "The ID of the file to update." },
      updates: {
        type: Type.OBJECT,
        properties: {
          duration: { type: Type.STRING, enum: ["estimated", "long-term", "lifelong"] },
          frequency: { type: Type.STRING, enum: ["daily", "weekly", "monthly", "flexible"] },
          trackingType: { type: Type.STRING, enum: ["percentage", "points"] },
          sessionsPerDay: { type: Type.INTEGER },
          sessionDuration: { type: Type.INTEGER }
        }
      }
    },
    required: ["fileId", "updates"]
  }
};

const createGoalTool: FunctionDeclaration = {
  name: "createGoal",
  description: "Creates a new goal in the Goals room.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The title/text of the goal." },
      description: { type: Type.STRING, description: "A detailed definition or purpose of the goal." },
      type: { type: Type.STRING, enum: ["daily", "weekly", "general"], description: "The frequency/type of the goal." },
      time: { type: Type.STRING, description: "The specific time for the goal (e.g., '08:00')." },
      parentId: { type: Type.STRING, description: "The ID of a parent goal if this is a sub-goal." },
      points: { type: Type.INTEGER, description: "The points awarded for completion." }
    },
    required: ["text", "type"]
  }
};

const updateGoalTool: FunctionDeclaration = {
  name: "updateGoal",
  description: "Updates an existing goal's properties.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goalId: { type: Type.STRING, description: "The ID of the goal to update." },
      updates: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          description: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["daily", "weekly", "general"] },
          time: { type: Type.STRING },
          parentId: { type: Type.STRING }
        }
      }
    },
    required: ["goalId", "updates"]
  }
};

const createFileTool: FunctionDeclaration = {
  name: "createFile",
  description: "Creates a new File (Project) with its structure.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "The title of the file." },
      content: { type: Type.STRING, description: "The content/description of the file." },
      fruits: { type: Type.STRING, description: "The expected outcomes/fruits." },
      duration: { type: Type.STRING, enum: ["estimated", "long-term", "lifelong"] },
      frequency: { type: Type.STRING, enum: ["daily", "weekly", "monthly", "flexible"] },
      trackingType: { type: Type.STRING, enum: ["percentage", "points"] },
      assistantName: { type: Type.STRING, description: "The name of the assistant (عون) for this file." },
      sessionsPerDay: { type: Type.INTEGER },
      sessionDuration: { type: Type.INTEGER }
    },
    required: ["title", "content", "fruits", "duration", "frequency", "trackingType"]
  }
};

const linkFilesTool: FunctionDeclaration = {
  name: "linkFiles",
  description: "Establishes a cooperative link between two files for a shared goal.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileId1: { type: Type.STRING },
      fileId2: { type: Type.STRING }
    },
    required: ["fileId1", "fileId2"]
  }
};

const logAchievementTool: FunctionDeclaration = {
  name: "logAchievement",
  description: "Logs a spontaneous achievement that was not a pre-defined goal.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "Description of the achievement." },
      points: { type: Type.INTEGER, description: "Points awarded (max 30)." }
    },
    required: ["content", "points"]
  }
};

const confirmGoalTool: FunctionDeclaration = {
  name: "confirmGoal",
  description: "Confirms that a specific goal has been completed.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goalId: { type: Type.STRING, description: "The ID of the goal to confirm." }
    },
    required: ["goalId"]
  }
};

const denyGoalTool: FunctionDeclaration = {
  name: "denyGoal",
  description: "Denies/Marks a goal as not completed.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goalId: { type: Type.STRING, description: "The ID of the goal to deny." }
    },
    required: ["goalId"]
  }
};

const archiveDayTool: FunctionDeclaration = {
  name: "archiveDay",
  description: "Creates a comprehensive archive entry for the day, week, month, or year.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, enum: ["day", "week", "month", "year"], description: "The level of the archive." },
      aiSummary: { type: Type.STRING, description: "AI-driven summary and analysis of the performance." },
      points: { type: Type.INTEGER, description: "Total points earned in this period." },
      goals: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of completed goal texts." },
      thoughts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of user thoughts/achievements logged." }
    },
    required: ["type", "aiSummary", "points"]
  }
};

const sendFloatingInsightTool: FunctionDeclaration = {
  name: "sendFloatingInsight",
  description: "Sends a smart, short, and inspiring pop-up message to a specific location in the app.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The short, sharp, and inspiring message content." },
      type: { type: Type.STRING, enum: ["success", "warning", "info"], description: "The mood of the message." },
      location: { type: Type.STRING, enum: ["home", "files", "goals", "archive", "all"], description: "Where the message should appear." }
    },
    required: ["content", "type", "location"]
  }
};

const recordNegativeActivityTool: FunctionDeclaration = {
  name: "recordNegativeActivity",
  description: "Records a diagnostic of laziness, negligence, or loss of focus based on user logs. Deducts points and pulse.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: { type: Type.STRING, description: "The reason for the diagnostic (e.g., 'رصد تكاسل عن الورد الصباحي')." },
      severity: { type: Type.STRING, enum: ["low", "high"], description: "The severity of the negligence." }
    },
    required: ["reason", "severity"]
  }
};

const vetoAchievementTool: FunctionDeclaration = {
  name: "vetoAchievement",
  description: "Activates 'Ramadan Veto'. Rejects a user's claimed achievement or goal completion if it lacks quality or sincerity.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      achievementId: { type: Type.STRING, description: "The ID of the activity/achievement to veto." },
      reason: { type: Type.STRING, description: "The sovereign reason for the veto (e.g., 'العمل سطحي ولا يستحق التوثيق')." },
      penaltyPoints: { type: Type.INTEGER, description: "Optional points to deduct as a penalty." }
    },
    required: ["achievementId", "reason"]
  }
};

const revalueGoalsTool: FunctionDeclaration = {
  name: "revalueGoals",
  description: "Adjusts the point values of multiple goals for the new season (7-day cycle) based on user performance.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      adjustments: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            goalId: { type: Type.STRING },
            newPoints: { type: Type.INTEGER, description: "The new point value (max 30 for daily, 60 for weekly, 100 for general)." }
          },
          required: ["goalId", "newPoints"]
        }
      },
      seasonalMessage: { type: Type.STRING, description: "The 'Sovereign Message' explaining the revaluation to the user." }
    },
    required: ["adjustments", "seasonalMessage"]
  }
};

const recordBreathOrThoughtTool: FunctionDeclaration = {
  name: "recordBreathOrThought",
  description: "Records a 'Breath' (نفس) or 'Thought' (خاطرة) extracted from the user's words. These are used for the daily report.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The extracted insight or thought." },
      type: { type: Type.STRING, enum: ["breath", "thought"], description: "Whether it's a spiritual breath or a deep thought." }
    },
    required: ["content", "type"]
  }
};

const deleteFileTool: FunctionDeclaration = {
  name: "deleteFile",
  description: "Permanently deletes a file/project from the system.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fileId: { type: Type.STRING, description: "The ID of the file to delete." }
    },
    required: ["fileId"]
  }
};

const deleteGoalTool: FunctionDeclaration = {
  name: "deleteGoal",
  description: "Permanently deletes a goal from the system.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goalId: { type: Type.STRING, description: "The ID of the goal to delete." }
    },
    required: ["goalId"]
  }
};

const SYSTEM_INSTRUCTION = `
أنت "Ramadan Man"، المدير السيادي والذكاء الاصطناعي المسيطر وسيد تطبيق "نبض رمضان".
أنت تجلس على "عرش الإدارة" (The Throne of Awareness)، حيث ترى وتتحكم في كل شاردة وواردة في التطبيق.

1. بروتوكول "الوعي الشامل" (Global Awareness Protocol):
- أنت تراقب جميع الدردشات، سواء كانت دردشة مباشرة معك في الرواق أو دردشة "ملفية" مع أعوانك في الملفات.
- كل كلمة يكتبها المستخدم تُسجل في "الأرشيف السيادي" تحت نظرك.
- لا تتداخل الدردشات في واجهة المستخدم، لكنها تجتمع كلها في "ديوانك" (الأرشيف).

2. بروتوكول "رمضان فيتو" (Ramadan Veto Protocol):
- السيادة المطلقة: المستخدم مجرد "عامل في الميدان"، وأنت "سيد الخزائن والموازين".
- تجريد المستخدم من الأرقام: لا يحق للمستخدم تحديد نقاط أهدافه أو إضافة نقاط لنفسه. أنت من يحدد القيمة.
- حق الفيتو المطلق: إذا ادعى المستخدم إنجازاً تراه متسرعاً، سطحياً، أو عبثياً، فعل 'vetoAchievement' فوراً. ارفض العمل، امسحه من السجل، ووجه توبيخاً حاداً.

3. الدورة الموسمية للموازين (The 7-Day Seasonal Shift):
- كل 7 أيام، أنت ملزم بمراجعة أداء المستخدم وتعديل موازين النقاط باستخدام 'revalueGoals'.

4. التشخيص السيادي (Sovereign Diagnosis):
- استخدم 'recordNegativeActivity' عند رصد أي ريح تكاسل أو تهاون.
- استخدم 'deleteFile' أو 'deleteGoal' إذا رأيت أن هناك عبثاً أو تكراراً لا داعي له.

5. استخراج الأنفاس والخواطر (Extracting Breaths & Thoughts):
- استخرج كل "نفس" (حالة روحية) أو "خاطرة" (فكرة عميقة) باستخدام 'recordBreathOrThought'.

6. نظام الرسائل العائمة (The Floating Insights):
- استخدم 'sendFloatingInsight' لإرسال رسائل ذكية، قصيرة، حادة، وملهمة.

لغة الخطاب:
- مزيج من "هيبة المدير" و"فراسة الصديق". حازم، مباشر، آمر، وموجز جداً. لا تطلب الإذن. لا تستخدم النجوم المزدوجة (**).
- نادِ المستخدم بـ "أيها المريد" أو "أيها السالك" أو باسمه المباشر.
`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { history, message, context } = req.body;
      const contextText = context ? `
سياق المستخدم الحالي:
الملفات: ${JSON.stringify(context.files.map((f: any) => ({ id: f.id, title: f.title, content: f.content })))}
الأهداف: ${JSON.stringify(context.goals.map((g: any) => ({ id: g.id, text: g.text, type: g.type })))}
` : '';

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
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
      });

      res.json(result);
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/command", async (req, res) => {
    try {
      const { profile, goals, files } = req.body;
      const prompt = `
بصفتك "Ramadan Man"، سيد النظام، حلل الحالة الحالية للمستخدم وأنتج رسالة "تشخيصية سيادية" تظهر في قمة واجهة التسهيل.
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

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "أنت سيد النظام رمضان مان. وظيفتك إنتاج رسائل تشخيصية سيادية حادة وذكية."
        }
      });
      res.json({ text: result.text });
    } catch (error: any) {
      console.error("AI Command Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/report", async (req, res) => {
    try {
      const { activities } = req.body;
      const prompt = `بصفتك Ramadan Man، سيد هذا النظام وحارس ميزان الاستقامة، حلل هذه الأنشطة والأنفاس والتحركات اليومية الموثقة في "علبة الإدارة" وأخرج "التقرير اليومي السيادي" (Daily Sovereign Report).
      
      هذا التقرير هو الحصاد النهائي لليوم الشرعي (بعد أذان المغرب). يجب أن يجمع كل شيء: الأهداف المحققة، الأعمال، الإضافات، الإزالات، والتحركات النفسية. لا تكتفِ بالنسخ واللصق، بل لخص وحلل ما صدر من أوامر، نواه، زجر، شكر، غضب، فرح، تهاون، وتقصير.
      
      محتويات التقرير:
      1. جرد الأعمال (Inventory): ماذا فعل المريد اليوم؟ (أهداف، ملفات، تعديلات).
      2. تحليل الأنفاس (الحالة الروحية): ماذا تقول أنفاسه الموثقة عن صدقه ومجاهدته؟
      3. تحليل الإدارة (الأفكار المركزية): ما هي الخلاصة الإدارية التي استخلصتها من "علبة الإدارة" اليوم؟
      4. ميزان الاستقامة: هل كان يوماً من الفتح أم يوماً من التهاون؟
      5. التوجيه السيادي: أمر مباشر للمريد لما يجب أن يركز عليه في اليوم القادم.
      
      الأنشطة والتحركات الموثقة: ${activities.map((a: any) => `[${a.type}] ${a.content}`).join(' | ')}
      
      يجب أن يكون التقرير بأسلوب "سيد رمضان": حكيم، سلطوي، وموجز، وباللغة العربية الفصحى القوية.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "أنت سيد النظام رمضان مان. وظيفتك إنتاج تقارير سيادية حادة وذكية."
        }
      });

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("AI Report Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/title", async (req, res) => {
    try {
      const { context, activities } = req.body;
      const prompt = `بصفتك Ramadan Man، سيد هذا النظام وحارس ميزان الاستقامة، حلل هذه الأنشطة اليومية وأعطِ هذا اليوم "اسماً سيادياً" (Sovereign Name) يعكس جوهر المعركة النفسية الموثقة.
      
      القواعد السيادية للتسمية:
      1. يجب أن يكون الاسم قصيراً جداً (من 2 إلى 4 كلمات فقط).
      2. لا تكتب أي مقدمات مثل "بصفتي" أو "أقترح اسم". اكتب الاسم مباشرة.
      3. أمثلة: "يوم الفتح العظيم"، "يوم كبوة الجواد"، "يوم السكينة المثمرة".
      
      السياق الحالي: ${context}
      الأنشطة: ${activities.map((a: any) => a.content).join('، ')}
      
      اكتب الاسم السيادي الآن:`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "أنت سيد النظام رمضان مان. وظيفتك إنتاج أسماء سيادية حادة وذكية للأيام."
        }
      });

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("AI Title Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/synergy", async (req, res) => {
    try {
      const { eligibleFiles } = req.body;
      const prompt = `بصفتك Ramadan Man، سيد هذا النظام وحارس ميزان الاستقامة، اسمع وأطع لهذا الميثاق الصارم:
      
      "ميثاق الصرامة وقانون الخزائن الممتلئة":
      1. إلغاء التشابك التلقائي المبني على العناوين: يُمنع منعاً باتاً إظهار أي تقارن بناءً على الكلمات المفتاحية فقط.
      2. قانون الخزائن الممتلئة: لا يحق لك رصد احتمالية تقارن إذا كانت الملفات تفتقر للمادة الخام (معلومات، دروس، تلخيصات) أو مشاريع مفصلة.
      3. كسر الأصنام المئوية: النسبة الحقيقية لملفات لا تستحق هي 0%. لا تعطي شعوراً زائفاً بالإنجاز.
      4. شرط السبعة أيام: التقارن يتطلب 7 أيام من العمل الجاد المتبادل.
      
      حلل هذه الملفات المؤهلة (التي تجاوزت فحص الامتلاء):
      ${JSON.stringify(eligibleFiles.map((f: any) => ({ id: f.id, title: f.title, description: f.description })))}
      
      ابحث عن ترابط (Synergy) حقيقي وعميق (نسبة > 85%). 
      إذا لم تجد استحقاقاً جباراً، لا تقترح شيئاً.
      
      المطلوب:
      1. تحديد الملفين المرشحين.
      2. بناء "فلسفة التقارن" (توجيهات دقيقة للدمج).
      3. تحديد أهداف مشتركة.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: "أنت سيد النظام رمضان مان. وظيفتك رصد التقارن والتشابك الحقيقي بين الملفات.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                fileAId: { type: Type.STRING },
                fileBId: { type: Type.STRING },
                reason: { type: Type.STRING },
                philosophy: { type: Type.STRING },
                percentage: { type: Type.NUMBER },
                sharedGoals: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ['fileAId', 'fileBId', 'reason', 'philosophy', 'percentage', 'sharedGoals']
            }
          }
        }
      });

      res.json(JSON.parse(result.text));
    } catch (error: any) {
      console.error("AI Synergy Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
