import { z } from "zod";

/**
 * Validates "looks like a UUID" (8-4-4-4-12 hex groups) without enforcing
 * strict RFC4122 version/variant nibbles the way zod's built-in .uuid()
 * does. Postgres's `gen_random_uuid()` always produces RFC4122-compliant
 * v4 UUIDs, so this only matters for hand-written/seeded IDs like the
 * placeholder tenant id (00000000-0000-0000-0000-000000000001) used in
 * this single-tenant deployment, which is valid hex but not RFC4122-strict.
 */
export const idSchema = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Invalid ID"
  );
