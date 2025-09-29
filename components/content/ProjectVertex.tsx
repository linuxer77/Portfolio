import Image from "next/image";

export default function ProjectVertex() {
  return (
    <div className="prose prose-invert max-w-none">
      <h3 className="text-accent">Vertex — Search with Graph Intelligence</h3>
      <div className="my-3 overflow-hidden rounded-lg ring-1 ring-ring/50">
        <Image
          src="/placeholder-vertex.png"
          alt="Vertex"
          width={1280}
          height={720}
          className="h-auto w-full"
        />
      </div>
      <p>
        Vertex reimagines search by replacing the traditional search bar with a
        prompt-driven system, backed by knowledge graphs and Cypher queries to
        retrieve and display contextual results beyond keyword matching.
      </p>
      <ul>
        <li>Prompt-driven constraints and interests</li>
        <li>Graph queries for precise retrieval</li>
        <li>UI tuned for developer workflows</li>
      </ul>
    </div>
  );
}
