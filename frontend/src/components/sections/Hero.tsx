/**
 * Hero section — full-viewport landing with name, title, tagline,
 * CTAs, social links, and scroll indicator.
 */

import Link from "next/link";

const SOCIAL_LINKS = [
  {
    name: "GitHub",
    href: "https://github.com/guidoasbun",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/in/guidoasbun",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    name: "Email",
    href: "mailto:guido@asbun.io",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6" aria-hidden="true">
        <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
        <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
      </svg>
    ),
  },
];

export default function Hero() {
  return (
    <section
      id="home"
      aria-label="Introduction"
      className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-md py-3xl"
    >
      {/* Card */}
      <div className="w-full max-w-[48rem] rounded-2xl border border-primary/20 bg-surface p-xl md:p-3xl text-center shadow-lg">
        {/* Greeting */}
        <p className="text-foreground-muted text-lg mb-sm">Hi, I&apos;m</p>

        {/* Name */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-primary mb-lg leading-tight">
          Guido Asbun
        </h1>

        {/* Title */}
        <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-md">
          Cloud Infrastructure &amp; Software Engineering
        </h2>

        {/* Tagline */}
        <p className="text-foreground-muted text-base md:text-lg max-w-[36rem] mx-auto mb-xl leading-relaxed">
          Building scalable cloud infrastructure and CI/CD pipelines while crafting
          performant web applications. Specializing in AWS, Docker, Kubernetes, and
          modern DevOps practices.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-md mb-xl">
          <Link
            href="#projects"
            className="inline-flex items-center justify-center min-h-[44px] px-lg py-sm rounded-lg bg-primary text-foreground-inverse font-medium hover:bg-primary-hover transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            View Projects
          </Link>
          <Link
            href="#contact"
            className="inline-flex items-center justify-center gap-xs min-h-[44px] px-lg py-sm rounded-lg border border-border text-foreground font-medium hover:bg-surface-elevated transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            Get in Touch
          </Link>
        </div>

        {/* Social links */}
        <div className="flex items-center justify-center gap-md">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.name}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
              aria-label={link.name}
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-foreground-muted hover:text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-xs text-foreground-muted animate-bounce">
        <span className="text-xs uppercase tracking-widest">Scroll Down</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
        </svg>
      </div>
    </section>
  );
}
