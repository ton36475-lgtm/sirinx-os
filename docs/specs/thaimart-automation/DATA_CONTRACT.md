# Thaimart Automation Data Contract

Status: local specification
Date: 2026-07-09
Mode: synthetic data only until explicit data/storage approval

## Contract Principles

- Use synthetic data in docs, tests, and local fixtures.
- Do not store real customer names, phone numbers, addresses, chat content,
  invoices, tracking numbers, payment data, or marketplace account data without
  explicit approval.
- Do not log credential values, session cookies, API keys, OAuth tokens, or
  marketplace auth headers.
- Mark every external field as `confirmed`, `inferred`, or `unknown` before
  implementation.
- A local export batch is not permission to publish to Thaimart.

## Current Local Seed Shape

The existing local seed script creates:

```json
{
  "product": {
    "sku": "TEST-SEED-001",
    "title_th": "synthetic local test product",
    "price_base": 150,
    "price_thaimart": 145.5,
    "stock_sirinx": 100,
    "stock_thaimart": 100,
    "category_id": "STICKERS",
    "sync_status": "PENDING_GATE"
  },
  "approvalGate": {
    "action_type": "THAIMART_LIVE_PUBLISH",
    "gate_status": "WAITING"
  }
}
```

The local files are:

- `memory/live/products.json`
- `memory/live/approvals.json`

These files are runtime-local and should stay untracked.

## Canonical Entities

### SirinxProduct

```json
{
  "id": "local-product-uuid",
  "sku": "TEST-SEED-001",
  "titleTh": "synthetic product title",
  "descriptionTh": "synthetic product description",
  "categoryId": "STICKERS",
  "attributes": {
    "material": "synthetic",
    "size": "A5"
  },
  "variants": [
    {
      "variantId": "variant-001",
      "sku": "TEST-SEED-001-A5",
      "optionValues": {
        "size": "A5"
      }
    }
  ],
  "priceBase": 150,
  "priceMarketplace": 145.5,
  "stockAvailable": 100,
  "media": [],
  "syncStatus": "PENDING_GATE",
  "updatedAt": "2026-07-09T00:00:00.000Z"
}
```

### ThaimartProductTarget

```json
{
  "marketplace": "thaimart",
  "externalProductId": null,
  "sku": "TEST-SEED-001",
  "categoryPath": ["synthetic", "stickers"],
  "title": "synthetic product title",
  "description": "synthetic product description",
  "attributes": {},
  "variants": [],
  "price": 145.5,
  "stock": 100,
  "shippingTemplateId": null,
  "status": "DRAFT_LOCAL_ONLY"
}
```

### SirinxStock

```json
{
  "sku": "TEST-SEED-001",
  "warehouseId": "local-warehouse",
  "available": 100,
  "reserved": 0,
  "source": "sirinx-local",
  "updatedAt": "2026-07-09T00:00:00.000Z"
}
```

### ThaimartOrderImport

```json
{
  "externalOrderId": "synthetic-order-001",
  "orderStatus": "PAID_SYNTHETIC",
  "items": [
    {
      "sku": "TEST-SEED-001",
      "quantity": 1,
      "unitPrice": 145.5
    }
  ],
  "customer": {
    "redacted": true,
    "piiStorageApproved": false
  },
  "shipping": {
    "carrier": "flash",
    "trackingNumber": null
  }
}
```

### ApprovalGate

```json
{
  "id": "approval-uuid",
  "actionType": "THAIMART_EXPORT_DRY_RUN",
  "targetReference": "local-product-uuid",
  "gateStatus": "WAITING",
  "payloadSnapshot": {
    "sku": "TEST-SEED-001",
    "syntheticOnly": true
  },
  "allowedCommand": null,
  "evidencePath": null,
  "externalWritesApproved": false,
  "createdAt": "2026-07-09T00:00:00.000Z"
}
```

### ExportBatch

```json
{
  "batchId": "thaimart-export-20260709-001",
  "mode": "LOCAL_DRY_RUN",
  "source": "memory/live/products.json",
  "target": "data/generated-assets/thaimart-export/thaimart-export-20260709-001",
  "records": 1,
  "externalWrites": false,
  "telegramSent": false,
  "workerExecuted": false,
  "createdAt": "2026-07-09T00:00:00.000Z"
}
```

## Mapping Table

| SIRINX Field | Thaimart Target | Status | Rule |
|---|---|---|---|
| `sku` | product SKU | inferred | Required, unique per product/variant |
| `title_th` | product title | inferred | Thai title required |
| `description_th` | product description | inferred | HTML policy unknown |
| `category_id` | category path/id | inferred | Needs Thaimart category mapping |
| `price_thaimart` | marketplace price | inferred | Must pass price rule validation |
| `stock_thaimart` | marketplace stock | inferred | Must not exceed available stock |
| `variant` | product variants | inferred | Option schema unknown |
| `shippingTemplate` | shipping template | unknown | Requires source extraction |
| `images` | product media | unknown | Requires upload policy |
| `order.id` | external order id | inferred | Import only until write approval |
| `customer` | customer profile | restricted | PII storage blocked |
| `chat` | customer message | restricted | Live reply blocked |
| `tracking` | shipping status | inferred | Carrier credentials blocked |

## Blocked Fields Until Approval

- Real customer name.
- Real phone number.
- Real address.
- Real chat content.
- Real invoice or tax ID.
- Real tracking number.
- Real payment status from production source.
- Seller center session cookie.
- API token, OAuth token, or secret.
- Production marketplace product ID if it would enable mutation.

## Required Future Data Gates

- Product export dry-run gate.
- Product publish gate.
- Stock update gate.
- Order import gate.
- Shipment update gate.
- Chat reply gate.
- Invoice generation gate.
- Customer data storage gate.
- Production analytics/reporting gate.
