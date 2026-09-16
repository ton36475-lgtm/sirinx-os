import type { Metadata } from "next";
import { GodModeMasterOS } from "../ui/GodModeMasterOS";

export const metadata: Metadata = {
  title: "SIRINX God Mode Master OS",
  description: "Local-only GhostClaws architecture, queue, and R0 gate dashboard.",
};

export default function GodModePage() {
  return <GodModeMasterOS />;
}
