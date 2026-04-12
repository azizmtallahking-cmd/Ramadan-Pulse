import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, deleteDoc, limit } from 'firebase/firestore';
import { File, Project, Synergy } from '../types';
import { logActivity } from './archiveService';

async function isFileEmpty(uid: string, fileId: string): Promise<boolean> {
  const vaultSnap = await getDocs(query(collection(db, 'vault'), where('fileId', '==', fileId), limit(1)));
  const projectsSnap = await getDocs(query(collection(db, 'projects'), where('fileId', '==', fileId), limit(1)));
  
  // A file is empty if it has no vault items OR no projects
  return vaultSnap.empty || projectsSnap.empty;
}

export async function scanForSynergy(uid: string, files: File[]) {
  if (files.length < 2) return;

  // Filter out empty files based on Ramadan Man's "Full Vault" requirement
  const eligibleFiles: File[] = [];
  for (const file of files) {
    if (file.id && !(await isFileEmpty(uid, file.id))) {
      eligibleFiles.push(file);
    }
  }

  if (eligibleFiles.length < 2) return;
  
  try {
    const response = await fetch('/api/ai/synergy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eligibleFiles })
    });

    if (!response.ok) throw new Error('Failed to fetch synergy');
    const synergiesFound = await response.json();
    
    for (const syn of synergiesFound) {
      // Check if synergy already exists
      const q = query(
        collection(db, 'synergies'),
        where('uid', '==', uid),
        where('fileAId', '==', syn.fileAId),
        where('fileBId', '==', syn.fileBId)
      );
      let existing;
      try {
        existing = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'synergies');
        continue;
      }
      
      const fileA = files.find(f => f.id === syn.fileAId);
      const fileB = files.find(f => f.id === syn.fileBId);
      
      if (!fileA || !fileB) continue;

      // Calculate maturity days (simplified: check if both were active recently)
      // In a real app, we'd track daily activity streaks.
      // For now, let's assume if they exist and have points, they have some maturity.
      const maturityDays = 0; // Starts at 0, grows with daily activity

      if (existing.empty) {
        try {
          await addDoc(collection(db, 'synergies'), {
            ...syn,
            uid,
            status: 'potential',
            maturityDays: 0,
            lastActivityA: fileA.lastActive || serverTimestamp(),
            lastActivityB: fileB.lastActive || serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'synergies');
        }
      } else {
        const docId = existing.docs[0].id;
        const existingData = existing.docs[0].data() as Synergy;
        
        // Check for 48h inactivity to decouple
        const now = new Date().getTime();
        const lastA = existingData.lastActivityA?.toDate?.()?.getTime() || 0;
        const lastB = existingData.lastActivityB?.toDate?.()?.getTime() || 0;
        const diffA = (now - lastA) / (1000 * 60 * 60);
        const diffB = (now - lastB) / (1000 * 60 * 60);

        // Update maturity days
        const lastMaturityUpdate = existingData.lastUpdated?.toDate?.()?.getTime() || 0;
        const daysSinceUpdate = (now - lastMaturityUpdate) / (1000 * 60 * 60 * 24);
        
        let newMaturityDays = existingData.maturityDays || 0;
        let newStatus = existingData.status;

        // Increment maturity if both active in last 24h and a day has passed
        if (daysSinceUpdate >= 1 && diffA < 24 && diffB < 24 && newStatus === 'potential') {
          newMaturityDays = Math.min(7, newMaturityDays + 1);
          if (newMaturityDays >= 7) {
            newStatus = 'collaborative';
            // Send pre-synergy message
            try {
              await addDoc(collection(db, `chats/${uid}/messages`), {
                uid: 'system',
                role: 'model',
                content: `✨ [مرحلة التآزر والتعاون] لقد أتممتَ 7 أيام من الرصد الجاد. دخل الملفان "${fileA.title}" و "${fileB.title}" الآن في مرحلة "التآزر" (Pre-Synergy). راجع "فلسفة التقارن" في واجهة الملفات لتعرف كيف تستفيد من مواردهما بشكل متبادل.`,
                timestamp: serverTimestamp(),
                type: 'system'
              });
            } catch (err) {
              console.error("Error sending pre-synergy message:", err);
            }
          }
        }

        // Check for 48h inactivity to decouple
        if (diffA > 48 || diffB > 48) {
          if (newStatus !== 'decoupled') {
            // Send decoupling message
            try {
              await addDoc(collection(db, `chats/${uid}/messages`), {
                uid,
                role: 'model',
                content: `🚨 [تنبيه إداري] تم قطع الاقتران بين ملف "${fileA.title}" وملف "${fileB.title}" بسبب خمول النشاط لأكثر من 48 ساعة. الاستحقاق يتطلب استمرارية.`,
                timestamp: serverTimestamp(),
                type: 'system'
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.CREATE, `chats/${uid}/messages`);
            }
          }
          newStatus = 'decoupled';
        } else if (newStatus === 'decoupled' && diffA < 24 && diffB < 24) {
          // Re-potentialize if active again
          newStatus = 'potential';
          newMaturityDays = 0; // Reset maturity
        }

        try {
          await updateDoc(doc(db, 'synergies', docId), {
            ...syn,
            status: newStatus,
            maturityDays: newMaturityDays,
            lastActivityA: fileA.lastActive || serverTimestamp(),
            lastActivityB: fileB.lastActive || serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `synergies/${docId}`);
        }
      }
    }
  } catch (error) {
    console.error("Synergy Detection Error:", error);
  }
}

export async function activateSynergy(uid: string, synergyId: string, proofText: string, coords?: { latitude: number; longitude: number }) {
  try {
    const synergyRef = doc(db, 'synergies', synergyId);
    const synergySnap = await getDocs(query(collection(db, 'synergies'), where('uid', '==', uid)));
    const synergyData = synergySnap.docs.find(d => d.id === synergyId)?.data() as Synergy;
    
    if ((synergyData.maturityDays || 0) < 7) {
      throw new Error('لم يكتمل مخاض التقارن بعد (يجب إتمام 7 أيام من الرصد الجاد).');
    }

    await updateDoc(synergyRef, {
      status: 'active',
      proofText,
      activatedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });

    await logActivity(uid, { 
      type: 'synergy', 
      content: `تم تفعيل الاقتران (Active Synergy) بين ملفين بنجاح. عامل التشابك (1.5x) نشط الآن.` 
    }, coords);

    // Send success message
    try {
      await addDoc(collection(db, `chats/${uid}/messages`), {
        uid,
        role: 'model',
        content: `✨ [إعلان اقتران] تم تفعيل "حق الاقتران" بين ملفين بنجاح. لقد أثبتَّ الاستحقاق بالبرهان والعمل. عامل التشابك (1.5x) نشط الآن.`,
        timestamp: serverTimestamp(),
        type: 'system'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chats/${uid}/messages`);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `synergies/${synergyId}`);
  }
}

export async function getSynergies(uid: string): Promise<Synergy[]> {
  const q = query(collection(db, 'synergies'), where('uid', '==', uid));
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Synergy));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'synergies');
    return [];
  }
}

export async function rePotentializeSynergy(uid: string, synergyId: string) {
  try {
    const synergyRef = doc(db, 'synergies', synergyId);
    await updateDoc(synergyRef, {
      status: 'potential',
      maturityDays: 0,
      lastUpdated: serverTimestamp()
    });
    
    // Add system message
    await addDoc(collection(db, `chats/${uid}/messages`), {
      uid: 'system',
      role: 'model',
      content: `🔄 تم رصد عودة النشاط. دخل الملفان مجدداً في مرحلة "مخاض التقارن" (7 أيام رصد جاد).`,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `synergies/${synergyId}/repotentialize`);
  }
}

export async function checkAndDecoupleSynergies(uid: string, coords?: { latitude: number; longitude: number }) {
  try {
    const synergiesSnap = await getDocs(query(collection(db, 'synergies'), where('uid', '==', uid), where('status', '==', 'active')));
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    for (const docSnap of synergiesSnap.docs) {
      const synergy = docSnap.data() as Synergy;
      const lastActivityA = synergy.lastActivityA?.toDate() || new Date(0);
      const lastActivityB = synergy.lastActivityB?.toDate() || new Date(0);

      if (lastActivityA < fortyEightHoursAgo || lastActivityB < fortyEightHoursAgo) {
        await updateDoc(docSnap.ref, {
          status: 'decoupled',
          lastUpdated: serverTimestamp()
        });

        await logActivity(uid, { 
          type: 'synergy', 
          content: `تم قطع الاقتران بين ملفاتك بسبب خمول النشاط لأكثر من 48 ساعة.` 
        }, coords);
        
        // Add system message
        await addDoc(collection(db, `chats/${uid}/messages`), {
          uid: 'system',
          role: 'model',
          content: `⚠️ تنبيه إداري: تم قطع الاقتران بين ملفاتك بسبب خمول النشاط لأكثر من 48 ساعة. الاستقامة تتطلب استمرارية.`,
          timestamp: serverTimestamp()
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'synergies/decouple');
  }
}
