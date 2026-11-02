import { BedShape } from '../../core/printer/printer-profile.service';
import { rectangleInDisc } from '../../core/printer/build-space';
export interface BedPart {
  name: string;
  width: number;
  depth: number;
  z?: number;
}
export interface BedPlacement extends BedPart {
  x: number;
  y: number;
  rotated: boolean;
  modelWidth: number;
  modelDepth: number;
}
export interface BedPlan {
  placed: readonly BedPlacement[];
  remaining: readonly BedPart[];
  available: boolean;
  limited: boolean;
}
export interface BedLayoutOptions {
  shape?: BedShape;
  gap?: number;
  expansion?: number;
  usableZ?: number;
}
export const MAX_LAYOUT_PARTS = 200;
export const MAX_CIRCLE_CANDIDATES = 1024;
const CIRCLE_GRID_STEPS = 10;
/** Rectangle shelves; circles try centre, neighbours and an 11 x 11 grid. No optimality claim. */
export function planBedLayout(
  parts: readonly BedPart[],
  width: number,
  depth: number,
  edge: number,
  options: BedLayoutOptions = {},
): BedPlan {
  const gap = options.gap ?? edge,
    expansion = options.expansion ?? 0,
    shape = options.shape ?? BedShape.Rectangular;
  const placed: BedPlacement[] = [],
    remaining: BedPart[] = [];
  if (
    ![width, depth].every((v) => Number.isFinite(v) && v > 0) ||
    ![edge, gap, expansion].every((v) => Number.isFinite(v) && v >= 0) ||
    width <= 2 * edge ||
    depth <= 2 * edge ||
    (shape !== BedShape.Rectangular && shape !== BedShape.Circular) ||
    (shape === BedShape.Circular && width !== depth)
  ) {
    return { placed, remaining: parts, available: false, limited: false };
  }
  let x = edge,
    y = edge,
    rowDepth = 0;
  for (const [index, part] of [...parts]
    .sort((a, b) => Math.max(b.width, b.depth) - Math.max(a.width, a.depth))
    .entries()) {
    if (
      index >= MAX_LAYOUT_PARTS ||
      ![part.width, part.depth].every((v) => Number.isFinite(v) && v > 0) ||
      (part.z !== undefined &&
        (!Number.isFinite(part.z) ||
          part.z <= 0 ||
          part.z > (options.usableZ ?? Infinity)))
    ) {
      remaining.push(part);
      continue;
    }
    const choices = [
      {
        width: part.width + 2 * expansion,
        depth: part.depth + 2 * expansion,
        modelWidth: part.width,
        modelDepth: part.depth,
        rotated: false,
      },
      {
        width: part.depth + 2 * expansion,
        depth: part.width + 2 * expansion,
        modelWidth: part.depth,
        modelDepth: part.width,
        rotated: true,
      },
    ];
    let accepted: BedPlacement | undefined;
    if (shape === BedShape.Rectangular) {
      let choice = choices.find(
        (c) => x + c.width + edge <= width && y + c.depth + edge <= depth,
      );
      if (!choice && x !== edge) {
        x = edge;
        y += rowDepth + gap;
        rowDepth = 0;
        choice = choices.find(
          (c) => x + c.width + edge <= width && y + c.depth + edge <= depth,
        );
      }
      if (choice) {
        accepted = { ...part, ...choice, x, y };
        x += choice.width + gap;
        rowDepth = Math.max(rowDepth, choice.depth);
      }
    } else {
      for (const choice of choices) {
        const candidates: [number, number][] = [
          [(width - choice.width) / 2, (depth - choice.depth) / 2],
        ];
        for (const p of placed) {
          for (const px of [
            p.x - choice.width - gap,
            p.x,
            p.x + p.width + gap,
          ]) {
            for (const py of [
              p.y - choice.depth - gap,
              p.y,
              p.y + p.depth + gap,
            ]) {
              candidates.push([px, py]);
            }
          }
          if (candidates.length >= MAX_CIRCLE_CANDIDATES / 2) {
            break;
          }
        }
        for (let gx = 0; gx <= CIRCLE_GRID_STEPS; gx++) {
          for (let gy = 0; gy <= CIRCLE_GRID_STEPS; gy++) {
            candidates.push([
              edge +
                ((width - 2 * edge - choice.width) * gx) / CIRCLE_GRID_STEPS,
              edge +
                ((depth - 2 * edge - choice.depth) * gy) / CIRCLE_GRID_STEPS,
            ]);
          }
        }
        const candidate = candidates
          .slice(0, MAX_CIRCLE_CANDIDATES)
          .find(
            ([px, py]) =>
              rectangleInDisc(
                px,
                py,
                choice.width,
                choice.depth,
                width / 2,
                depth / 2,
                width / 2 - edge,
              ) &&
              placed.every(
                (p) =>
                  px + choice.width + gap <= p.x ||
                  p.x + p.width + gap <= px ||
                  py + choice.depth + gap <= p.y ||
                  p.y + p.depth + gap <= py,
              ),
          );
        if (candidate) {
          accepted = { ...part, ...choice, x: candidate[0], y: candidate[1] };
          break;
        }
      }
    }
    if (accepted) {
      placed.push(accepted);
    } else {
      remaining.push(part);
    }
  }
  return {
    placed,
    remaining,
    available: true,
    limited: parts.length > MAX_LAYOUT_PARTS,
  };
}
