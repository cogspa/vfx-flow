export function pad3(n: number) {
    return String(n).padStart(3, "0");
}

export function makeVersionLabel(v: number) {
    return `v${pad3(v)}`;
}

export function makeFamilyId(meta: { shot?: string; department?: string; title: string }) {
    // something stable-ish; customize as needed
    const s = meta.shot ?? "NO_SHOT";
    const d = meta.department ?? "GEN";
    const t = meta.title.replace(/\s+/g, "_").toUpperCase().slice(0, 18);
    return `${s}_${d}_${t}`;
}
