export function FeaturesSection() {
  const features = [
    {
      number: '01',
      title: 'Nokta Atışı Analiz',
      description: 'Bildiğin konularla vakit kaybetme. Yapay zekamız eksiklerini anında tespit eder ve sadece ihtiyacın olan soruları karşına çıkarır.'
    },
    {
      number: '02',
      title: 'Maksimum Zaman Tasarrufu',
      description: 'Geleneksel soru bankalarında kaybolma. Sana özel optimize edilmiş analizlerle gereksiz tekrarlardan kurtul.'
    },
    {
      number: '03',
      title: 'Hedef Odaklı İlerleme',
      description: 'Yüzlerce sayfa arasında ne çalışacağını düşünme. Algora hedefini belirler, sana sadece masaya oturup netlerini artırmak kalır.'
    },
  ];

  return (
    <section id="features" className="w-full px-4 md:px-6 lg:px-8 py-20">
      <h2 className="text-4xl font-bold text-center text-gray-900 mb-10">
        Neden ALGORA?
      </h2>
      <p className="text-xl text-center text-gray-600 mt-4 mb-16">
        Sınav hazırlığında yapay zeka destekli öğrenme deneyimi
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-purple-200 transition-all duration-300 hover:-translate-y-1 cursor-default gpu-accel will-change-transform"
          >
            <div className="text-purple-600 text-6xl font-black mb-4 leading-none">
              {feature.number}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {feature.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}