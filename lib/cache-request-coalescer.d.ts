export function coalesceRequest<T>(identity: string, factory: () => Promise<T>): Promise<T>;
export function inflightRequestCount(): number;
export function resetRequestCoalescerForTests(): void;
