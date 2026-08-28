export class IpfsFallbackAnalytics {
    private fallbacks: Record<string, number> = {};
    logGatewayFailure(gateway: string) {
        this.fallbacks[gateway] = (this.fallbacks[gateway] || 0) + 1;
    }
    getReport() {
        return this.fallbacks;
    }
}
