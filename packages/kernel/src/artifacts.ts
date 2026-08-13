/**
 * Artifact entity — generic build-artifact lifecycle primitive.
 *
 * Source: win-enigma/packages/core/src/ontology/artifacts.ts (Wave 1a whole-file extract).
 * Migrated to @we-kernel/kernel as a GENERIC leaf: artifact identity, classification,
 * state-machine helpers, factory functions, and queries. Domain-agnostic (no SDLC
 * type dependencies); the only cross-module type-only dependency is ArtifactState /
 * VALID_ARTIFACT_TRANSITIONS, sourced from the Wave 1a entities-base transition slice
 * (complete entities-base lands in Wave 1b, we-kernel/program #8).
 *
 * NOTE on relationship fields: Artifact carries optional loose-string relationship
 * IDs (taskId / runId / blueprintId / parentArtifactId). These are opaque string
 * associations, NOT type dependencies on SDLC entities — they preserve the original
 * wire shape without coupling this primitive to win-enigma's SDLC ontology. Wave 1b
 * will re-evaluate whether these names belong on the kernel surface.
 */

import { ArtifactState, VALID_ARTIFACT_TRANSITIONS } from "./entities-base.js";

// ============================================================================
// Artifact Entity
// ============================================================================

/**
 * Artifact identifier type
 */
export type ArtifactIdentifier = string;

/**
 * Core artifact entity representing a build artifact (code, test, document, etc.)
 * with complete lifecycle management
 */
export interface Artifact {
  // Identity
  id: string;
  name: string;

  // Classification
  type: ArtifactType;
  category: ArtifactCategory;

  // Versioning
  version: string;
  buildId?: string;

  // Lifecycle state
  state: ArtifactState;

  // Location and access
  uri: string;
  path?: string;
  content?: string;

  // Integrity
  checksum: string;
  checksumAlgorithm: "sha256" | "sha512" | "md5";

  // Metadata
  sizeBytes?: number;
  mimeType?: string;

  // Relationships
  taskId?: string;
  runId?: string;
  blueprintId?: string;
  parentArtifactId?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  builtAt?: Date;
  verifiedAt?: Date;
  deployedAt?: Date;

  // Quality gates
  verificationStatus?: "pending" | "passed" | "failed";
  verificationResults?: Record<string, unknown>;

  // Custom properties
  properties?: Record<string, unknown>;

  // --- GAP-B Phase 2: link to ArtifactRegistry (#104) ---
  /** → ArtifactRegistry.id where this artifact is stored. */
  registryId?: string;
}

/**
 * Artifact type classification
 */
export type ArtifactType =
  | "code"          // Source code, compiled binaries
  | "test"          // Test suites, test results
  | "document"      // Documentation, specs, reports
  | "config"        // Configuration files
  | "log"           // Log files, outputs
  | "planning_state" // Planning/orchestration artifacts
  | "deployment"    // Deployment manifests, scripts
  | "infrastructure"; // Infrastructure as code, Terraform plans

/**
 * Artifact categorization for grouping and filtering
 */
export type ArtifactCategory =
  | "source"        // Source code, configs
  | "binary"        // Compiled artifacts, binaries
  | "test"          // Test artifacts
  | "documentation"  // Docs, reports
  | "deployment"    // Deployment artifacts
  | "infrastructure" // IaC, infrastructure configs

// ============================================================================
// State Transition Helpers
// ============================================================================

/**
 * Check if an artifact state is terminal (no outgoing transitions)
 */
export function isArtifactStateTerminal(state: ArtifactState): boolean {
  return state === "archived";
}

/**
 * Check if an artifact can transition to a new state
 */
export function canTransitionArtifact(from: ArtifactState, to: ArtifactState): boolean {
  const allowed = VALID_ARTIFACT_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * Validate an artifact state transition
 * @throws Error if transition is invalid
 */
export function validateArtifactTransition(from: ArtifactState, to: ArtifactState): void {
  if (!canTransitionArtifact(from, to)) {
    throw new Error(
      `Invalid Artifact state transition: ${from} → ${to}. ` +
      `Valid transitions from ${from}: ${VALID_ARTIFACT_TRANSITIONS[from]?.join(", ") || "none"}`
    );
  }
}

/**
 * Get next valid states for a given artifact state
 */
export function getNextArtifactStates(state: ArtifactState): ArtifactState[] {
  return VALID_ARTIFACT_TRANSITIONS[state] ?? [];
}

/**
 * Complete state transition for an artifact
 * Updates state and relevant timestamps
 */
export function transitionArtifact(
  artifact: Artifact,
  newState: ArtifactState
): Artifact {
  validateArtifactTransition(artifact.state, newState);

  const now = new Date();
  const updated = { ...artifact, state: newState, updatedAt: now };

  // Set specific timestamps based on state
  switch (newState) {
    case "built":
      updated.builtAt = now;
      break;
    case "verified":
      updated.verifiedAt = now;
      break;
    case "deployed":
      updated.deployedAt = now;
      break;
  }

  return updated;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new artifact in draft state
 */
export function createArtifact(input: Omit<Artifact, "id" | "state" | "createdAt" | "updatedAt">): Artifact {
  const now = new Date();
  return {
    ...input,
    id: crypto.randomUUID(),
    state: "draft",
    createdAt: now,
    updatedAt: now,
    checksum: input.checksum ?? "",
    checksumAlgorithm: input.checksumAlgorithm ?? "sha256",
  };
}

/**
 * Create an artifact with minimal required fields
 */
export function createMinimalArtifact(input: {
  name: string;
  type: ArtifactType;
  uri: string;
  checksum?: string;
}): Artifact {
  return createArtifact({
    name: input.name,
    type: input.type,
    category: getCategoryForType(input.type),
    version: "1.0.0",
    uri: input.uri,
    checksum: input.checksum ?? "",
    checksumAlgorithm: "sha256",
  });
}

function getCategoryForType(type: ArtifactType): ArtifactCategory {
  switch (type) {
    case "code":
      return "source";
    case "test":
      return "test";
    case "document":
      return "documentation";
    case "config":
    case "deployment":
    case "infrastructure":
      return "deployment";
    default:
      return "source";
  }
}

// ============================================================================
// Artifact Queries
// ============================================================================

/**
 * Check if an artifact is ready for deployment
 */
export function isArtifactReadyForDeployment(artifact: Artifact): boolean {
  return artifact.state === "verified" &&
         artifact.verificationStatus === "passed";
}

/**
 * Check if an artifact is stale (outdated compared to latest version)
 */
export function isArtifactStale(artifact: Artifact, latestVersion: string): boolean {
  return artifact.version !== latestVersion;
}

/**
 * Get artifact display name with version
 */
export function getArtifactDisplayName(artifact: Artifact): string {
  return `${artifact.name}@${artifact.version}`;
}
