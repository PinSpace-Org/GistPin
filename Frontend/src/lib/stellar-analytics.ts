export function analyzeAccountSequence(sequenceNumber: string): string {
    const seq = BigInt(sequenceNumber);
    if (seq === 0n) {
        return "New / Unfunded Account";
    }
    return `Active Account (Seq: ${seq.toString()})`;
}
