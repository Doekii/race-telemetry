export type ZoomDomain = [number, number];
type ZoomListener = (domain: ZoomDomain | null) => void;

export class ZoomSynchronizer {
    private listeners: Set<ZoomListener> = new Set();
    private currentDomain: ZoomDomain | null = null;

    subscribe(listener: ZoomListener) {
        this.listeners.add(listener);
        listener(this.currentDomain);
        return () => {
            this.listeners.delete(listener);
        };
    }

    dispatch(domain: ZoomDomain | null) {
        // Simple equality check to avoid infinite loops
        if (this.currentDomain === domain) return;
        if (this.currentDomain && domain &&
            Math.abs(this.currentDomain[0] - domain[0]) < 0.0001 &&
            Math.abs(this.currentDomain[1] - domain[1]) < 0.0001) {
            return;
        }

        this.currentDomain = domain;
        this.listeners.forEach(listener => listener(domain));
    }

    getDomain() {
        return this.currentDomain;
    }

    reset() {
        this.dispatch(null);
    }
}
