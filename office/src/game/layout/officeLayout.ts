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

export interface OfficeFloorPatch {
  id: string;
  textureKey: string;
  col: number;
  row: number;
  width: number;
  height: number;
}

export interface OfficeProp {
  id: string;
  textureKey: string;
  x: number;
  y: number;
  depth?: number;
  flipX?: boolean;
  alpha?: number;
}

export interface OfficeLabel {
  id: string;
  text: string;
  x: number;
  y: number;
}

export interface OfficeHotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  prompt: string;
}

export const OFFICE_PIXEL_SCALE = 3;
export const OFFICE_TILE_SIZE = 16 * OFFICE_PIXEL_SCALE;
export const OFFICE_WORLD_COLUMNS = 28;
export const OFFICE_WORLD_ROWS = 16;
export const OFFICE_WORLD_WIDTH = OFFICE_WORLD_COLUMNS * OFFICE_TILE_SIZE;
export const OFFICE_WORLD_HEIGHT = OFFICE_WORLD_ROWS * OFFICE_TILE_SIZE;

function tile(column: number, row: number) {
  return {
    x: Math.round(column * OFFICE_TILE_SIZE),
    y: Math.round(row * OFFICE_TILE_SIZE),
  };
}

function createDeskBankProps(bankId: "north" | "south", row: number): OfficeProp[] {
  const deskColumns = [12.5, 15.75, 19, 22.25];

  return deskColumns.flatMap((column, index) => {
    const x = Math.round(column * OFFICE_TILE_SIZE);
    const monitorFrame = index % 3;

    return [
      {
        id: `${bankId}-desk-${index + 1}`,
        textureKey: "office-prop-desk-front",
        x,
        y: Math.round(row * OFFICE_TILE_SIZE),
      },
      {
        id: `${bankId}-chair-${index + 1}`,
        textureKey: index % 2 === 0 ? "office-prop-chair-front" : "office-prop-chair-back",
        x: x + 42,
        y: Math.round((row + 2) * OFFICE_TILE_SIZE),
      },
      {
        id: `${bankId}-monitor-${index + 1}`,
        textureKey: `office-prop-pc-${monitorFrame + 1}`,
        x: x + 46,
        y: Math.round((row - 0.5) * OFFICE_TILE_SIZE),
        depth: Math.round((row + 2.2) * OFFICE_TILE_SIZE),
      },
    ];
  });
}

const officeNodes: OfficeNode[] = [
  { id: "spawn", x: 1176, y: 696, neighbors: ["hallway-entry"] },
  { id: "hallway-entry", x: 1176, y: 648, neighbors: ["spawn", "hallway-center", "desk-8"] },
  {
    id: "hallway-center",
    x: 600,
    y: 552,
    neighbors: [
      "hallway-entry",
      "north-hall",
      "watercooler",
      "couch",
      "desk-5",
      "desk-6",
      "desk-7",
      "desk-8",
    ],
  },
  {
    id: "north-hall",
    x: 600,
    y: 312,
    neighbors: ["hallway-center", "chat-nook", "couch", "desk-1", "desk-2", "desk-3", "desk-4"],
  },
  { id: "watercooler", x: 168, y: 408, neighbors: ["hallway-center", "couch"] },
  { id: "couch", x: 336, y: 384, neighbors: ["hallway-center", "watercooler", "north-hall", "chat-nook"] },
  { id: "chat-nook", x: 336, y: 264, neighbors: ["north-hall", "couch"] },
  { id: "desk-1", x: 678, y: 312, neighbors: ["north-hall"] },
  { id: "desk-2", x: 834, y: 312, neighbors: ["north-hall"] },
  { id: "desk-3", x: 990, y: 312, neighbors: ["north-hall"] },
  { id: "desk-4", x: 1146, y: 312, neighbors: ["north-hall"] },
  { id: "desk-5", x: 678, y: 648, neighbors: ["hallway-center"] },
  { id: "desk-6", x: 834, y: 648, neighbors: ["hallway-center"] },
  { id: "desk-7", x: 990, y: 648, neighbors: ["hallway-center"] },
  { id: "desk-8", x: 1146, y: 648, neighbors: ["hallway-center", "hallway-entry"] },
];

const collisionRects: CollisionRect[] = [
  { id: "desk-bank-top", x: 912, y: 222, width: 660, height: 174 },
  { id: "desk-bank-bottom", x: 912, y: 510, width: 660, height: 174 },
  { id: "couch-block", x: 342, y: 372, width: 216, height: 108 },
  { id: "bookshelf-wall", x: 222, y: 138, width: 336, height: 108 },
  { id: "hud-reserve", x: 168, y: 648, width: 336, height: 240 },
  { id: "watercooler-block", x: 168, y: 420, width: 84, height: 108 },
];

const floorPatches: OfficeFloorPatch[] = [
  {
    id: "base-office",
    textureKey: "office-floor-slate",
    col: 0,
    row: 0,
    width: OFFICE_WORLD_COLUMNS,
    height: OFFICE_WORLD_ROWS,
  },
  {
    id: "west-lounge",
    textureKey: "office-floor-wood",
    col: 0,
    row: 0,
    width: 10,
    height: OFFICE_WORLD_ROWS,
  },
  {
    id: "strategy-runner",
    textureKey: "office-floor-grid",
    col: 9,
    row: 4,
    width: 4,
    height: 5,
  },
  {
    id: "entry-strip",
    textureKey: "office-floor-grid",
    col: 20,
    row: 13,
    width: 8,
    height: 3,
  },
];

const officeProps: OfficeProp[] = [
  { id: "bookshelf-west-1", textureKey: "office-prop-bookshelf-double", x: 84, y: 96 },
  { id: "bookshelf-west-2", textureKey: "office-prop-bookshelf-double", x: 252, y: 96 },
  { id: "clock", textureKey: "office-prop-clock", x: 1176, y: 60, depth: 80 },
  { id: "whiteboard", textureKey: "office-prop-whiteboard", x: 930, y: 72, depth: 82 },
  { id: "company-board", textureKey: "office-prop-company-board", x: 414, y: 72, depth: 82 },
  { id: "small-painting", textureKey: "office-prop-painting-small", x: 60, y: 84, depth: 82 },
  { id: "small-painting-2", textureKey: "office-prop-painting-small-2", x: 1140, y: 108, depth: 82 },
  { id: "hanging-plant-west", textureKey: "office-prop-hanging-plant", x: 72, y: 24, depth: 78 },
  { id: "hanging-plant-mid", textureKey: "office-prop-hanging-plant", x: 456, y: 24, depth: 78 },
  { id: "watercooler", textureKey: "office-prop-watercooler", x: 126, y: 342 },
  { id: "couch-front", textureKey: "office-prop-sofa-front", x: 216, y: 276 },
  { id: "couch-back", textureKey: "office-prop-sofa-back", x: 348, y: 420 },
  { id: "couch-left", textureKey: "office-prop-sofa-side", x: 174, y: 318 },
  { id: "couch-right", textureKey: "office-prop-sofa-side", x: 486, y: 318, flipX: true },
  { id: "coffee-table", textureKey: "office-prop-coffee-table", x: 312, y: 318 },
  { id: "coffee-cup-1", textureKey: "office-prop-coffee-cup", x: 366, y: 336, depth: 396 },
  { id: "coffee-cup-2", textureKey: "office-prop-coffee-cup", x: 330, y: 360, depth: 420 },
  { id: "plant-west", textureKey: "office-prop-large-plant", x: 540, y: 330 },
  { id: "plant-north", textureKey: "office-prop-large-plant", x: 1140, y: 138 },
  { id: "plant-south", textureKey: "office-prop-large-plant", x: 1218, y: 474 },
  { id: "entry-door", textureKey: "office-prop-door", x: 1128, y: 720, depth: 744 },
  { id: "bin", textureKey: "office-prop-bin", x: 1032, y: 642 },
  { id: "reading-chair", textureKey: "office-prop-chair-front", x: 996, y: 570 },
  ...createDeskBankProps("north", 3),
  ...createDeskBankProps("south", 9),
];

const officeLabels: OfficeLabel[] = [];

const officeHotspots: OfficeHotspot[] = [
  {
    id: "company-board",
    label: "Company board",
    x: 492,
    y: 162,
    prompt: "[E] Review board",
  },
];

const officeNodeById = new Map(officeNodes.map((node) => [node.id, node]));

export function getCollisionRects(): CollisionRect[] {
  return collisionRects;
}

export function getFloorPatches(): OfficeFloorPatch[] {
  return floorPatches;
}

export function getOfficeProps(): OfficeProp[] {
  return officeProps;
}

export function getOfficeLabels(): OfficeLabel[] {
  return officeLabels;
}

export function getOfficeHotspots(): OfficeHotspot[] {
  return officeHotspots;
}

export function getSpawnPoint() {
  const spawn = officeNodeById.get("spawn");

  return {
    x: spawn?.x ?? tile(14, 14.75).x,
    y: spawn?.y ?? tile(14, 14.75).y,
  };
}

export function getClosestOfficeNode(x: number, y: number) {
  let nearest = officeNodes[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const node of officeNodes) {
    const deltaX = node.x - x;
    const deltaY = node.y - y;
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

    if (distance < nearestDistance) {
      nearest = node;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function getOfficeNode(nodeId: string) {
  return officeNodeById.get(nodeId) ?? null;
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
