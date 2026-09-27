---
title: "PRD Addendum: WanderTogether"
created: 2026-09-27
updated: 2026-09-27
---

# PRD Addendum: WanderTogether

Technical-how and supporting depth that doesn't belong in the PRD narrative itself. See `prd.md` §4.5 (FR-12, FR-13) and §9 Assumptions Index.

## Accommodation Dummy Dataset (supports FR-12, FR-13)

No real hotel/hostel inventory provider is used. Accommodation Listings are seeded from a builder-authored dummy dataset — static enough to browse and attach to a Trip, with no live pricing, availability, or booking behind it.

**Shape of one listing:**

```json
{
  "id": "acc-001",
  "name": "Riverside Hostel",
  "destinationId": "dest-lisbon",
  "type": "hostel",
  "pricePerNightUSD": 28,
  "rating": 4.3,
  "photoUrl": "/mock/accommodations/riverside-hostel.jpg",
  "description": "Budget hostel a 10-minute walk from the river, dorm and private rooms available."
}
```

**Sample seed set (one destination shown; repeat the pattern per Destination in the catalog):**

| id | name | destinationId | type | pricePerNightUSD | rating |
|---|---|---|---|---|---|
| acc-001 | Riverside Hostel | dest-lisbon | hostel | 28 | 4.3 |
| acc-002 | Alfama Boutique Inn | dest-lisbon | hotel | 95 | 4.7 |
| acc-003 | Baixa Backpackers | dest-lisbon | hostel | 22 | 4.0 |
| acc-004 | Miradouro Suites | dest-lisbon | hotel | 140 | 4.8 |

**Notes for architecture/build:**
- `destinationId` ties a listing to a Destination (§3 Glossary) so FR-12's filter works.
- `type` (hotel/hostel) is enough for basic filtering; no room-type or amenity modeling needed for MVP.
- This dataset is expected to live wherever Destinations and Trips are persisted (§4.5 assumption: no-login still means a real backend) — not hardcoded client-side, since it needs to be browsable independent of any one Trip.
- Expanding the seed set to cover every Destination in the catalog is an implementation task, not a PRD decision — the shape above is the contract to replicate.
