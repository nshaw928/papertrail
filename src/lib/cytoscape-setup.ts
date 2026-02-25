import cytoscape from "cytoscape";

// @ts-expect-error - no types for this layout extension
import coseBilkent from "cytoscape-cose-bilkent";

let layoutRegistered = false;

export function ensureCoseBilkent() {
  if (!layoutRegistered) {
    cytoscape.use(coseBilkent);
    layoutRegistered = true;
  }
}
