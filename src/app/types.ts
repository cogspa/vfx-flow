export type EdgeKind = "ITERATION" | "DEPENDENCY" | "MERGE" | "REVIEW";

export type NodeKind = "media" | "process" | "review" | "delivery";

export type MediaKind = "image" | "video";

export type StatusKind = "wip" | "review" | "approved" | "final";

export type VersionInfo = {
  familyId: string; // groups versions (e.g., SQ010_SH030_COMP)
  v: number;        // numeric version
  label: string;    // "v006"
};

export type BaseMeta = {
  title: string;
  shot?: string;        // e.g., SQ010_SH030
  department?: string;  // anim/fx/comp/edit
  status: StatusKind;
  tags: string[];
};

export type MediaMeta = BaseMeta & {
  kind: "image" | "video";
  srcUrl: string;       // blob URL for now; later Storage URL
  thumbUrl?: string;    // optional
  durationSec?: number; // optional for video
  width?: number;
  height?: number;
};

export type GraphNodeData =
  | { type: "media"; meta: MediaMeta; version?: VersionInfo }
  | { type: "process"; meta: BaseMeta }
  | { type: "review"; meta: BaseMeta; note?: string }
  | { type: "delivery"; meta: BaseMeta; deliverable?: string };
