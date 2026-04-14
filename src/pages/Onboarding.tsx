import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User, Camera, ArrowRight, CheckCircle2, Globe, Heart, Info, UserCircle } from 'lucide-react';

interface OnboardingProps {
  profile: UserProfile;
}

export default function Onboarding({ profile }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    country: '',
    appBenefit: '',
    visitReason: '',
    photoURL: profile.photoURL || '',
    useGooglePhoto: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'users', profile.uid);
      await updateDoc(docRef, {
        ...formData,
        age: parseInt(formData.age) || 0,
        onboardingCompleted: true,
        lastActive: serverTimestamp()
      });
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
      <div className="max-w-xl w-full bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-stone-100">
          <motion.div 
            className="h-full bg-emerald-500"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          <motion.div
            key={step}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.4 }}
          >
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <UserCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-stone-900 font-serif">مرحباً بك في رحابنا</h2>
                  <p className="text-stone-500">لنتعرف عليك أكثر لنصمم لك تجربة تليق بمقامك</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 mr-1">الاسم الأول</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="مثال: محمد"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 mr-1">اللقب</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="مثال: العلي"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700 mr-1">العمر</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="كم ربيعاً مضى من عمرك؟"
                  />
                </div>

                <button
                  onClick={handleNext}
                  disabled={!formData.firstName || !formData.lastName || !formData.age}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  التالي <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-stone-900 font-serif">هويتك البصرية</h2>
                  <p className="text-stone-500">اختر الصورة التي تمثلك في هذا الفضاء</p>
                </div>

                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <img 
                      src={formData.useGooglePhoto ? profile.photoURL : 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + formData.firstName} 
                      alt="Profile" 
                      className="w-32 h-32 rounded-full border-4 border-emerald-100 object-cover shadow-lg"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-md">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 w-full gap-3">
                    <button
                      onClick={() => setFormData({ ...formData, useGooglePhoto: true, photoURL: profile.photoURL })}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${formData.useGooglePhoto ? 'border-emerald-500 bg-emerald-50' : 'border-stone-100 hover:border-emerald-200'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <img src={profile.photoURL} className="w-8 h-8 rounded-full" alt="Default" />
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-stone-900">البقاء على الصورة الافتراضية</p>
                        <p className="text-xs text-stone-500">استخدام الصورة الحالية</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setFormData({ ...formData, useGooglePhoto: false, photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + formData.firstName })}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${!formData.useGooglePhoto ? 'border-emerald-500 bg-emerald-50' : 'border-stone-100 hover:border-emerald-200'}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <User className="w-6 h-6 text-stone-400" />
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-stone-900">توليد صورة رمزية جديدة</p>
                        <p className="text-xs text-stone-500">صورة فنية تعبر عنك</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleBack} className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all">السابق</button>
                  <button onClick={handleNext} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                    التالي <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-stone-900 font-serif">موطنك واهتماماتك</h2>
                  <p className="text-stone-500">لنربط نبضك بمكانك وأهدافك</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 mr-1">بلدك</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={e => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="أين تقيم حالياً؟"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 mr-1">كيف يمكن لهذا التطبيق أن يفيدك؟</label>
                    <textarea
                      value={formData.appBenefit}
                      onChange={e => setFormData({ ...formData, appBenefit: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
                      placeholder="ما هي توقعاتك وأهدافك هنا؟"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 mr-1">ما سبب زيارتك لنا؟</label>
                    <textarea
                      value={formData.visitReason}
                      onChange={e => setFormData({ ...formData, visitReason: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none"
                      placeholder="ما الذي دفعك لاكتشاف نبض رمضان؟"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleBack} className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all">السابق</button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !formData.country || !formData.appBenefit || !formData.visitReason}
                    className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'جاري الحفظ...' : 'إتمام البناء'} <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
