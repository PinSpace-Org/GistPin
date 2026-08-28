export function detectAddressClusters(addresses: string[]): string[][] {
    // Basic clustering algorithm grouping addresses by network prefix
    const groups: Record<string, string[]> = {};
    addresses.forEach(addr => {
        const prefix = addr.slice(0, 4);
        groups[prefix] = groups[prefix] || [];
        groups[prefix].push(addr);
    });
    return Object.values(groups);
}
