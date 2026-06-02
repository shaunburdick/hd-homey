// Ambient module declarations for image file imports.
// This must be a script file (no top-level imports) for wildcard module
// declarations to be recognized globally by TypeScript.
declare module '*.webp' {
    const content: string;
    export default content;
}

declare module '*.png' {
    const content: string;
    export default content;
}

declare module '*.jpg' {
    const content: string;
    export default content;
}

declare module '*.jpeg' {
    const content: string;
    export default content;
}

declare module '*.svg' {
    const content: string;
    export default content;
}
