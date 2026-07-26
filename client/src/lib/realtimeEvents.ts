// A tiny pub/sub so page components can react to raw inbox WS payloads
// (e.g. the client-recommendations list on a decline) without each opening
// their own duplicate WebSocket connection to the same room. The single
// connection lives in useUserInboxSocket; this is just the fan-out.
export interface InboxEvent {
  type: string;
  [key: string]: unknown;
}

const target = new EventTarget();

export function emitInboxEvent(event: InboxEvent): void {
  target.dispatchEvent(new CustomEvent<InboxEvent>("inbox-event", { detail: event }));
}

export function onInboxEvent(handler: (event: InboxEvent) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<InboxEvent>).detail);
  target.addEventListener("inbox-event", listener);
  return () => target.removeEventListener("inbox-event", listener);
}
