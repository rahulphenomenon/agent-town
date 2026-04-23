export interface OfficeNode {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
}

export interface CollisionRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const officeNodes: OfficeNode[] = [
  { id: "spawn", x: 64, y: 192, neighbors: ["hallway-center"] },
  {
    id: "hallway-center",
    x: 192,
    y: 192,
    neighbors: [
      "spawn",
      "watercooler",
      "couch",
      "chat-nook",
      "desk-1",
      "desk-2",
      "desk-3",
      "desk-4",
      "desk-5",
      "desk-6",
      "desk-7",
      "desk-8",
    ],
  },
  { id: "watercooler", x: 96, y: 96, neighbors: ["hallway-center"] },
  { id: "couch", x: 96, y: 288, neighbors: ["hallway-center"] },
  { id: "chat-nook", x: 232, y: 128, neighbors: ["hallway-center"] },
  { id: "desk-1", x: 320, y: 80, neighbors: ["hallway-center"] },
  { id: "desk-2", x: 416, y: 80, neighbors: ["hallway-center"] },
  { id: "desk-3", x: 512, y: 80, neighbors: ["hallway-center"] },
  { id: "desk-4", x: 608, y: 80, neighbors: ["hallway-center"] },
  { id: "desk-5", x: 320, y: 288, neighbors: ["hallway-center"] },
  { id: "desk-6", x: 416, y: 288, neighbors: ["hallway-center"] },
  { id: "desk-7", x: 512, y: 288, neighbors: ["hallway-center"] },
  { id: "desk-8", x: 608, y: 288, neighbors: ["hallway-center"] },
];

const collisionRects: CollisionRect[] = [
  { id: "desk-bank-top", x: 464, y: 112, width: 360, height: 40 },
  { id: "desk-bank-bottom", x: 464, y: 256, width: 360, height: 40 },
  { id: "watercooler-block", x: 96, y: 104, width: 28, height: 28 },
  { id: "couch-block", x: 104, y: 300, width: 72, height: 28 },
];

const officeNodeById = new Map(officeNodes.map((node) => [node.id, node]));

export function getCollisionRects(): CollisionRect[] {
  return collisionRects;
}

export function getRouteForZones(fromId: string, toId: string): OfficeNode[] {
  const start = officeNodeById.get(fromId);
  const target = officeNodeById.get(toId);

  if (!start || !target) {
    throw new Error(`Unknown office zone route: ${fromId} -> ${toId}`);
  }

  const queue: OfficeNode[] = [start];
  const visited = new Set<string>([start.id]);
  const previous = new Map<string, string | null>([[start.id, null]]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    if (current.id === target.id) {
      break;
    }

    for (const neighborId of current.neighbors) {
      if (visited.has(neighborId)) {
        continue;
      }

      const neighbor = officeNodeById.get(neighborId);
      if (!neighbor) {
        continue;
      }

      visited.add(neighborId);
      previous.set(neighborId, current.id);
      queue.push(neighbor);
    }
  }

  if (!previous.has(target.id)) {
    throw new Error(`No route from ${fromId} to ${toId}`);
  }

  const route: OfficeNode[] = [];
  let currentId: string | null = target.id;

  while (currentId) {
    const node = officeNodeById.get(currentId);
    if (!node) {
      throw new Error(`Missing office node: ${currentId}`);
    }

    route.push(node);
    currentId = previous.get(currentId) ?? null;
  }

  return route.reverse();
}
