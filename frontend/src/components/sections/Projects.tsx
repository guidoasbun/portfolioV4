import { queryAllItems, queryItems, Keys } from "@/lib/dynamodb";
import type { DynamoDBItem } from "@/lib/dynamodb";
import { getAssetUrl } from "@/lib/s3";
import { Placeholder } from "@/components/shared";
import { ProjectGrid } from "./ProjectGrid";
import type { Project, ProjectImage } from "@/types/entities";

interface ProjectDynamoItem extends DynamoDBItem {
  id: string;
  title: string;
  description: string;
  githubUrl: string;
  deploymentUrl?: string;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ProjectImageDynamoItem extends DynamoDBItem {
  id: string;
  s3Key: string;
  order: number;
  altText?: string;
}

async function getPublishedProjects(): Promise<Project[]> {
  const projectItems = await queryAllItems<ProjectDynamoItem>({
    indexName: "GSI1",
    keyConditionExpression: "GSI1PK = :gsi1pk",
    expressionAttributeValues: {
      ":gsi1pk": Keys.project.gsi1pk(),
      ":published": true,
    },
    filterExpression: "published = :published",
    scanIndexForward: true,
  });

  const projects: Project[] = await Promise.all(
    projectItems.map(async (item) => {
      const { items: imageItems } = await queryItems<ProjectImageDynamoItem>({
        keyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        expressionAttributeValues: {
          ":pk": Keys.projectImage.pk(item.id),
          ":skPrefix": "IMAGE#",
        },
        scanIndexForward: true,
      });

      const images: ProjectImage[] = imageItems.map((img) => ({
        id: img.id,
        s3Key: img.s3Key,
        url: getAssetUrl(img.s3Key),
        order: img.order,
        altText: img.altText,
      }));

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        githubUrl: item.githubUrl,
        deploymentUrl: item.deploymentUrl,
        published: item.published,
        displayOrder: item.displayOrder,
        images,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    }),
  );

  return projects;
}

async function Projects() {
  let projects: Project[] = [];

  try {
    projects = await getPublishedProjects();
  } catch (error) {
    console.error("Failed to fetch projects:", error);
  }

  return (
    <section
      id="projects"
      className="px-lg py-3xl"
      aria-labelledby="projects-heading"
    >
      <div className="mx-auto max-w-[72rem]">
        <h2
          id="projects-heading"
          className="mb-xl text-center text-[length:var(--font-size-h2)] font-bold text-foreground"
        >
          Projects
        </h2>

        {projects.length === 0 ? (
          <Placeholder message="No projects to display yet." />
        ) : (
          <ProjectGrid projects={projects} />
        )}
      </div>
    </section>
  );
}

export { Projects };
