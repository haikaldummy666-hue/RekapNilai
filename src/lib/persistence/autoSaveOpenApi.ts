export const autoSaveOpenApi = {
  openapi: "3.0.3",
  info: {
    title: "Rekap Nilai MI - Auto Save API (Supabase RPC)",
    version: "1.0.0",
  },
  paths: {
    "/rest/v1/user_app_state": {
      get: {
        summary: "Fetch latest app state for current user",
        parameters: [
          { name: "key", in: "query", required: true, schema: { type: "string" } },
          { name: "deleted_at", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "State row" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/rest/v1/rpc/upsert_user_app_state": {
      post: {
        summary: "Upsert app state (atomic) for current user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  p_key: { type: "string" },
                  p_state: { type: "object" },
                },
                required: ["p_key", "p_state"],
              },
            },
          },
        },
        responses: {
          "200": { description: "Returns (id, user_id, key, updated_at)" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/rest/v1/rpc/soft_delete_user_app_state": {
      post: {
        summary: "Soft delete app state for current user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  p_key: { type: "string" },
                },
                required: ["p_key"],
              },
            },
          },
        },
        responses: {
          "200": { description: "OK" },
          "401": { description: "Unauthorized" },
        },
      },
    },
  },
} as const;

