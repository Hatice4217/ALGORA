import Link from 'next/link';
import { Button } from '@/app/components/ui/Button';

export function HeroSection() {
  return (
    <section className="container mx-auto px-6 py-20">
      <div className="flex flex-col lg:flex-row items-center gap-12">
        <div className="lg:w-1/2">
          <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
            YKS ve LGS Hazırlığında
            <span className="text-purple-600"> AI Destekli</span> Öğrenme
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Yapay zeka destekli kişiselleştirilmiş sorular, detaylı analizler ve
            sürekli ilerleme takibi ile sınavlara en iyi şekilde hazırlan.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/auth/register">
              <Button variant="primary" size="lg" fullWidth>
                Ücretsiz Başla
              </Button>
            </Link>
            <Button variant="outline" size="lg" fullWidth>
              Demo İzle
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full bg-purple-200 border-2 border-white shadow-sm"
                />
              ))}
            </div>
            <p className="text-gray-600">
              <span className="font-semibold text-gray-900">500+</span> öğrenci
              hazırlanıyor
            </p>
          </div>
        </div>
        <div className="lg:w-1/2">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-200 rounded-2xl transform rotate-3"></div>
            <div className="relative bg-white rounded-2xl shadow-xl p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div>
                    <h2 className="font-semibold">Kişiselleştirilmiş Sorular</h2>
                    <p className="text-sm text-gray-600">Seviyene uygun sorular</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div>
                    <h2 className="font-semibold">Detaylı Analiz</h2>
                    <p className="text-sm text-gray-600">İlerleme takibi</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                  <div>
                    <h2 className="font-semibold">Hedef Odaklı</h2>
                    <p className="text-sm text-gray-600">TYT, AYT, LGS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}