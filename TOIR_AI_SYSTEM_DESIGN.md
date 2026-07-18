# ТОиР: технический дизайн

**Дата:** 2026-07-18  
**Связанные:** [B2B_MVP_SCOPE.md](B2B_MVP_SCOPE.md), [masterdoc-zitadel](https://github.com/masterdoc-app/masterdoc-zitadel)

Скоуп первых релизов: учёт, заявки, журналы, регламенты ТО, роли, AI-агенты. Склад ЗИП и подрядчики — backlog.

---

## 1. Стек

| Слой | Решение |
|------|---------|
| Клиенты | KMP (Decompose, MVIKotlin): Android — инженер; Web — диспетчер / admin / reporter |
| Auth | Zitadel self-host (РФ), OIDC, email+пароль, invite-only |
| Backend | **zitadel** + 8 application-сервисов + API Gateway; PostgreSQL (schema per service на MVP); NATS JetStream; MinIO |
| AI | Специализированные агенты; детерминированный маршрут (экран/endpoint → агент); RAG через search/Onyx |
| Отчёты | SQL + агрегаты + экспорт; без LLM |

**Инварианты AI:** (1) агент пишет только `draft` + `source: ai_generated`, в учёт — человек; (2) один агент = свой промпт, знания, tools.

---

## 2. Роли

| Роль | Клиент | Зона |
|------|--------|------|
| `admin` | Web | Пользователи, роли, invite, `EquipmentCategory`; загрузка **доков + оборудования** → Технолог; подтверждение пакета карточек (Asset + график ТО) |
| `dispatcher` | Web | Site, доска WO, входящие draft от Приёмщика, назначения, календарь ТО |
| `engineer` | Android | Заявки, чек-лист, документы актива, Copilot, закрытие; QR/шильдик в поле |
| `requester` | Web/mobile/бот | Внеочередная заявка только если feature `userRequests` включён |
| `reporter` | Web | Read-only отчёты и выгрузки |

JWT: `org_id` + `roles`. После логина клиент вызывает `GET /me` (**feature-service**) → список включённых фич для user×org → по ним **DI собирает приложение** (экраны, графы, модули).

---

## 3. AI-агенты

Маршрут детерминирован. Пишущие tools — только `createDraft*`.

| Агент | Вход | Выход | Tools | Фаза |
|-------|------|-------|-------|------|
| **Технолог** | **Admin** загружает доки + оборудование (ИЭ / руководство по ремонту) | Карточки автоматически: draft Asset + plan + checklist + preventive WO (подтверждает admin) | `createDraftAsset`, `createDraftPlan`, `createDraftChecklist`, `createDraftWorkOrder(preventive)` | MVP |
| **Приёмщик** | Текст/фото дефекта | draft corrective WO | `createDraftWorkOrder`, `findAsset`, `findDuplicates`, `checkFeatureFlag` | 1.1 |
| **Наставник** (Copilot) | Вопрос у станка | Ответ с цитатой; read-only | `searchDocs`, `getAssetHistory` | 1.1 |
| **Писарь** (Репортер) | Текстовый отчёт инженера | draft closeout + JournalEntry | `draftCloseout`, `draftJournalEntry` | 1.1 |

Шильдик/QR — только идентификация актива инженером в поле, не вход Технолога.

---

## 4. Сервисы

| Сервис | Данные | API |
|--------|--------|-----|
| **zitadel** (IdP) | Organization, User, Project roles, invite | OIDC: Authorization Code + PKCE; выдаёт JWT. Клиенты ходят в Zitadel напрямую (не через наш gateway). Канон: [`masterdoc-zitadel`](https://github.com/masterdoc-app/masterdoc-zitadel). Self-host РФ |
| **feature-service** | матрица фич user×org (роль + org flags) | единственный метод: `GET /me` → `{ features: ["dashboard", "graphics", …] }`. Клиентский DI по этому списку собирает приложение (диспетчер → dashboard, graphics; инженер → другие модули) |
| **catalog-service** | Site, EquipmentCategory, Asset | `/sites`, `/assets`, `/equipment-categories`, `/assets/from-documents` |
| **dashboard-service** | WorkOrder, JournalEntry, MaintenancePlan, Checklist, scheduler | `/work-orders`, `/journal-entries`; фаза 2: `/maintenance-plans`, `/checklists`, calendar |
| **document-service** | meta документов; файлы в MinIO | `/documents`, `/assets/{id}/documents` |
| **report-service** | проекции / read-replica | `/export/journal`, конструктор отчётов |
| **notification-service** | очередь push | consumers событий |
| **ai-gateway** | `agent_run_log`, конфиг агентов | `/ai/technologist`, `/ai/intake`, `/ai/mentor`, `/ai/scribe` |
| **search-service** | Onyx-индексы | `/search/docs` |

Плановое ТО — в **dashboard-service** (не отдельный maintenance-service). Gateway валидирует JWT от Zitadel; пароли в application backend не храним. Роли проекта — пять фиксированных из §2.

### События (NATS)

| Событие | Publisher → consumers |
|---------|----------------------|
| `document.attached` | document → search, ai-gateway (Технолог; вход — admin) |
| `asset.draft.created` | catalog → notification (admin) |
| `work_order.draft.created` | dashboard → notification (dispatcher для corrective; admin для preventive из Технолога) |
| `work_order.status.changed` / `.closed` | dashboard → notification, report |
| `journal.entry.created` | dashboard → report |
| `maintenance_plan.approved` | dashboard → notification |

---

## 5. Фазы

| Фаза | Backend / UI | AI |
|------|--------------|-----|
| **MVP** | zitadel, feature, catalog, dashboard (WO+journal), document, report stub | Технолог |
| **1.1** | push, QR, feature `userRequests` | Приёмщик, Наставник, Писарь |
| **2** | MaintenancePlan, Checklist, scheduler, календарь | пакет Технолога полностью в UI |
| **3** | конструктор отчётов | — |
| **Backlog** | склад ЗИП, contractor | — |
