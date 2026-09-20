export function analyzeAccountSequence(sequenceNumber: string): string {
    const seq = BigInt(sequenceNumber);
    if (seq === BigInt(0)) {
        return "New / Unfunded Account";
    }
    return `Active Account (Seq: ${seq.toString()})`;
}
