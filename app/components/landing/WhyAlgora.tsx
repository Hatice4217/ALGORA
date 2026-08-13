export function WhyAlgora() {
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
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
          Neden ALGORA?
        </h2>
        <p className="text-xl text-center text-gray-600 mb-16">
          Sınav hazırlığında yapay zeka destekli öğrenme deneyimi
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-100 transition-all duration-300 hover:-translate-y-2 cursor-default gpu-accel will-change-transform"
            >
              {/* Rakam */}
              <div className="text-purple-600 text-5xl font-bold mb-4">
                {feature.number}
              </div>

              {/* Başlık */}
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>

              {/* Metin */}
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}