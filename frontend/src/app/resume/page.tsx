/**
 * Web Resume page (/resume) — hardcoded resume content displayed in a
 * clean, structured format matching the site's design system.
 */

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Guido Asbun — Software engineer with full-stack, cloud infrastructure, and AI integration experience.",
};

// ─── Section Components ─────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-lg">
      <h2 className="mb-md text-h4 font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

function ExperienceEntry({
  title,
  company,
  location,
  dates,
  subtitle,
  bullets,
}: {
  title: string;
  company: string;
  location?: string;
  dates: string;
  subtitle?: string;
  bullets: string[];
}) {
  return (
    <div className="mb-lg last:mb-0">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-xs mb-xs">
        <h3 className="text-lg font-semibold text-foreground">
          {title} | {company}
        </h3>
        <span className="text-sm text-foreground-muted whitespace-nowrap">
          {dates}
        </span>
      </div>
      {location && (
        <p className="text-sm text-foreground-muted mb-xs">{location}</p>
      )}
      {subtitle && (
        <p className="text-sm italic text-foreground-muted mb-xs">
          {subtitle}
        </p>
      )}
      <ul className="list-disc list-outside ml-lg space-y-xs text-base text-foreground-muted leading-relaxed">
        {bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}

function ProjectEntry({
  name,
  tech,
  bullets,
}: {
  name: string;
  tech: string;
  bullets: string[];
}) {
  return (
    <div className="mb-lg last:mb-0">
      <h3 className="text-lg font-semibold text-foreground">{name}</h3>
      <p className="text-sm text-foreground-subtle mb-xs font-mono">{tech}</p>
      <ul className="list-disc list-outside ml-lg space-y-xs text-base text-foreground-muted leading-relaxed">
        {bullets.map((bullet, i) => (
          <li key={i}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ResumePage() {
  return (
    <main id="main-content" className="px-md py-3xl">
      <div className="mx-auto max-w-[56rem]">
        {/* Header */}
        <div className="text-center mb-2xl">
          <h1 className="text-foreground mb-sm">Guido Asbun</h1>
          <p className="text-foreground-muted text-base">
            <a
              href="mailto:guido@asbun.io"
              className="hover:text-primary transition-colors"
            >
              guido@asbun.io
            </a>
            {" | "}
            <a
              href="tel:9492394144"
              className="hover:text-primary transition-colors"
            >
              949-239-4144
            </a>
            {" | "}
            <a
              href="https://linkedin.com/in/guidoasbun"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              LinkedIn
            </a>
            {" | "}
            <a
              href="https://guido-asbun.com"
              className="hover:text-primary transition-colors"
            >
              guido-asbun.com
            </a>
            {" | "}
            <a
              href="https://github.com/guidoasbun"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              GitHub
            </a>
          </p>
        </div>

        {/* Back to home */}
        <div className="mb-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-xs text-sm text-foreground-muted hover:text-primary transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-4"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
              />
            </svg>
            Back to Portfolio
          </Link>
        </div>

        <div className="flex flex-col gap-xl">
          {/* Professional Summary */}
          <SectionCard title="Professional Summary">
            <p className="text-base leading-relaxed text-foreground-muted">
              Software engineer with full-stack, cloud infrastructure, and AI
              integration experience, recently graduated with a B.S. in Computer
              Science (Cybersecurity concentration, January 2026). Built and
              deployed production systems using Java, Python, TypeScript, and C#,
              backed by AWS and multi-cloud infrastructure managed with
              Terraform. Experienced across the full stack from native iOS and
              web frontends to backend APIs and containerized cloud deployments.
              U.S. Navy veteran with hands-on F/A-18 mission-critical systems
              experience, plus operations leadership at UPS supervising dispatch
              for an entire package center. U.S. Citizen eligible for DoD Secret
              clearance.
            </p>
          </SectionCard>

          {/* Education & Certification */}
          <SectionCard title="Education & Certification">
            <div className="space-y-md">
              <div>
                <p className="text-base font-semibold text-foreground">
                  CompTIA Security+ — Certified
                </p>
                <p className="text-base text-foreground-muted">
                  AWS Solutions Architect Associate — In Progress
                </p>
              </div>
              <div>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-xs">
                  <p className="text-base font-semibold text-foreground">
                    California State University, Fullerton
                  </p>
                  <span className="text-sm text-foreground-muted">
                    January 2026
                  </span>
                </div>
                <p className="text-base italic text-foreground-muted">
                  B.S. Computer Science, Cybersecurity Concentration
                </p>
                <p className="text-sm text-foreground-muted mt-xs">
                  Coursework: Software Engineering, Distributed Systems, Data
                  Structures, Algorithms, Cloud Computing, AI, Cryptography
                </p>
              </div>
              <div>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-xs">
                  <p className="text-base font-semibold text-foreground">
                    Santa Ana College
                  </p>
                  <span className="text-sm text-foreground-muted">
                    December 2023
                  </span>
                </div>
                <p className="text-base italic text-foreground-muted">
                  A.S. Computer Science
                </p>
                <p className="text-sm text-foreground-muted mt-xs">
                  Coursework: C++, Java, Data Structures, Algorithms,
                  Object-Oriented Programming
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Experience */}
          <SectionCard title="Experience">
            <ExperienceEntry
              title="Software Engineering Intern"
              company="Axios Media"
              dates="Jun – Aug 2022"
              bullets={[
                "Developed and shipped production front-end features in React, Next.js, and TypeScript, reducing page load times by 15%",
                "Authored and maintained unit tests using Jest under a test-driven development workflow, improving code coverage and reliability",
                "Built and maintained CI/CD pipelines using Docker, Jenkins, and CircleCI, enabling continuous integration across the team",
                "Collaborated cross-functionally with engineers, product, and QA using Git, Jira, and Agile/Scrum methodologies including daily stand-ups and sprint planning",
                "Produced technical documentation for frontend components and participated in code reviews",
              ]}
            />
            <ExperienceEntry
              title="Software Engineering Pre-Intern"
              company="Snap Engineering Academy"
              dates="Jun – Aug 2021"
              bullets={[
                "Served as the sole engineer on a cross-functional product team, building a full-stack React Native and Firebase mobile prototype for a non-profit partner and delivering 14 screens and 5 reusable components for the end-of-program demonstration",
                "Integrated geolocation APIs for real-time mapping features and built the Firebase data layer alongside an assigned engineering mentor",
                "Partnered with mentors on a scope review that cut an AR camera feature from the build, protecting the delivery timeline for the core product",
              ]}
            />
            <ExperienceEntry
              title="Dispatch Supervisor"
              company="United Parcel Service"
              location="Springfield, VA and Laguna, CA"
              dates=""
              subtitle="Progressed from Package Loader to Driver, Pre-Load Supervisor, Driver Supervisor, and Dispatch Supervisor"
              bullets={[
                "Supervised dispatch for an entire package center, planning and adjusting 55 to 60 delivery routes at a time to protect daily service commitments",
                "Anticipated the iPhone X launch surge at the customer counter and redesigned the will call workflow, adding an alphabetical staging layer over the existing city-based cage layout",
                "Cut customer wait time from over an hour to under 20 minutes and held that standard every night of launch week, with zero lost high-value packages and full security compliance; the process was reused for later launches",
                "Directed dispatch during a snowstorm, releasing drivers early to protect air delivery commitments and recovering ground volume through three pre-planned shuttle meet points coordinated over DIAD handhelds",
                "Led a same-day recovery of several hundred expedited packages after an end-of-day trailer check missed loaded trailers, then implemented a two-supervisor yard verification procedure to remove the single point of failure from the close-out process",
              ]}
            />
          </SectionCard>

          {/* Projects */}
          <SectionCard title="Projects">
            <ProjectEntry
              name="GameShift Live — Real-Time Multi-Sport Telemetry Platform"
              tech="Java 21, Spring Boot, Next.js 16, AWS Kinesis, Lambda, Bedrock, DynamoDB, ECS Fargate, Terraform"
              bullets={[
                "Built and deployed an event-driven live sports platform at dev.gameshift.live that polls API-Sports, normalizes six sports into a unified SportEvent model, and publishes to Kinesis Data Streams from a Spring Boot producer on ECS Fargate",
                "Implemented a Java 21 Lambda Kinesis consumer that timestamps events, writes to DynamoDB with 7-day TTL, and invokes Amazon Bedrock (Claude Haiku 4.5) with sport-specific prompt templates to generate live AI color commentary",
                "Streamed events and commentary to a Next.js 16 dashboard over Server-Sent Events with a client-side time-travel buffer that syncs the feed to the viewer broadcast delay, plus AWS Polly text-to-speech narration of live commentary",
                "Enforced least-privilege IAM per service, Cognito JWT validation with Google federated sign-in, and runtime Secrets Manager injection so no credentials or API keys live in code or images",
                "Provisioned VPC, ALB, ECS, Kinesis, Lambda, DynamoDB, Cognito, ECR, and CloudWatch monitoring through modular Terraform with S3 remote state, deployed by GitHub Actions OIDC building ARM64 images to ECR with property-based test suites (jqwik, fast-check) gating the pipeline",
              ]}
            />
            <ProjectEntry
              name="Recipe AI Finder v2"
              tech="Java 21, Spring Boot, Next.js, AWS Bedrock, DynamoDB, S3, ECS Fargate, Terraform"
              bullets={[
                "Deployed full-stack production application at recipe-ai-finder.com using a Java/Spring Boot backend and Next.js frontend, containerized and running on AWS ECS Fargate ARM64",
                "Integrated AWS Bedrock for multi-model AI inference, supporting Claude, Amazon Nova, and Meta Llama 3.1 with per-request model selection and tailored prompt formats for each model family",
                "Implemented least-privilege IAM, GitHub Actions OIDC authentication (no static credentials), and runtime Secrets Manager injection for API keys, keeping no secrets in code or version control",
                "Designed modular Terraform infrastructure (VPC, ALB, ECS, DynamoDB, S3, Cognito, ECR, IAM) with S3 remote state and DynamoDB locking for concurrent-safe deployments",
                "Built CI/CD pipeline using GitHub Actions with Docker Buildx (linux/arm64) targeting ECR and ECS, deploying tagged images per environment (dev/prod)",
              ]}
            />
            <ProjectEntry
              name="Chat-Sec v2 — Secure Encrypted Messaging"
              tech="C#, ASP.NET Core, TypeScript, Next.js, SignalR, AES-256, RSA-4096, Docker"
              bullets={[
                "Designed and built a secure real-time messaging system with end-to-end encryption using AES-256 symmetric and RSA-4096 asymmetric key exchange, deployed at chat-secure.com",
                "Implemented digital signature verification for message integrity and authenticity, with secure WebSocket communication via SignalR",
                "Containerized the full application with Docker and validated the security implementation through targeted security testing",
              ]}
            />
            <ProjectEntry
              name="iOS Recipe Generator"
              tech="SwiftUI, MVVM, Combine, Swift async/await, OpenAI API"
              bullets={[
                "Built a native iOS recipe generation app using SwiftUI with MVVM architecture and OpenAI API integration for AI-powered recipe suggestions",
                "Implemented reactive data flow using Combine and Swift async/await concurrency for a smooth, responsive user experience",
              ]}
            />
          </SectionCard>

          {/* Technical Skills */}
          <SectionCard title="Technical Skills">
            <div className="space-y-sm">
              <SkillRow
                label="Languages"
                value="TypeScript, JavaScript, Python, Java, C++, C#, Swift, Bash"
              />
              <SkillRow
                label="Frameworks"
                value="Next.js, React, React Native, Spring Boot, FastAPI, ASP.NET Core, Node.js, Express.js, SwiftUI"
              />
              <SkillRow
                label="Cloud & DevOps"
                value="AWS (ECS Fargate, Bedrock, Lambda, Kinesis, SQS, DynamoDB, S3, Cognito, CloudFront, ALB, Polly, WAF, CloudWatch, Secrets Manager, GuardDuty), Azure, GCP, Terraform, Docker, GitHub Actions (OIDC), CircleCI, Jenkins, Linux"
              />
              <SkillRow
                label="Databases"
                value="PostgreSQL, MongoDB, DynamoDB, Redis"
              />
              <SkillRow
                label="AI / ML"
                value="AWS Bedrock (Claude, Amazon Nova, Llama 3, Stability AI), OpenAI API, Gemini API"
              />
              <SkillRow
                label="Security"
                value="CompTIA Security+, AES-256, RSA-4096, JWT/OAuth2, Least-Privilege IAM, OIDC"
              />
              <SkillRow
                label="Tools"
                value="Git, GitHub, Jira, Agile/Scrum, REST APIs, Server-Sent Events, Claude Code, GitHub Copilot, Cursor"
              />
            </div>
          </SectionCard>

          {/* Military Experience */}
          <SectionCard title="Military Experience">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-xs">
                Aviation Structural Mechanic (F/A-18 Airframes) | U.S. Navy
              </h3>
              <ul className="list-disc list-outside ml-lg space-y-xs text-base text-foreground-muted leading-relaxed">
                <li>
                  Performed structural inspections, quality checks, and test
                  evaluations on F/A-18 Hornet airframes in mission-critical
                  defense environments, ensuring airworthiness and readiness for
                  deployment
                </li>
                <li>
                  Diagnosed and root-caused structural failures under time
                  pressure, documented findings, and coordinated corrective
                  action with cross-functional teams including quality assurance
                  and flight operations
                </li>
                <li>
                  Authored and reviewed maintenance reports and inspection
                  documentation in compliance with military standards and
                  procedures
                </li>
              </ul>
            </div>
          </SectionCard>

          {/* Additional */}
          <SectionCard title="Additional">
            <ul className="list-disc list-outside ml-lg space-y-xs text-base text-foreground-muted leading-relaxed">
              <li>
                U.S. Citizen — Eligible to obtain DoD Secret security clearance
              </li>
              <li>
                Code 2040 — Mentored and reviewed prospective fellows
                applications to promote diversity in technology
              </li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────

function SkillRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-md">
      <span className="text-sm font-semibold text-foreground min-w-[120px] shrink-0">
        {label}:
      </span>
      <span className="text-base text-foreground-muted">{value}</span>
    </div>
  );
}
