export function FeaturesSection() {
  // Vitrin — canlıdaki GERÇEK ürün özellikleriyle birebir eşleşir:
  // analiz, Koç, Hata Sepeti, adaptif zorluk, Sokratik ipucu, sınırsız soru
  const features = [
    {
      number: '01',
      title: 'Nokta Atışı Analiz',
      description: 'Zayıf konuların anında ortaya çıkar; zamanını bilerek harcarsın, eksiğini konu konu kapatırsın.'
    },
    {
      number: '02',
      title: 'AI Koç',
      description: 'Hedef puanın ve günlük çalışma saatine göre kişisel plan — hangi dersten kaç soru, hangi zorlukta.'
    },
    {
      number: '03',
      title: 'Hata Sepeti',
      description: 'Yanlış yaptığın soruların benzerleri sepete düşer; doğru cevaplayana kadar telafi edersin.'
    },
    {
      number: '04',
      title: 'Adaptif Zorluk',
      description: 'Sorular başarına göre otomatik uyarlanır — kolay sorularla vakit kaybetmez, zorlarda bunalmazsın.'
    },
    {
      number: '05',
      title: '3 Sokratik İpucu',
      description: 'Takıldığında kademeli yönlendirme al. İpucu çözümü ifşa etmez — düşünmeyi öğretir, cevabı ezberletmez.'
    },
    {
      number: '06',
      title: 'Sınırsız Soru',
      description: 'Havuzdan soru çözmekte günlük sınır yok. AI yeni sorular üretip havuzu doldurur, sen sınırsız çalışırsın.'
    },
  ];

  return (
    <section id="features" className="w-full px-4 md:px-6 lg:px-8 py-20">
      <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">
        Neden ALGORA?
      </h2>
      <p className="text-lg sm:text-xl text-center text-gray-600 mb-14">
        Sınav hazırlığında yapay zekâ destekli öğrenme deneyimi
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 hover:-translate-y-1 cursor-default gpu-accel will-change-transform"
          >
            <div className="text-purple-600 text-5xl sm:text-6xl font-black mb-4 leading-none">
              {feature.number}
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
              {feature.title}
            </h3>
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
