type Events = {
  'sign:flicker': { letter: string };
  'sign:spark': { count: number };
  'journal:open': undefined;
  'journal:close': undefined;
  'page:turn': { page: number };
};

type Listener<T> = (payload: T) => void;
const listeners = {
  'sign:flicker': new Set<Listener<Events['sign:flicker']>>(),
  'sign:spark': new Set<Listener<Events['sign:spark']>>(),
  'journal:open': new Set<Listener<Events['journal:open']>>(),
  'journal:close': new Set<Listener<Events['journal:close']>>(),
  'page:turn': new Set<Listener<Events['page:turn']>>(),
};

export function on<K extends keyof Events>(
  event: K,
  listener: Listener<Events[K]>,
): () => void {
  const eventListeners = listeners[event] as Set<Listener<Events[K]>>;
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

export function emit<K extends keyof Events>(
  event: K,
  ...args: Events[K] extends undefined ? [] : [payload: Events[K]]
): void {
  const payload = args[0] as Events[K];
  const eventListeners = listeners[event] as Set<Listener<Events[K]>>;
  eventListeners.forEach((listener) => listener(payload));
}
