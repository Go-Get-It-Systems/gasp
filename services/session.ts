// A generation identifies one local login lifetime, including re-login as the same user.
let generation = 0;
let actor: string | null = null;

export const getSessionGeneration = () => generation;
export const getSessionActor = () => actor;
export function advanceSession(): number {
  actor = null;
  return ++generation;
}
export function setSessionActor(userId: string): void { actor = userId; }
export class StaleSessionError extends Error {
  constructor() { super('The session changed'); this.name = 'StaleSessionError'; }
}
export function assertCurrentSession(expected: number): void {
  if (expected !== generation) throw new StaleSessionError();
}
