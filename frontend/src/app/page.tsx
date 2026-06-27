import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import About from "@/components/sections/About";
import { Projects } from "@/components/sections/Projects";
import ExperienceSection from "@/components/sections/Experience";
import { Skills } from "@/components/sections/Skills";
import Contact from "@/components/sections/Contact";

/**
 * Home page — server component that composes all portfolio sections.
 * Each section handles its own data fetching internally.
 *
 * Validates: Requirements 1.1, 16.1
 */
export default function Home() {
  return (
    <>
      <Header />
      <main className="pt-16">
        <About />
        <Projects />
        <ExperienceSection />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
