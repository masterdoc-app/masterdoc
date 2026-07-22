# Equipment + Technologist Agent (draft-only)

**Date:** 2026-07-22  
**Status:** implementation contract  
**Related:** [TOIR_AI_SYSTEM_DESIGN.md](../../TOIR_AI_SYSTEM_DESIGN.md), [B2B_MVP_SCOPE.md](../../B2B_MVP_SCOPE.md)

## Product invariant

The Technologist agent **never** publishes to the operational ledger. All writes via MCP tools create records with:

- `status: draft`
- `source: ai_generated`

A human with feature `equipment` confirms (`draft` → `active`) or rejects in the client UI.

## Public API (api-gateway)

All paths require `Authorization: Bearer <JWT>` and feature `equipment` (except where noted).

### Documents

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/documents` | `multipart/form-data` file (PDF) | `Document` |
| GET | `/documents/{id}` | — | `Document` |

### Assets (catalog-service)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/assets` | `CreateAssetRequest` | `Asset` (may be draft) |
| GET | `/assets` | — | `{ items: Asset[] }` |
| GET | `/assets/{id}` | — | `Asset` |
| POST | `/assets/{id}/confirm` | — | `Asset` (active) |
| POST | `/assets/{id}/reject` | — | 204 |

### Maintenance maps (dashboard-service)

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/maintenance-maps` | `CreateMaintenanceMapRequest` | `MaintenanceMap` |
| GET | `/maintenance-maps?assetId=` | — | `{ items: MaintenanceMap[] }` |
| GET | `/maintenance-maps/{id}` | — | `MaintenanceMap` |
| PATCH | `/maintenance-maps/{id}` | `UpdateMaintenanceMapRequest` | `MaintenanceMap` |
| POST | `/maintenance-maps/{id}/confirm` | — | `MaintenanceMap` |
| POST | `/maintenance-maps/{id}/reject` | — | 204 |

### Technologist jobs

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/ai/technologist` | `{ documentId, siteId? }` | `TechnologistJob` (202) |
| GET | `/ai/technologist/jobs/{id}` | — | `TechnologistJob` |
| POST | `/ai/technologist/jobs/{id}/confirm-package` | — | confirms asset + map |

## DTOs

```json
{
  "Asset": {
    "id": "uuid",
    "orgId": "string",
    "siteId": "string",
    "name": "string",
    "inventoryNo": "string?",
    "category": "string?",
    "status": "draft|active",
    "source": "manual|ai_generated",
    "documentIds": ["uuid"]
  },
  "MaintenanceMapItem": {
    "id": "uuid",
    "title": "string",
    "kind": "inspection|service|overhaul",
    "interval": { "every": 30, "unit": "days|hours|cycles" },
    "criticality": "low|medium|high",
    "sourceRef": "string?"
  },
  "MaintenanceMap": {
    "id": "uuid",
    "assetId": "uuid",
    "orgId": "string",
    "title": "string",
    "status": "draft|active",
    "source": "manual|ai_generated",
    "items": ["MaintenanceMapItem"]
  },
  "Document": {
    "id": "uuid",
    "orgId": "string",
    "filename": "string",
    "contentType": "application/pdf",
    "storageKey": "string",
    "sha256": "string",
    "uploadedBy": "string"
  },
  "TechnologistJob": {
    "id": "uuid",
    "documentId": "uuid",
    "status": "queued|running|succeeded|failed",
    "draftAssetId": "uuid?",
    "draftMapId": "uuid?",
    "error": "string?"
  }
}
```

## MCP tool schemas (technologist-mcp)

Tools **must not** include confirm/reject/publish.

### `create_draft_asset`

```json
{
  "name": "create_draft_asset",
  "description": "Create a draft Asset from analyzed manual. Always status=draft, source=ai_generated.",
  "inputSchema": {
    "type": "object",
    "required": ["name", "siteId", "documentIds"],
    "properties": {
      "name": { "type": "string" },
      "siteId": { "type": "string" },
      "inventoryNo": { "type": "string" },
      "category": { "type": "string" },
      "documentIds": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

### `create_draft_maintenance_map`

```json
{
  "name": "create_draft_maintenance_map",
  "description": "Create a draft maintenance map bound to an asset (draft or active).",
  "inputSchema": {
    "type": "object",
    "required": ["assetId", "title", "items"],
    "properties": {
      "assetId": { "type": "string" },
      "title": { "type": "string" },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["title", "kind", "interval", "criticality"],
          "properties": {
            "title": { "type": "string" },
            "kind": { "enum": ["inspection", "service", "overhaul"] },
            "interval": {
              "type": "object",
              "required": ["every", "unit"],
              "properties": {
                "every": { "type": "integer", "minimum": 1 },
                "unit": { "enum": ["days", "hours", "cycles"] }
              }
            },
            "criticality": { "enum": ["low", "medium", "high"] },
            "sourceRef": { "type": "string" }
          }
        }
      }
    }
  }
}
```

### `update_draft_maintenance_map`

Same as create fields plus required `id`; only allowed when `status=draft`.

### `get_document_meta`

```json
{
  "name": "get_document_meta",
  "description": "Read document metadata by id (no binary).",
  "inputSchema": {
    "type": "object",
    "required": ["documentId"],
    "properties": { "documentId": { "type": "string" } }
  }
}
```

## Service layout

| Repo folder | Port (local) |
|-------------|--------------|
| `catalog-service` | 8091 |
| `dashboard-service` | 8092 |
| `document-service` | 8093 |
| `technologist-mcp` | 8094 |
| `technologist-service` | 8095 |

## Non-goals (this epic)

- Preventive WO calendar / scheduler
- Intake / mentor / scribe agents
- Spare parts / 1C
