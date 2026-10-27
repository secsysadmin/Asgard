export type Path = (string | number)[];

export function getIn(root: unknown, path: Path): unknown {
  return path.reduce<unknown>((node, key) => (node == null ? undefined : (node as Record<string | number, unknown>)[key]), root);
}

export function setIn<T>(root: T, path: Path, value: unknown): T {
  if (!path.length) return value as T;
  const [key, ...rest] = path;
  const node = root as unknown as Record<string | number, unknown> | unknown[];
  const copy = (Array.isArray(node) ? [...node] : { ...node }) as Record<string | number, unknown>;
  copy[key] = setIn(copy[key], rest, value);
  return copy as T;
}

export function updateIn<T>(root: T, path: Path, update: (value: unknown) => unknown): T {
  return setIn(root, path, update(getIn(root, path)));
}

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}
