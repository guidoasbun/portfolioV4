# Future Feature: Admin-Editable About Section

## Summary

Make the About section fully editable from the admin panel, replacing the current hardcoded content.

## What needs to change

### Data Model (DynamoDB)

Extend the About entity to include:

```typescript
interface About {
  personalDescription: string;   // Already exists — maps to Introduction text
  professionalPitch: string;     // Already exists — unused in new layout, repurpose or remove
  currentStatus: string;         // e.g. "Open to new opportunities and exciting projects"
  education: {
    degree: string;              // e.g. "Bachelor of Science in Computer Science and Cybersecurity"
    school: string;              // e.g. "California State University Fullerton"
    location: string;            // e.g. "Fullerton, CA"
    startYear: number;
    endYear: number;
  };
  interests: Array<{
    name: string;                // e.g. "Open Source"
    description: string;         // e.g. "Contributing to open source projects..."
    icon: string;                // Icon identifier (e.g. "code", "book", "fire", etc.)
  }>;
  updatedAt: string;
}
```

### Admin Panel

Add fields to the About editor page (`/admin/about`):
- Current status text input
- Education section (degree, school, location, year range)
- Interests/Hobbies list with add/edit/remove (name, description, icon picker)

### Public Component

Update `About.tsx` to fetch all fields from DynamoDB instead of hardcoding them.

## Priority

Low — hardcoded version works well. Only needed if content changes frequently.
