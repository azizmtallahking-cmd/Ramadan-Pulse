import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, serverTimestamp, increment, getDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { UserProfile, File, Synergy } from '../types';
import { createTransitionDocument } from './archiveService';
import { rePotentializeSynergy } from './synergyService';
import { updateUserPulse } from './adminService';

export const POINTS_PER_STAR = 200;
export const STARS_PER_DIMENSION = 5;
export const POINTS_PER_DIMENSION = POINTS_PER_STAR * STARS_PER_DIMENSION; // 1000

export async function addPointsToFile(uid: string, fileId: string, points: number, profile: UserProfile) {
  try {
    const fileRef = doc(db, 'files', fileId);
    const fileSnap = await getDoc(fileRef);
    if (!fileSnap.exists()) return;
    
    const fileData = fileSnap.data() as File;
    const oldPoints = fileData.points || 0;
    const newFilePoints = oldPoints + points;
    
    const oldDimension = fileData.dimension || 0;
    const newDimension = Math.floor(newFilePoints / POINTS_PER_DIMENSION);

    const updates: any = {
      points: increment(points),
      lastActive: serverTimestamp()
    };

    if (newDimension > oldDimension) {
      updates.dimension = newDimension;
      // Create transition document in archive
      await createTransitionDocument(uid, fileData.title, oldDimension, newDimension, newFilePoints);
    }

    await updateDoc(fileRef, updates);

    // Update synergy activity timestamps
    const synergiesSnap = await getDocs(query(collection(db, 'synergies'), where('uid', '==', uid)));
    for (const docSnap of synergiesSnap.docs) {
      const synergy = docSnap.data() as Synergy;
      if (synergy.fileAId === fileId || synergy.fileBId === fileId) {
        if (synergy.status === 'decoupled') {
          await rePotentializeSynergy(uid, docSnap.id);
        } else {
          const field = synergy.fileAId === fileId ? 'lastActivityA' : 'lastActivityB';
          await updateDoc(docSnap.ref, { [field]: serverTimestamp(), lastUpdated: serverTimestamp() });
        }
      }
    }

    // Update user profile points and level
    const newUserPoints = (profile.points || 0) + points;
    const newLevel = Math.floor(newUserPoints / 500) + 1;

    await updateDoc(doc(db, 'users', uid), {
      points: increment(points),
      level: newLevel,
      lastActive: serverTimestamp()
    });

    // Update pulse on activity
    await updateUserPulse(uid, points > 0 ? 'positive' : 'neutral');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `points/file/${fileId}`);
  }
}

export async function addUserPoints(uid: string, points: number, profile: UserProfile) {
  try {
    const newUserPoints = (profile.points || 0) + points;
    const newLevel = Math.floor(newUserPoints / 500) + 1;

    await updateDoc(doc(db, 'users', uid), {
      points: increment(points),
      level: newLevel,
      lastActive: serverTimestamp()
    });

    // Update pulse on activity
    await updateUserPulse(uid, points > 0 ? 'positive' : 'neutral');
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `points/user/${uid}`);
  }
}
