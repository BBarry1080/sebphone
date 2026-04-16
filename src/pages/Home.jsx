import Hero from '../components/home/Hero';
import Services from '../components/home/Services';
import BestSellers from '../components/home/BestSellers';
import FeaturedPhones from '../components/home/FeaturedPhones';
import WhyUs from '../components/home/WhyUs';

export default function Home() {
  return (
    <main>
      <Hero />
      <Services />
      <BestSellers />
      <FeaturedPhones />
      <WhyUs />
    </main>
  );
}
