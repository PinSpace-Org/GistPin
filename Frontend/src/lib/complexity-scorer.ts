export function scoreGistComplexity(content: string): number {
    const lines = content.split('\n').length;
    const words = content.split(/\s+/).length;
    return Math.round((lines * 0.5) + (words * 0.1));
}
