export function HowItWorksSection() {
  const steps = [
    {
      step: '1',
      title: 'Kayıt Ol',
      description: 'Ücretsiz hesabınızı oluşturun',
    },
    {
      step: '2',
      title: 'Sınav Seç',
      description: 'TYT, AYT veya LGS seçin',
    },
    {
      step: '3',
      title: 'Çöz & Öğren',
      description: 'Kişiselleştirilmiş soruları çözün',
    },
    {
      step: '4',
      title: 'Hedefine Ulaş',
      description: 'Detaylı analizlerle eksiklerini kapat ve başarıya odaklan.',
    },
  ];

  return (
    <section id="how-it-works" className="container mx-auto px-6 py-20 bg-purple-50 rounded-3xl mb-20">
      <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
        Nasıl Çalışır?
      </h2>
      <div className="relative">
        {/* Mobil için dikey çizgi */}
        <div className="md:hidden absolute left-8 top-8 bottom-8 w-0.5 border-l-2 border-dashed border-purple-300 z-0"></div>

        {/* Masaüstü için yatay çizgi */}
        <div className="hidden md:block absolute top-8 left-[8%] right-[8%] h-0.5 border-t-2 border-dashed border-purple-300 z-0"></div>

        <div className="grid md:grid-cols-4 gap-8 relative z-10">
          {steps.map((item, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-white border-4 border-purple-400 rounded-full flex items-center justify-center text-purple-600 text-2xl font-bold mx-auto mb-4 shadow-sm">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}