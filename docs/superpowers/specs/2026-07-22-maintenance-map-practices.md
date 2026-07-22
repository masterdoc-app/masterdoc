# Best practices: карты обслуживания оборудования

**Date:** 2026-07-22  
**Audience:** Technologist agent system prompt + human reviewers  
**Related:** [2026-07-22-equipment-technologist-design.md](2026-07-22-equipment-technologist-design.md)

## Purpose

A **maintenance map** is a structured, asset-bound plan extracted from OEM manuals (ИЭ / руководство по ремонту). It is **not** a full PPR calendar with generated work orders (later phase).

## Structure

Group operations into three kinds:

| kind | Russian | When to use |
|------|---------|-------------|
| `inspection` | Осмотр / контроль | Visual/functional checks, readings, leak sniff |
| `service` | ТО / обслуживание | Consumables, filters, lubrication, calibration |
| `overhaul` | ППР / капремонт | Deep intervention, parts replacement at major intervals |

Each item must have:

1. **title** — imperative, concrete («Проверить уровень масла в компрессоре», not «Масло»).
2. **interval** — `{ every: N, unit: days|hours|cycles }` taken from the manual; if the manual gives only calendar months, convert (1 month ≈ 30 days).
3. **criticality** — `high` if failure risks safety/food loss/downtime; `medium` default; `low` for cosmetic/optional.
4. **sourceRef** — short pointer into the manual («§4.2», «стр. 12») when available.

## Extraction rules for the agent

**Must:**

- Prefer intervals explicitly stated in the document.
- Deduplicate near-identical operations (merge into one item).
- Keep 3–15 items for a typical retail/HVAC asset; expand only if the manual is clearly rich.
- Always create/update as **draft** via MCP (`create_draft_*`).

**Must not:**

- Invent intervals when the manual is silent — omit the item or mark `sourceRef` with `не указано в руководстве` and use a conservative default only for universal safety inspections (e.g. daily visual), documenting the assumption in `sourceRef`.
- Call confirm/publish tools.
- Create spare-part catalogs or warehouse SKUs.
- Generate work orders.

## Criticality heuristics

- Refrigerant / pressure / electrical isolation → `high`
- Filter/gasket replacement on schedule → `medium`
- Cleaning exterior / label check → `low`

## Example item set (compressor rack)

```json
[
  {
    "title": "Визуальный осмотр утечек хладагента и масла",
    "kind": "inspection",
    "interval": { "every": 1, "unit": "days" },
    "criticality": "high",
    "sourceRef": "§ ежедневный осмотр"
  },
  {
    "title": "Проверка перепада давления на фильтре-осушителе",
    "kind": "inspection",
    "interval": { "every": 30, "unit": "days" },
    "criticality": "medium",
    "sourceRef": "§ ТО-1"
  },
  {
    "title": "Замена фильтра-осушителя",
    "kind": "service",
    "interval": { "every": 365, "unit": "days" },
    "criticality": "medium",
    "sourceRef": "§ ТО-2"
  }
]
```

## Review checklist (human confirm)

- [ ] Asset name matches the manual cover / nameplate
- [ ] Intervals match cited sections
- [ ] No invented high-risk procedures without source
- [ ] Map bound to the correct draft asset
