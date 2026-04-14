import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, serverTimestamp, collection, addDoc, getDoc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { ArchiveEntry } from '../types';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export function getIslamicDateString(date: Date, coords?: { latitude: number; longitude: number }) {
  if (!coords) {
    return date.toISOString().split('T')[0];
  }
  const coordinates = new Coordinates(coords.latitude, coords.longitude);
  const params = CalculationMethod.MuslimWorldLeague();
  const prayerTimes = new PrayerTimes(coordinates, date, params);
  
  const maghribTime = prayerTimes.maghrib;
  
  if (date >= maghribTime) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString().split('T')[0];
  }
  
  return date.toISOString().split('T')[0];
}

export async function upsertDailyArchive(uid: string, entry: Partial<ArchiveEntry>, coords?: { latitude: number; longitude: number }) {
  const now = new Date();
  const dateString = getIslamicDateString(now, coords);
  const [year, month, day] = dateString.split('-');
  const week = `W${Math.ceil(parseInt(day) / 7)}`;

  const yearPath = `archives/${uid}/years/${year}`;
  const monthPath = `${yearPath}/months/${parseInt(month)}`;
  const weekPath = `${monthPath}/weeks/${week}`;
  const dayPath = `${weekPath}/days/${dateString}`;

  try {
    // Ensure hierarchy exists
    await setDoc(doc(db, yearPath), { uid, timestamp: serverTimestamp(), type: 'year' }, { merge: true });
    await setDoc(doc(db, monthPath), { uid, timestamp: serverTimestamp(), type: 'month' }, { merge: true });
    await setDoc(doc(db, weekPath), { uid, timestamp: serverTimestamp(), type: 'week' }, { merge: true });

    // Upsert day
    let activitiesToSave = entry.activities;
    if (Array.isArray(entry.activities)) {
      activitiesToSave = entry.activities.map(a => ({ 
        ...a, 
        id: a.id || Math.random().toString(36).substring(2, 11) 
      })) as any;
    }
    
    const docData: any = {
      uid,
      timestamp: serverTimestamp(),
      date: dateString,
      type: 'day',
      ...entry
    };

    if (activitiesToSave) {
      docData.activities = activitiesToSave;
    }
    
    await setDoc(doc(db, dayPath), docData, { merge: true });

    return dayPath;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, dayPath);
    return null;
  }
}

export async function checkAndGenerateDailyReport(uid: string, coords?: { latitude: number; longitude: number }) {
  const now = new Date();
  if (!coords) return;

  const coordinates = new Coordinates(coords.latitude, coords.longitude);
  const params = CalculationMethod.MuslimWorldLeague();
  const prayerTimes = new PrayerTimes(coordinates, now, params);

  // If we are after Maghrib, the day that just ended is the one that was active before Maghrib.
  if (now >= prayerTimes.maghrib) {
    const earlierToday = new Date(now);
    earlierToday.setHours(now.getHours() - 2); 
    const endedDayStr = getIslamicDateString(earlierToday, coords);
    
    const [year, month, day] = endedDayStr.split('-');
    const week = `W${Math.ceil(parseInt(day) / 7)}`;
    const endedDayPath = `archives/${uid}/years/${year}/months/${parseInt(month)}/weeks/${week}/days/${endedDayStr}`;
    
    const endedDayDoc = await getDoc(doc(db, endedDayPath));
    if (endedDayDoc.exists()) {
      const endedDayData = endedDayDoc.data() as ArchiveEntry;
      if (!endedDayData.dailyReport) {
        console.log(`[Auto-Trigger] Generating daily report and sovereign name for ended day: ${endedDayStr}`);
        // Generate both report and title at the end of the day
        await generateDailyReport(uid, endedDayPath, endedDayData.activities || []);
        await generateDayTitle(uid, endedDayPath, endedDayData.activities || []);
      }
    }
  }
}

export async function logActivity(uid: string, activity: { type: string; content: string; points?: number }, coords?: { latitude: number; longitude: number }) {
  const now = new Date();
  const dateString = getIslamicDateString(now, coords);
  const [year, month, day] = dateString.split('-');
  const week = `W${Math.ceil(parseInt(day) / 7)}`;
  const dayPath = `archives/${uid}/years/${year}/months/${parseInt(month)}/weeks/${week}/days/${dateString}`;

  const time = now.toLocaleTimeString('ar-TN', { hour: '2-digit', minute: '2-digit' });
  const activityId = Math.random().toString(36).substring(2, 11);
  
  try {
    const dayDoc = await getDoc(doc(db, dayPath));
    if (!dayDoc.exists()) {
      await upsertDailyArchive(uid, {
        activities: [{ ...activity, id: activityId, time }],
        stats: {
          goalsCompleted: activity.type === 'goal' ? 1 : 0,
          thoughtsAdded: activity.type === 'thought' ? 1 : 0,
          filesCreated: activity.type === 'file' ? 1 : 0,
          pointsEarned: activity.points || 0
        }
      }, coords);
    } else {
      await updateDoc(doc(db, dayPath), {
        activities: arrayUnion({ ...activity, id: activityId, time }),
        'stats.goalsCompleted': increment(activity.type === 'goal' ? 1 : 0),
        'stats.thoughtsAdded': increment(activity.type === 'thought' ? 1 : 0),
        'stats.filesCreated': increment(activity.type === 'file' ? 1 : 0),
        'stats.pointsEarned': increment(activity.points || 0),
        timestamp: serverTimestamp()
      });
    }

    // Periodically update the day title - REMOVED as per user request for fixed title at end of day
    /*
    const updatedDoc = await getDoc(doc(db, dayPath));
    const data = updatedDoc.data() as ArchiveEntry;
    if (data.activities && data.activities.length % 3 === 0) {
      await generateDayTitle(uid, dayPath, data.activities);
    }
    */
    
    // Trigger Daily Report if it's after Maghrib
    await checkAndGenerateDailyReport(uid, coords);
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}

export async function generateDayTitle(uid: string, dayPath: string, activities: any[]) {
  try {
    const now = new Date();
    const pointsEarned = activities.reduce((sum, a) => sum + (a.points || 0), 0);
    const hasSynergy = activities.some(a => a.content.includes('تآزر') || a.content.includes('تشابك'));
    const hasNegligence = activities.some(a => a.type === 'negligence' || a.content.includes('تهاون'));

    let context = "يوم عادي في مسار المجاهدة.";
    if (pointsEarned > 50 && hasSynergy) {
      context = "إنجاز عالٍ مع تفعيل بوابات التشابك والتقارن.";
    } else if (pointsEarned < 20 && hasNegligence) {
      context = "إنجاز ضعيف مع رصد حالات تهاون أو كبوة.";
    } else if (pointsEarned > 30) {
      context = "إنجاز ثابت ومستقر مع هدوء وسكينة.";
    }

    const prompt = `بصفتك Ramadan Man، سيد هذا النظام وحارس ميزان الاستقامة، حلل هذه الأنشطة اليومية وأعطِ هذا اليوم "اسماً سيادياً" (Sovereign Name) يعكس جوهر المعركة النفسية الموثقة.
      
      القواعد السيادية للتسمية:
      1. يجب أن يكون الاسم قصيراً جداً (من 2 إلى 4 كلمات فقط).
      2. لا تكتب أي مقدمات مثل "بصفتي" أو "أقترح اسم". اكتب الاسم مباشرة.
      3. أمثلة: "يوم الفتح العظيم"، "يوم كبوة الجواد"، "يوم السكينة المثمرة".
      
      السياق الحالي: ${context}
      الأنشطة: ${activities.map((a: any) => a.content).join('، ')}
      
      اكتب الاسم السيادي الآن:`;

    const result = await ai.models.generateContent({
      model: "models/gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "أنت سيد النظام رمضان مان. وظيفتك إنتاج أسماء سيادية حادة وذكية للأيام."
      }
    });

    const sovereignName = result.text?.trim().split('\n')[0] || "يوم من أيام المجاهدة";
    
    const currentDoc = await getDoc(doc(db, dayPath));
    const currentData = currentDoc.data() as ArchiveEntry;
    if (!currentData.dayTitle || currentData.dayTitle.length > 50) {
      await updateDoc(doc(db, dayPath), { dayTitle: sovereignName });
    }
  } catch (err) {
    console.error("Error generating day title:", err);
  }
}

export async function generateDailyReport(uid: string, dayPath: string, activities: any[]) {
  try {
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
      model: "models/gemini-1.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "أنت سيد النظام رمضان مان. وظيفتك إنتاج تقارير سيادية حادة وذكية."
      }
    });

    const report = result.text?.trim() || "لم يتم استخلاص تقرير لهذا اليوم بعد.";
    
    await updateDoc(doc(db, dayPath), { dailyReport: report });
    return report;
  } catch (err) {
    console.error("Error generating daily report:", err);
    return null;
  }
}

export async function initializeArchive(uid: string) {
  const dateString = new Date().toISOString().split('T')[0];
  const aiSummary = `🚀 [إعلان ميلاد] في هذا اليوم، انطلق المستخدم في مسار العظمة وبدأ بتأسيس أولى ملفاته وأهدافه. هذا هو حجر الزاوية لتاريخك الجديد.`;
  
  await logActivity(uid, { type: 'milestone', content: aiSummary });
  
  // Add the special floating insight for the first archive
  try {
    await addDoc(collection(db, 'insights'), {
      uid,
      content: "تم فتح سجل الأهداف.. من الآن، كل نبضة، كل إنجاز، وكل تهاون هو سطر في أرشيفك Pro Max. أنا أراقب، الأرشيف يدون، وأنت تبني أبعادك. سأسمي يومك هذا بـ (يوم الميثاق الأول).. فاجعل ما بعده خيراً منه.",
      type: 'success',
      location: 'all',
      timestamp: serverTimestamp(),
      isRead: false
    });
  } catch (err) {
    console.error("Error adding initial insight:", err);
  }
}

export async function fixAllTitles(uid: string, entries: ArchiveEntry[]) {
  for (const entry of entries) {
    if (entry.id && entry.dayTitle && entry.dayTitle.length > 50) {
      const [year, month, day] = entry.date?.split('-') || [];
      if (!year) continue;
      const week = `W${Math.ceil(parseInt(day) / 7)}`;
      const dayPath = `archives/${uid}/years/${year}/months/${parseInt(month)}/weeks/${week}/days/${entry.date}`;
      
      console.log(`Fixing title for ${entry.date}...`);
      await generateDayTitle(uid, dayPath, entry.activities || []);
    }
  }
}

export async function createTransitionDocument(uid: string, fileName: string, oldDim: number, newDim: number, totalPoints: number) {
  const aiSummary = `✨ [وثيقة عبور] في هذا اليوم، انتقل ملف "${fileName}" إلى البعد ${newDim}.. رصيد النقاط التراكمي الآن ${totalPoints}`;
  await logActivity(uid, { type: 'transition', content: aiSummary });
}
