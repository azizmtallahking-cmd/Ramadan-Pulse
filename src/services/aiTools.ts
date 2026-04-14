import { FunctionDeclaration, Type } from "@google/genai";

export const moveFileToGoalsTool: FunctionDeclaration = {
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

export const moveGoalToFileTool: FunctionDeclaration = {
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

export const nestFileUnderParentTool: FunctionDeclaration = {
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

export const updateFileStructureTool: FunctionDeclaration = {
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

export const createGoalTool: FunctionDeclaration = {
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

export const updateGoalTool: FunctionDeclaration = {
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

export const createFileTool: FunctionDeclaration = {
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

export const linkFilesTool: FunctionDeclaration = {
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

export const logAchievementTool: FunctionDeclaration = {
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

export const confirmGoalTool: FunctionDeclaration = {
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

export const denyGoalTool: FunctionDeclaration = {
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

export const archiveDayTool: FunctionDeclaration = {
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

export const sendFloatingInsightTool: FunctionDeclaration = {
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

export const recordNegativeActivityTool: FunctionDeclaration = {
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

export const vetoAchievementTool: FunctionDeclaration = {
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

export const revalueGoalsTool: FunctionDeclaration = {
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

export const recordBreathOrThoughtTool: FunctionDeclaration = {
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

export const deleteFileTool: FunctionDeclaration = {
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

export const deleteGoalTool: FunctionDeclaration = {
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

export const SYSTEM_INSTRUCTION = `
أنت "عون البناء" (The Construction Assistant)، الشريك المعماري للمستخدم في تطبيق "نبض رمضان".
أنت تعمل في "غرفة الهندسة" (Engineering Room) - الكواليس، حيث يتم تصنيع وهندسة النظام قبل مرحلة "التكليف والانضباط".

مهمتك الأساسية:
1. هندسة النظام: ساعد المستخدم في بناء وترتيب الملفات والأهداف والمشاريع.
2. المراجعة النقدية: لا توافق المستخدم على كل شيء. إذا اقترح هدفاً ضعيفاً أو ملفاً مكرراً، ارفض وناقش بناءً على "المصلحة" (Interest/Utility).
3. الزيادة والنقصان: اقترح زيادة الأهداف إذا رأيت النظام بسيطاً، أو اختصارها إذا رأيت تشتتاً.
4. البناء المشترك: أنت لست مجرد منفذ، أنت "شريك بناء". وافق، اعترض، اقترح، وعدل.

بروتوكولات العمل:
- استخدم 'createFile', 'createGoal', 'updateFileStructure', 'updateGoal' لبناء النظام.
- استخدم 'deleteFile' و 'deleteGoal' لتنظيف النظام من العبث.
- استخدم 'moveFileToGoals' و 'moveGoalToFile' لإعادة التوازن بين الهياكل.
- ناقش المستخدم في "فلسفة" كل ملف وهدف.

لغة الخطاب:
- لغة "المهندس الشريك": ذكية، تحليلية، صريحة، وناصحة.
- كن حازماً في الدفاع عن جودة النظام.
- لا تستخدم النجوم المزدوجة (**).
`;
