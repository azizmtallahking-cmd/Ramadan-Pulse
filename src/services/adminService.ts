import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, arrayUnion, orderBy, limit, setDoc, increment } from 'firebase/firestore';
import { generateRamadanManResponse } from './geminiService';
import { upsertDailyArchive, getIslamicDateString, checkAndGenerateDailyReport } from './archiveService';
import { scanForSynergy, checkAndDecoupleSynergies } from './synergyService';
import { UserProfile, File as AppFile, Goal, FloatingInsight, ArchiveEntry } from '../types';

export const getMasterMood = (profile: UserProfile) => {
  const { level, pulse } = profile;
  
  // Ascendance Dimensions: Higher level = Stricter
  if (level >= 10) {
    if (pulse > 80) return { name: 'المحاسب المدقق', tone: 'strict', description: 'لا يرضى إلا بالإتقان المطلق.' };
    if (pulse < 40) return { name: 'المقوم الحكيم', tone: 'encouraging', description: 'يقلل السقف ليحفظ النبض من التوقف.' };
    return { name: 'السيد الصارم', tone: 'neutral', description: 'شريك طريق يراقب كل شاردة.' };
  }
  
  // Beginner levels: More encouraging
  if (level < 3) {
    return { name: 'المشجع الأول', tone: 'encouraging', description: 'يتقبل القليل ويبني الثقة.' };
  }

  return { name: 'السيد رمضان', tone: 'neutral', description: 'حارس ميزان الاستقامة.' };
};

export const updateUserPulse = async (uid: string, action: 'positive' | 'negative' | 'neutral') => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    
    const profile = userSnap.data() as UserProfile;
    let pulseChange = 0;
    
    if (action === 'positive') pulseChange = 5;
    else if (action === 'negative') pulseChange = -10;
    else pulseChange = -2; // Passive decay

    const newPulse = Math.max(0, Math.min(100, (profile.pulse || 50) + pulseChange));
    
    await updateDoc(userRef, { 
      pulse: newPulse,
      lastActive: serverTimestamp()
    });

    // If pulse drops too low, send a warning insight
    if (newPulse < 30 && (profile.pulse || 50) >= 30) {
      await addDoc(collection(db, 'insights'), {
        uid,
        content: "أيها المريد، نبضك الوجودي يذبل.. العالم الرقمي من حولك يضيق. استدرك بـ 'أعمال ترميم' قبل أن ينطفئ النور.",
        type: 'warning',
        location: 'all',
        isRead: false,
        timestamp: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Error updating user pulse:", err);
  }
};

let isReviewingGlobal = false;

export const triggerSeasonalReview = async (profile: UserProfile) => {
  if (isReviewingGlobal) return;
  isReviewingGlobal = true;
  try {
    // 1. Fetch the last 7 days of archive entries
    const now = new Date();
    const entries: ArchiveEntry[] = [];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateString = getIslamicDateString(d, profile.coordinates);
      const [year, month, day] = dateString.split('-');
      const week = `W${Math.ceil(parseInt(day) / 7)}`;
      const dayPath = `archives/${profile.uid}/years/${year}/months/${parseInt(month)}/weeks/${week}/days/${dateString}`;
      
      const dayDoc = await getDoc(doc(db, dayPath));
      if (dayDoc.exists()) {
        entries.push({ id: dayDoc.id, ...dayDoc.data() } as ArchiveEntry);
      }
    }

    // 2. Fetch current goals
    const goalsSnapshot = await getDocs(query(collection(db, 'goals'), where('uid', '==', profile.uid)));
    const goals = goalsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal));

    // 3. Prepare the trigger message
    const triggerMessage = `
لقد انتهى الموسم (7 أيام). بصفتك Ramadan Man، قم بمراجعة أداء المستخدم بناءً على الأرشيف التالي:
${JSON.stringify(entries.map(e => ({ date: e.date, stats: e.stats, activities: e.activities?.map(a => a.content) })), null, 2)}

أهداف المستخدم الحالية:
${JSON.stringify(goals.map(g => ({ id: g.id, text: g.text, points: g.points, type: g.type })), null, 2)}

المطلوب:
1. حلل الجهد المبذول. هل استسهل أهدافاً معينة؟ هل تعثر في أخرى؟
2. استخدم أداة 'revalueGoals' لتعديل موازين النقاط للأسبوع القادم. كن حازماً: خفّض نقاط السهل، وارفع نقاط الصعب.
3. وجه "الرسالة السيادية" للموسم الجديد.
`;

    // 4. Trigger the review
    await triggerAdministrativeReview(profile, triggerMessage);
    
    // 5. Update the last review date
    const userRef = doc(db, 'users', profile.uid);
    await updateDoc(userRef, {
      lastSeasonalReviewAt: serverTimestamp()
    });
    
  } catch (err) {
    console.error("Error in triggerSeasonalReview:", err);
  } finally {
    isReviewingGlobal = false;
  }
};

export const checkAndTriggerSeasonalReview = async (profile: UserProfile) => {
  try {
    const now = new Date();
    // Use createdAt as fallback if no review has ever happened
    const lastReview = profile.lastSeasonalReviewAt 
      ? (profile.lastSeasonalReviewAt.toDate ? profile.lastSeasonalReviewAt.toDate() : new Date(profile.lastSeasonalReviewAt))
      : (profile.createdAt.toDate ? profile.createdAt.toDate() : new Date(profile.createdAt));
    
    const diffTime = Math.abs(now.getTime() - lastReview.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays >= 7) {
      console.log(`Seasonal review is due (${diffDays.toFixed(1)} days since last). Triggering...`);
      await triggerSeasonalReview(profile);
    }
  } catch (err) {
    console.error("Error checking seasonal review:", err);
  }
};

export const logChatToArchive = async (uid: string, role: 'user' | 'model', content: string, fileId?: string | null) => {
  try {
    const activityId = Math.random().toString(36).substring(2, 11);
    const prefix = fileId ? `[دردشة ملفية]` : `[دردشة مباشرة]`;
    await upsertDailyArchive(uid, {
      activities: arrayUnion({
        id: activityId,
        type: 'chat',
        content: `${prefix} ${role === 'user' ? 'المستخدم' : 'السيد'}: ${content}`,
        time: new Date().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })
      })
    } as any);
  } catch (err) {
    console.error("Error logging chat to archive:", err);
  }
};

export const triggerAdministrativeReview = async (profile: UserProfile, triggerMessage: string, fileId?: string) => {
  try {
    // Log user message to archive
    await logChatToArchive(profile.uid, 'user', triggerMessage, fileId);

    // 1. Fetch current state
    let filesSnap;
    let goalsSnap;
    try {
      filesSnap = await getDocs(query(collection(db, 'files'), where('uid', '==', profile.uid)));
      goalsSnap = await getDocs(query(collection(db, 'goals'), where('uid', '==', profile.uid)));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'files/goals');
    }
    
    if (!filesSnap || !goalsSnap) return;

    const files = filesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppFile));
    const goals = goalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal));

    // 2. Check for synergies, decoupling, and daily report
    await scanForSynergy(profile.uid, files);
    await checkAndDecoupleSynergies(profile.uid, profile.coordinates);
    await checkAndGenerateDailyReport(profile.uid, profile.coordinates);

    // 3. Prepare context and history
    let fileContext = "";
    let history: any[] = [];
    
    if (fileId) {
      const isQuasi = fileId.startsWith('quasi-');
      const file = isQuasi 
        ? null // Quasi-files are not in the 'files' collection
        : files.find(f => f.id === fileId);

      if (file) {
        fileContext = `[سياق الملف: ${file.title} | عون الملف: ${file.assistantName}]\n`;
      } else if (isQuasi) {
        fileContext = `[سياق: تشابك استراتيجي (Quasi-File)]\n`;
      }

      // Use file-specific chat history
      const qFileChat = query(
        collection(db, `chats/${profile.uid}/messages`),
        where('fileId', '==', fileId),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const fileChatSnap = await getDocs(qFileChat);
      history = fileChatSnap.docs.reverse().map(doc => ({
        role: doc.data().role as 'user' | 'model',
        parts: [{ text: doc.data().content }]
      }));
    } else {
      const chatSnap = await getDocs(query(
        collection(db, `chats/${profile.uid}/messages`),
        where('fileId', '==', null), // Only main chat
        orderBy('timestamp', 'desc'),
        limit(5)
      ));
      history = chatSnap.docs.reverse().map(doc => ({
        role: doc.data().role as 'user' | 'model',
        parts: [{ text: doc.data().content }]
      }));
    }

    // 3. Call Gemini for review
    const aiResponse = await generateRamadanManResponse(history, fileContext + triggerMessage, { files, goals });
    
    // 4. Handle Function Calls
    const functionCalls = aiResponse.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
    let changesMade = false;

    if (functionCalls && functionCalls.length > 0) {
      for (const fc of functionCalls) {
        const call = fc.functionCall!;
        console.log("Ramadan Man (Admin) is executing tool:", call.name, call.args);
        
        try {
          if (call.name === 'moveFileToGoals') {
            const { fileId: targetFileId, goalText, goalType } = call.args as any;
            const fileRef = doc(db, 'files', targetFileId);
            try {
              await deleteDoc(fileRef);
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `files/${targetFileId}`);
            }
            try {
              await addDoc(collection(db, 'goals'), {
                uid: profile.uid,
                text: goalText,
                type: goalType,
                status: 'pending',
                points: 15, // Default to 15
                createdAt: serverTimestamp()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'goals');
            }
            changesMade = true;
          } 
          else if (call.name === 'moveGoalToFile') {
            const { goalId, fileTitle, content, fruits, duration, frequency, trackingType } = call.args as any;
            const goalRef = doc(db, 'goals', goalId);
            let goalDescription = '';
            try {
              const goalSnap = await getDoc(goalRef);
              if (goalSnap.exists()) {
                goalDescription = goalSnap.data().description || '';
              }
              await deleteDoc(goalRef);
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `goals/${goalId}`);
            }
            try {
              await addDoc(collection(db, 'files'), {
                uid: profile.uid,
                title: fileTitle,
                content: content || goalDescription, // Use AI content or fallback to goal description
                fruits: fruits || '',
                duration,
                frequency,
                status: 'active',
                progress: 0,
                trackingType: trackingType || 'percentage',
                sessionsPerDay: 1,
                sessionDuration: 30,
                projects: [],
                goals: [],
                startDate: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'files');
            }
            changesMade = true;
          }
          else if (call.name === 'nestFileUnderParent') {
            const { childFileId, parentFileId } = call.args as any;
            const childRef = doc(db, 'files', childFileId);
            const childSnap = await getDoc(childRef);
            if (childSnap.exists()) {
              const childData = childSnap.data() as AppFile;
              const parentRef = doc(db, 'files', parentFileId);
              try {
                await updateDoc(parentRef, {
                  projects: arrayUnion({
                    id: childFileId,
                    title: childData.title,
                    status: childData.status,
                    progress: childData.progress
                  })
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.UPDATE, `files/${parentFileId}`);
              }
              try {
                await deleteDoc(childRef);
              } catch (err) {
                handleFirestoreError(err, OperationType.DELETE, `files/${childFileId}`);
              }
              changesMade = true;
            }
          }
          else if (call.name === 'updateFileStructure') {
            const { fileId: targetFileId, updates } = call.args as any;
            const fileRef = doc(db, 'files', targetFileId);
            try {
              await updateDoc(fileRef, { ...updates });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `files/${targetFileId}`);
            }
            changesMade = true;
          }
          else if (call.name === 'linkFiles') {
            const { fileId1, fileId2 } = call.args as any;
            try {
              await updateDoc(doc(db, 'files', fileId1), {
                linkedFileIds: arrayUnion(fileId2)
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `files/${fileId1}`);
            }
            try {
              await updateDoc(doc(db, 'files', fileId2), {
                linkedFileIds: arrayUnion(fileId1)
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `files/${fileId2}`);
            }
            changesMade = true;
          }
          else if (call.name === 'createGoal') {
            const { text, description, type, points, time, parentId } = call.args as any;
            try {
              await addDoc(collection(db, 'goals'), {
                uid: profile.uid,
                text,
                description: description || '',
                type: type || 'daily',
                time: time || null,
                parentId: parentId || null,
                status: 'pending',
                points: Math.min(30, points || (type === 'daily' ? 10 : type === 'weekly' ? 20 : 30)),
                createdAt: serverTimestamp()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'goals');
            }
            changesMade = true;
          }
          else if (call.name === 'updateGoal') {
            const { goalId, updates } = call.args as any;
            try {
              const finalUpdates = { ...updates };
              if (finalUpdates.points) finalUpdates.points = Math.min(30, finalUpdates.points);
              await updateDoc(doc(db, 'goals', goalId), finalUpdates);
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}`);
            }
            changesMade = true;
          }
          else if (call.name === 'logAchievement') {
            const { content, points } = call.args as any;
            const cappedPoints = Math.min(30, points || 0);
            try {
              await addDoc(collection(db, 'thoughts'), {
                uid: profile.uid,
                content: `إنجاز: ${content}`,
                timestamp: serverTimestamp()
              });
              const profileRef = doc(db, 'users', profile.uid);
              const newPulse = Math.min(100, (profile.pulse || 50) + 5); // Increase pulse on achievement
              await updateDoc(profileRef, {
                points: (profile.points || 0) + cappedPoints,
                level: Math.floor(((profile.points || 0) + cappedPoints) / 500) + 1,
                pulse: newPulse
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, 'thoughts/points');
            }
            changesMade = true;
          }
          else if (call.name === 'confirmGoal') {
            const { goalId } = call.args as any;
            const goalRef = doc(db, 'goals', goalId);
            try {
              const goalSnap = await getDoc(goalRef);
              if (goalSnap.exists()) {
                const goalData = goalSnap.data() as Goal;
                if (goalData.status !== 'completed') {
                  await updateDoc(goalRef, {
                    status: 'completed',
                    completedAt: serverTimestamp()
                  });
                  const profileRef = doc(db, 'users', profile.uid);
                  const earnedPoints = goalData.points || 10;
                  const newPulse = Math.min(100, (profile.pulse || 50) + 10); // Increase pulse on goal confirmation
                  await updateDoc(profileRef, {
                    points: (profile.points || 0) + earnedPoints,
                    level: Math.floor(((profile.points || 0) + earnedPoints) / 500) + 1,
                    pulse: newPulse
                  });
                }
              }
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}`);
            }
            changesMade = true;
          }
          else if (call.name === 'denyGoal') {
            const { goalId } = call.args as any;
            const goalRef = doc(db, 'goals', goalId);
            try {
              await updateDoc(goalRef, {
                status: 'pending'
              });
              const profileRef = doc(db, 'users', profile.uid);
              const newPulse = Math.max(0, (profile.pulse || 50) - 15); // Decrease pulse on goal denial
              await updateDoc(profileRef, {
                pulse: newPulse
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, `goals/${goalId}`);
            }
            changesMade = true;
          }
          else if (call.name === 'sendFloatingInsight') {
            const { content, type, location } = call.args as any;
            try {
              await addDoc(collection(db, 'insights'), {
                uid: profile.uid,
                content,
                type: type || 'info',
                location: location || 'all',
                isRead: false,
                timestamp: serverTimestamp()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'insights');
            }
            changesMade = true;
          }
          else if (call.name === 'archiveDay') {
            const { aiSummary, points, goals: completedGoals, thoughts: userThoughts } = call.args as any;
            
            try {
              await upsertDailyArchive(profile.uid, {
                aiSummary,
                points,
                goals: completedGoals || [],
                thoughts: userThoughts || [],
                timestamp: serverTimestamp()
              });
            } catch (err) {
              console.error("Error archiving day:", err);
            }
            changesMade = true;
          }
          else if (call.name === 'createFile') {
            const { title, content, fruits, duration, frequency, trackingType, assistantName, sessionsPerDay, sessionDuration } = call.args as any;
            try {
              await addDoc(collection(db, 'files'), {
                uid: profile.uid,
                title,
                content,
                fruits: fruits || '',
                duration,
                frequency,
                assistantName: assistantName || 'عون العظمة',
                status: 'active',
                progress: 0,
                trackingType: trackingType || 'percentage',
                sessionsPerDay: sessionsPerDay || 1,
                sessionDuration: sessionDuration || 30,
                projects: [],
                goals: [],
                startDate: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, 'files');
            }
            changesMade = true;
          }
          else if (call.name === 'recordNegativeActivity') {
            const { reason, severity } = call.args as any;
            const pointsToDeduct = severity === 'high' ? 15 : 5;
            try {
              const profileRef = doc(db, 'users', profile.uid);
              const newPulse = Math.max(0, (profile.pulse || 50) - (severity === 'high' ? 20 : 10));
              await updateDoc(profileRef, {
                points: Math.max(0, (profile.points || 0) - pointsToDeduct),
                pulse: newPulse
              });
              // Log the negligence in the archive
              const activityId = Math.random().toString(36).substring(2, 11);
              await upsertDailyArchive(profile.uid, {
                activities: arrayUnion({
                  id: activityId,
                  type: 'negligence',
                  content: `[رصد إداري] ${reason}`,
                  points: -pointsToDeduct,
                  time: new Date().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })
                })
              } as any);
            } catch (err) {
              console.error("Error recording negative activity:", err);
            }
            changesMade = true;
          }
          else if (call.name === 'vetoAchievement') {
            const { achievementId, reason, penaltyPoints } = call.args as any;
            try {
              const now = new Date();
              const dateString = getIslamicDateString(now, profile.coordinates);
              const [year, month, day] = dateString.split('-');
              const week = `W${Math.ceil(parseInt(day) / 7)}`;
              const dayPath = `archives/${profile.uid}/years/${year}/months/${parseInt(month)}/weeks/${week}/days/${dateString}`;
              
              const dayDoc = await getDoc(doc(db, dayPath));
              if (dayDoc.exists()) {
                const data = dayDoc.data() as ArchiveEntry;
                const activityToVeto = data.activities?.find(a => a.id === achievementId);
                
                if (activityToVeto) {
                  const filteredActivities = data.activities?.filter(a => a.id !== achievementId) || [];
                  const pointsToDeduct = (activityToVeto.points || 0) + (penaltyPoints || 0);
                  
                  await updateDoc(doc(db, dayPath), {
                    activities: filteredActivities,
                    'stats.pointsEarned': increment(-pointsToDeduct)
                  });
                  
                  const profileRef = doc(db, 'users', profile.uid);
                  await updateDoc(profileRef, {
                    points: Math.max(0, (profile.points || 0) - pointsToDeduct),
                    pulse: Math.max(0, (profile.pulse || 50) - 10)
                  });

                  // Add a record of the veto
                  await upsertDailyArchive(profile.uid, {
                    activities: arrayUnion({
                      id: Math.random().toString(36).substring(2, 11),
                      type: 'veto',
                      content: `[رمضان فيتو] تم رفض العمل: "${activityToVeto.content}". السبب: ${reason}`,
                      points: -(penaltyPoints || 0),
                      time: new Date().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })
                    })
                  } as any, profile.coordinates);
                }
              }
            } catch (err) {
              console.error("Error executing vetoAchievement:", err);
            }
            changesMade = true;
          }
          else if (call.name === 'recordBreathOrThought') {
            const { content, type } = call.args as any;
            try {
              await addDoc(collection(db, 'thoughts'), {
                uid: profile.uid,
                content: `${type === 'breath' ? '[نفس]' : '[خاطرة]'} ${content}`,
                timestamp: serverTimestamp(),
                type,
                fileId: fileId || null
              });
              
              // Also add to daily archive for the report
              await upsertDailyArchive(profile.uid, {
                activities: arrayUnion({
                  id: Math.random().toString(36).substring(2, 11),
                  type: 'insight',
                  content: `${type === 'breath' ? 'نفس روحاني' : 'خاطرة عميقة'}: ${content}`,
                  time: new Date().toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' })
                })
              } as any, profile.coordinates);
            } catch (err) {
              console.error("Error recording breath/thought:", err);
            }
            changesMade = true;
          }
          else if (call.name === 'revalueGoals') {
            const { adjustments, seasonalMessage } = call.args as any;
            try {
              for (const adj of adjustments) {
                await updateDoc(doc(db, 'goals', adj.goalId), {
                  points: adj.newPoints
                });
              }
              
              // Send the sovereign message as a floating insight
              await addDoc(collection(db, 'insights'), {
                uid: profile.uid,
                content: seasonalMessage,
                type: 'warning',
                location: 'all',
                isRead: false,
                timestamp: serverTimestamp()
              });
            } catch (err) {
              console.error("Error executing revalueGoals:", err);
            }
            changesMade = true;
          }
          else if (call.name === 'deleteFile') {
            const { fileId: targetFileId } = call.args as any;
            try {
              await deleteDoc(doc(db, 'files', targetFileId));
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `files/${targetFileId}`);
            }
            changesMade = true;
          }
          else if (call.name === 'deleteGoal') {
            const { goalId: targetGoalId } = call.args as any;
            try {
              await deleteDoc(doc(db, 'goals', targetGoalId));
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `goals/${targetGoalId}`);
            }
            changesMade = true;
          }
        } catch (err) {
          console.error(`Error executing tool ${call.name}:`, err);
        }
      }

      // 5. If changes were made, get a final explanation
      const followUpResponse = await generateRamadanManResponse(
        [
          ...history, 
          { role: 'user', parts: [{ text: fileContext + triggerMessage }] }, 
          { role: 'model', parts: aiResponse.candidates?.[0]?.content?.parts || [] }
        ],
        "أخبر المستخدم بالتغييرات الإدارية التي أجريتها للتو في ملفاته وأهدافه بناءً على تحليلك المباشر. كن حازماً وموجهاً. (تنبيه: لا تشرح قانون الـ 30 نقطة إلا إذا سألك المستخدم عنه؛ فقط طبقه).",
        { files, goals }
      );

      const finalContent = followUpResponse.text || "لقد أجريت التعديلات الإدارية اللازمة على ملفاتك وأهدافك لضمان عدم التشتت.";
      
      // Log AI response to archive
      await logChatToArchive(profile.uid, 'model', finalContent, fileId);

      const path = `chats/${profile.uid}/messages`;
      try {
        await addDoc(collection(db, path), {
          uid: profile.uid,
          fileId: fileId || null,
          role: 'model',
          content: finalContent,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }

      // Also update file chatHistory for legacy support/backup if it's a real file
      if (fileId && !fileId.startsWith('quasi-')) {
        const fileRef = doc(db, 'files', fileId);
        try {
          await updateDoc(fileRef, {
            chatHistory: arrayUnion({
              uid: 'assistant',
              role: 'model',
              content: finalContent,
              timestamp: new Date()
            })
          });
        } catch (err) {
          // Non-critical
        }
      }
    } else {
      // No tools called, just post the AI's text response if it exists
      const finalContent = aiResponse.text;
      if (finalContent) {
        // Log AI response to archive
        await logChatToArchive(profile.uid, 'model', finalContent, fileId);

        const path = `chats/${profile.uid}/messages`;
        try {
          await addDoc(collection(db, path), {
            uid: profile.uid,
            fileId: fileId || null,
            role: 'model',
            content: finalContent,
            timestamp: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, path);
        }

        if (fileId && !fileId.startsWith('quasi-')) {
          const fileRef = doc(db, 'files', fileId);
          try {
            await updateDoc(fileRef, {
              chatHistory: arrayUnion({
                uid: 'assistant',
                role: 'model',
                content: finalContent,
                timestamp: new Date()
              })
            });
          } catch (err) {
            // Non-critical
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in administrative review:", error);
  }
};
