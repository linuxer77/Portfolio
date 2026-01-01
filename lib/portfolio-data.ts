import type { ComponentType } from "react";

export type TreeItem = {
  id: string;
  name: string;
  type: "folder" | "file";
  children?: TreeItem[];
  component?: ComponentType<any>;
};

// Content components (lazy imports can be added later for perf)
import AboutContent from "@/components/content/AboutContent";
import AboutDetails from "@/components/content/AboutDetails";
import ProjectAlgoTrading from "@/components/content/ProjectAlgoTrading";
import ProjectVeriCred from "@/components/content/ProjectVeriCred";
import ProjectChessSteganography from "@/components/content/ProjectChessSteganography";
import ConnectLinks from "@/components/content/ConnectLinks";
import TechLanguages from "@/components/content/TechLanguages";
import TechFrameworks from "@/components/content/TechFrameworks";
import TechTechnologies from "@/components/content/TechTechnologies";

export const fileTree: TreeItem[] = [
  {
    id: "portfolio",
    name: "portfolio",
    type: "folder",
    children: [
      {
        id: "about",
        name: "about",
        type: "folder",
        children: [
          {
            id: "about-details",
            name: "details.jsx",
            type: "file",
            component: AboutDetails,
          },
        ],
      },
      {
        id: "projects",
        name: "projects",
        type: "folder",
        children: [
          {
            id: "projects-trading",
            name: "trading",
            type: "folder",
            children: [
              {
                id: "project-algo-trading",
                name: "algo-trading.jsx",
                type: "file",
                component: ProjectAlgoTrading,
              },
            ],
          },
          {
            id: "projects-blockchain",
            name: "blockchain",
            type: "folder",
            children: [
              {
                id: "project-vericred",
                name: "vericred.jsx",
                type: "file",
                component: ProjectVeriCred,
              },
            ],
          },
          {
            id: "projects-other",
            name: "other projects",
            type: "folder",
            children: [
              {
                id: "project-chess-steganography",
                name: "chess-steganography.jsx",
                type: "file",
                component: ProjectChessSteganography,
              },
            ],
          },
        ],
      },
      {
        id: "tech-stack",
        name: "tech-stack",
        type: "folder",
        children: [
          {
            id: "tech-languages",
            name: "languages.jsx",
            type: "file",
            component: TechLanguages,
          },
          {
            id: "tech-frameworks",
            name: "frameworks.jsx",
            type: "file",
            component: TechFrameworks,
          },
          {
            id: "tech-technologies",
            name: "technologies.jsx",
            type: "file",
            component: TechTechnologies,
          },
        ],
      },
      {
        id: "connect-folder",
        name: "connect",
        type: "folder",
        children: [
          {
            id: "connect",
            name: "connect.jsx",
            type: "file",
            component: ConnectLinks,
          },
        ],
      },
    ],
  },
];
