import Hero from '../components/home/Hero';
import StoreSection from '../components/home/StoreSection';
import Services from '../components/home/Services';
import BestSellers from '../components/home/BestSellers';
import FeaturedPhones from '../components/home/FeaturedPhones';
import WhyUs from '../components/home/WhyUs';

export default function Home() {
  return (
    <main>
      <Hero />
      <StoreSection />
      <Services />
      <BestSellers />
      <FeaturedPhones />
      <WhyUs />
    </main>
  );
}
