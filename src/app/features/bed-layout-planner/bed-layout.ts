export interface BedPart {
  name: string;
  width: number;
  depth: number;
}
export interface BedPlacement extends BedPart {
  x: number;
  y: number;
  rotated: boolean;
}
export interface BedPlan {
  placed: readonly BedPlacement[];
  remaining: readonly BedPart[];
}

/** Conservative shelf packing for rectangular model footprints. */
export function planBedLayout(
  parts: readonly BedPart[],
  width: number,
  depth: number,
  margin: number,
): BedPlan {
  let x = margin,
    y = margin,
    rowDepth = 0;
  const placed: BedPlacement[] = [],
    remaining: BedPart[] = [];
  for (const part of [...parts].sort(
    (a, b) => Math.max(b.width, b.depth) - Math.max(a.width, a.depth),
  )) {
    const choices = [
      { width: part.width, depth: part.depth, rotated: false },
      { width: part.depth, depth: part.width, rotated: true },
    ].filter(
      (choice, index, all) =>
        index === 0 ||
        choice.width !== all[0].width ||
        choice.depth !== all[0].depth,
    );
    let choice = choices.find(
      (item) =>
        x + item.width + margin <= width && y + item.depth + margin <= depth,
    );
    if (!choice && x !== margin) {
      x = margin;
      y += rowDepth + margin;
      rowDepth = 0;
      choice = choices.find(
        (item) =>
          x + item.width + margin <= width && y + item.depth + margin <= depth,
      );
    }
    if (!choice) {
      remaining.push(part);
      continue;
    }
    placed.push({ ...part, ...choice, x, y });
    x += choice.width + margin;
    rowDepth = Math.max(rowDepth, choice.depth);
  }
  return { placed, remaining };
}
