// Tells the rest of the page (the header's profile button) that the visitor
// signed in or out. The header listens for this event and refetches its summary.
export const SESSION_CHANGED_EVENT = "plato:session-changed";

export function notifySessionChanged() {
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT));
}
