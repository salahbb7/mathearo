import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { connectDB } from '@/lib/db';
import GameSettings from '@/models/GameSettings';

async function getWhatsappNumber(): Promise<string> {
  try {
    await connectDB();
    const settings = await GameSettings.findOne().lean() as any;
    return settings?.whatsappNumber || '96871776166';
  } catch {
    return '96871776166';
  }
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const whatsappNumber = await getWhatsappNumber();

  const stats = [
    { value: '+٣٣', label: 'لعبة تعليمية' },
    { value: '+١٠٠٠', label: 'طالب مستفيد' },
    { value: '١٠٠٪', label: 'مجاني للتجربة' },
  ];

  const features = [
    {
      icon: '🎮',
      title: 'ألعاب تفاعلية',
      desc: 'أكثر من ٣٣ لعبة تعليمية مصممة لتحويل الرياضيات إلى مغامرة ممتعة.',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      icon: '📊',
      title: 'تتبع الأداء',
      desc: 'لوحة تحكم ذكية تتيح للمعلمين متابعة تقدم كل طالب بشكل دقيق.',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: '🏆',
      title: 'مستويات الصعوبة',
      desc: 'ثلاثة مستويات (سهل، متوسط، صعب) تتكيف مع قدرات كل طالب.',
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  const featuredGames = [
    { icon: '🐊', title: 'التمساح الجائع', desc: 'مقارنة الأعداد', color: 'bg-teal-100' },
    { icon: '🍕', title: 'بيتزا الكسور', desc: 'تعلّم الكسور', color: 'bg-amber-100' },
    { icon: '🚀', title: 'فقاعات الفضاء', desc: 'المكمّل للعشرة', color: 'bg-indigo-100' },
    { icon: '⚖️', title: 'ميزان الأبطال', desc: 'المعادلات', color: 'bg-cyan-100' },
    { icon: '🎢', title: 'قطار التقريب', desc: 'تقريب الأرقام', color: 'bg-sky-100' },
    { icon: '🦋', title: 'فراشة التماثل', desc: 'التماثل الهندسي', color: 'bg-fuchsia-100' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-white font-sans overflow-x-hidden">

      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-lg z-50 border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9">
                <Image src="/logo.png" alt="أبطال الرياضيات" fill className="object-contain" />
              </div>
              <span className="text-lg font-black text-slate-800 hidden sm:block">
                أبطال <span className="text-indigo-600">الرياضيات</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`#contact`}
                className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block"
              >
                تواصل معنا
              </a>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                دخول المعلم
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="pt-28 pb-20 lg:pt-36 lg:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-semibold text-xs tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              منصة أبطال الرياضيات التعليمية
            </span>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 leading-tight">
              الرياضيات <span className="text-indigo-600">ممتعة</span> وسهلة
              <br />مع ألعاب تفاعلية
            </h1>

            <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
              منصة تعليمية عربية للأطفال تحوّل تعلّم الرياضيات إلى مغامرة ممتعة من خلال أكثر من ٣٣ لعبة تفاعلية مع تتبع دقيق للأداء.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Link
                href="#games"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                استكشف الألعاب <span>🎮</span>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all"
              >
                لوحة المعلم <span>👨‍🏫</span>
              </Link>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-2xl font-black text-indigo-600">{stat.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-16 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900">لماذا أبطال الرياضيات؟</h2>
            <p className="mt-3 text-slate-500">تجربة تعليمية متكاملة للطلاب والمعلمين</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center text-2xl mb-4`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Games Preview ─── */}
      <section id="games" className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-slate-900">مكتبة الألعاب</h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">أكثر من ٣٣ لعبة تعليمية تغطي كل مهارات الرياضيات للمراحل الابتدائية</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {featuredGames.map((g, i) => (
              <Link
                key={i}
                href="/login"
                className="group flex flex-col items-center text-center p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className={`w-14 h-14 ${g.color} rounded-2xl flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform`}>
                  {g.icon}
                </div>
                <div className="text-sm font-bold text-slate-800 leading-tight">{g.title}</div>
                <div className="text-xs text-slate-400 mt-1">{g.desc}</div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
            >
              عرض جميع الألعاب الـ ٣٣ ←
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Contact / WhatsApp ─── */}
      <section id="contact" className="py-16 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-black text-slate-900">تواصل معنا</h2>
            <p className="text-slate-500">هل لديك استفسار أو تريد الاشتراك في المنصة؟ تواصل معنا عبر واتساب</p>

            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold text-lg rounded-2xl transition-all shadow-lg shadow-green-100"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.132.558 4.133 1.532 5.864L.057 23.664a.5.5 0 00.613.612l5.853-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.943 0-3.772-.528-5.339-1.444l-.383-.228-3.972.994.997-3.892-.248-.4A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
              </svg>
              تواصل عبر واتساب
            </a>

            <p className="text-sm text-slate-400">
              ساعات العمل: الأحد – الخميس، ٨ص – ٤م
            </p>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-white border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7">
                <Image src="/logo.png" alt="أبطال الرياضيات" fill className="object-contain opacity-50 grayscale" />
              </div>
              <span className="text-base font-black text-slate-400">أبطال الرياضيات</span>
            </div>
            <p className="text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} جميع الحقوق محفوظة.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
