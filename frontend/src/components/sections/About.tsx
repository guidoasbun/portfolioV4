/**
 * About section — displays introduction, current status, education,
 * resume buttons, and interests/hobbies.
 *
 * Currently hardcoded. Future iteration will make this admin-editable.
 * See: .kiro/specs/portfolio-rebuild/FUTURE-about-admin-editable.md
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6
 */

import Link from "next/link";
import { ScrollAnimation } from "@/components/shared";
import { ResumeDownloadButton } from "./ResumeDownloadButton";

const INTERESTS = [
  {
    name: "Open Source",
    description: "Contributing to open source projects and building developer tools",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
  {
    name: "Reading",
    description: "Technical books, sci-fi novels, and philosophy",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    name: "Cooking",
    description: "Experimenting with recipes and techniques, approaching cooking like debugging code: iterate, test, improve",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      </svg>
    ),
  },
  {
    name: "Fitness",
    description: "Maintaining physical and mental wellness through regular exercise and outdoor activities",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    name: "Coffee",
    description: "Exploring different brewing methods and coffee origins",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.159-1.159" />
      </svg>
    ),
  },
  {
    name: "Travel",
    description: "Discovering new cultures and perspectives",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
  },
];

export default async function About() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="px-6 py-16 md:py-24"
    >
      <div className="mx-auto max-w-[64rem]">
        {/* Section Header */}
        <ScrollAnimation animation="fade-in">
          <div className="text-center mb-12">
            <h2
              id="about-heading"
              className="text-3xl md:text-4xl font-bold text-primary mb-3"
            >
              About Me
            </h2>
            <p className="text-foreground-muted text-lg">
              Get to know more about my background, skills, and interests
            </p>
          </div>
        </ScrollAnimation>

        {/* Main Content: Introduction + Sidebar */}
        <ScrollAnimation animation="slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            {/* Introduction Card */}
            <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-8">
              <h3 className="text-xl font-semibold text-foreground mb-4">
                Introduction
              </h3>
              <div className="space-y-4 text-foreground-muted leading-relaxed">
                <p>
                  I&apos;m a Full Stack Developer transitioning into DevOps and cloud infrastructure, with experience
                  across the full software development lifecycle. From developing React applications to
                  deploying them on AWS with automated CI/CD pipelines, I enjoy every aspect of modern
                  software delivery.
                </p>
                <p>
                  My technical journey has taken me from building compilers with Java to orchestrating
                  microservices with Docker and Kubernetes. I&apos;m particularly passionate about infrastructure
                  automation, having implemented production pipelines that improved deployment efficiency and
                  reduced errors.
                </p>
                <p>
                  Looking ahead, I&apos;m eager to join a team where I can contribute to building robust DevOps
                  practices, optimize cloud infrastructure, and help create systems that scale effortlessly.
                </p>
              </div>

              {/* Resume Buttons */}
              <div className="flex flex-wrap items-center gap-4 mt-6">
                <ResumeDownloadButton />
                <Link
                  href="/resume"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground font-medium hover:bg-surface-elevated transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  View Resume
                </Link>
              </div>
            </div>

            {/* Sidebar Cards */}
            <div className="flex flex-col gap-6">
              {/* Current Status */}
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="size-3 rounded-full bg-success animate-pulse" />
                  <h4 className="font-semibold text-foreground">Current Status</h4>
                </div>
                <p className="text-sm text-foreground-muted">
                  Open to new opportunities and exciting projects
                </p>
              </div>

              {/* Education */}
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-primary">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                  </svg>
                  <h4 className="font-semibold text-foreground">Education</h4>
                </div>
                <p className="font-medium text-foreground text-sm">
                  Bachelor of Science in Computer Science and Cybersecurity
                </p>
                <p className="text-sm text-foreground-muted mt-1">
                  California State University Fullerton
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-foreground-muted">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    Fullerton, CA
                  </span>
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    2021 - 2025
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollAnimation>

        {/* Interests & Hobbies */}
        <ScrollAnimation animation="slide-up">
          <div className="border-t border-border pt-12">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              Interests &amp; Hobbies
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {INTERESTS.map((interest) => (
                <div key={interest.name} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">{interest.icon}</span>
                  <div>
                    <p className="font-medium text-foreground">{interest.name}</p>
                    <p className="text-sm text-foreground-muted">{interest.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
