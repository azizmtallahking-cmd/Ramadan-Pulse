import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';

export const seedUserRoutine = async (profile: UserProfile) => {
  try {
    // Check if goals already exist for this user
    const goalsQ = query(collection(db, 'goals'), where('uid', '==', profile.uid));
    let goalsSnap;
    try {
      goalsSnap = await getDocs(goalsQ);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'goals');
      return;
    }
    
    if (goalsSnap.empty) {
      console.log("Seeding standard routine for user:", profile.uid);
      
      // 1. Create Parent Goal for Prayers
      let prayersParentRef;
      try {
        prayersParentRef = await addDoc(collection(db, 'goals'), {
          uid: profile.uid,
          text: "الصلوات الخمس",
          description: "المحافظة على الصلوات الخمس في أوقاتها مع الخشوع.",
          type: "daily",
          status: "pending",
          points: 50,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'goals');
        return;
      }

      const standardGoals = [
        { text: "صلاة الفجر في المسجد", description: "أقله رتبة في البيت حاضر لكن الأولى والواجب في المسجد.", type: "daily", points: 20, time: "05:00", parentId: prayersParentRef.id },
        { text: "صلاة الظهر", type: "daily", points: 10, time: "12:30", parentId: prayersParentRef.id },
        { text: "صلاة العصر", type: "daily", points: 10, time: "15:45", parentId: prayersParentRef.id },
        { text: "صلاة المغرب", type: "daily", points: 10, time: "18:30", parentId: prayersParentRef.id },
        { text: "صلاة العشاء", type: "daily", points: 10, time: "20:00", parentId: prayersParentRef.id },
        { text: "أذكار الصباح", description: "القيام بأذكار الصباح كاملة.", type: "daily", points: 10, time: "06:00" },
        { text: "أذكار المساء", description: "القيام بأذكار المساء كاملة.", type: "daily", points: 10, time: "17:30" },
        { text: "ورد القرآن الكريم", description: "قراءة الورد اليومي المحدد من القرآن.", type: "daily", points: 20 },
        { text: "غض البصر", description: "المحافظة على غض البصر طوال اليوم.", type: "daily", points: 15 },
        { text: "صلاة الوتر", description: "ختم اليوم بصلاة الوتر.", type: "daily", points: 15, time: "22:00" },
        { text: "بر الوالدين", description: "الإحسان إلى الوالدين والقيام بحقوقهما.", type: "daily", points: 20 },
        { text: "أستغفر الله (08:00)", description: "20 مرة لافتتاح اليوم بالتوبة وتجديد النية.", type: "daily", points: 5, time: "08:00" },
        { text: "لا إله إلا الله (10:00)", description: "20 مرة لتثبيت التوحيد في القلب وسط الانشغال.", type: "daily", points: 5, time: "10:00" },
        { text: "التسبيح والتحميد (12:00)", description: "20 مرة شكر لله على نعمة الوقت والرزق.", type: "daily", points: 5, time: "12:00" },
        { text: "لا حول ولا قوة إلا بالله (14:00)", description: "20 مرة لطلب العون في التعب ووقت فتور الهمة.", type: "daily", points: 5, time: "14:00" },
        { text: "الصلاة على النبي (16:00)", description: "20 مرة ختم اليوم بالصلاة على النبي ﷺ.", type: "daily", points: 5, time: "16:00" },
        { text: "الصدقة", description: "بذل المعروف والصدقة ولو بالقليل.", type: "general", points: 30 }
      ];

      for (const goal of standardGoals) {
        try {
          await addDoc(collection(db, 'goals'), {
            uid: profile.uid,
            ...goal,
            status: 'pending',
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'goals');
        }
      }

      // Also seed the "Al-Binaa Al-Manhaji" file if missing
      const filesQ = query(collection(db, 'files'), where('uid', '==', profile.uid), where('title', '==', 'البناء المنهجي'));
      let filesSnap;
      try {
        filesSnap = await getDocs(filesQ);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'files');
        return;
      }
      if (filesSnap.empty) {
        try {
          await addDoc(collection(db, 'files'), {
            uid: profile.uid,
            title: "البناء المنهجي",
            content: "مشروع عظيم لطلب العلم الشرعي الممنهج، يمتد لسنوات.",
            fruits: "التأصيل العلمي، فهم العقيدة، وتزكية النفس.",
            duration: "long-term",
            frequency: "daily",
            status: "active",
            progress: 0,
            trackingType: "percentage",
            sessionsPerDay: 1,
            sessionDuration: 60,
            projects: [],
            goals: [],
            startDate: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'files');
        }
      }
    }
  } catch (error) {
    console.error("Error seeding user routine:", error);
  }
};
