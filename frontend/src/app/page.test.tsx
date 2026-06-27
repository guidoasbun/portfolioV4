import { render, screen } from "@testing-library/react";

// Mock all section components since they use server-only AWS SDK imports
jest.mock("@/components/sections/About", () => ({
  __esModule: true,
  default: () => <section id="about"><h2>About Me</h2></section>,
}));
jest.mock("@/components/sections/Projects", () => ({
  Projects: () => <section id="projects"><h2>Projects</h2></section>,
}));
jest.mock("@/components/sections/Experience", () => ({
  __esModule: true,
  default: () => <section id="experience"><h2>Experience</h2></section>,
}));
jest.mock("@/components/sections/Skills", () => ({
  Skills: () => <section id="skills"><h2>Skills</h2></section>,
}));
jest.mock("@/components/sections/Contact", () => ({
  __esModule: true,
  default: () => <section id="contact"><h2>Get In Touch</h2></section>,
}));
jest.mock("@/components/layout/Header", () => ({
  __esModule: true,
  default: () => <header>Header</header>,
}));
jest.mock("@/components/layout/Footer", () => ({
  __esModule: true,
  default: () => <footer>Footer</footer>,
}));

import Home from "./page";

describe("Home page", () => {
  it("renders header, main content sections, and footer", () => {
    render(<Home />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders all portfolio sections with correct IDs for scroll navigation", () => {
    render(<Home />);

    expect(document.getElementById("about")).toBeInTheDocument();
    expect(document.getElementById("projects")).toBeInTheDocument();
    expect(document.getElementById("experience")).toBeInTheDocument();
    expect(document.getElementById("skills")).toBeInTheDocument();
    expect(document.getElementById("contact")).toBeInTheDocument();
  });

  it("applies padding-top to main for fixed header offset", () => {
    render(<Home />);

    const main = screen.getByRole("main");
    expect(main).toHaveClass("pt-16");
  });
});
