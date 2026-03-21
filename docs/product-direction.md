# Product Direction

## Product Identity

Waraqhur is not a generic blog and not a generic Twitter clone.

It is a professional Arabic social news platform that combines:
- the fast feed experience of Twitter/X
- the editorial clarity of a structured publishing platform
- the operational logic of the legacy Akhbar project
- the future readiness required for iPhone and Android apps

## Core Vision

The platform should become:

- Arabic-first
- feed-first
- mobile-first
- API-first
- source-aware
- category-aware
- invitation-capable
- permission-driven
- scalable in architecture and product design

## Product Layers

### 1. Public experience
The public product should provide:
- a strong Arabic homepage
- a live timeline/feed
- post detail pages
- source pages
- category pages
- search
- notifications
- user profiles
- interaction primitives

### 2. Social layer
The platform should support:
- follow / unfollow
- replies
- quote posts
- reposts / retweets
- likes
- bookmarks
- user timelines
- home timelines

### 3. News layer
The platform should preserve the unique value of the legacy Akhbar product:
- sources are first-class entities
- categories are first-class entities
- external sources such as Nitter and RSS are supported
- editorial and aggregated content can coexist
- attribution and source identity remain visible

### 4. Admin and editorial layer
The internal platform should include:
- admin panel
- role and permission management
- invitation workflows
- audit log
- category and source management
- post moderation and publishing workflows
- content quality controls

## Architecture Direction

### Near-term direction
The current project should continue as a modular, professional monolith:
- Next.js App Router
- PostgreSQL
- Prisma
- internal API-first structure
- reusable services and contracts
- clean separation between UI and business logic

### Mid-term direction
As product complexity grows, the system should be prepared to split into independent services:
- timeline service
- notification service
- interaction service
- search service
- media service
- source ingestion service

### Important rule
We should not jump into heavy distributed complexity before the product model is fully stabilized.

The correct engineering path is:
1. stabilize product model
2. stabilize data contracts
3. stabilize timeline and source ingestion rules
4. then split services where needed

## Mobile Readiness Principle

Everything built from now on must be valid for:
- web now
- iPhone later
- Android later

That means:
- API-first contracts
- reusable domain services
- unified response and error formats
- deep-link-friendly routes
- no business logic trapped inside web-only components

## Functional Priorities

The implementation roadmap should follow this order:

1. Refine public Arabic UI toward a true news-feed product
2. Expand content model into social/news hybrid model
3. Add social graph and timeline logic
4. Add interaction layer
5. Add source ingestion from external providers
6. Add search and trending
7. Strengthen editorial workflows
8. Strengthen mobile-readiness and scale-readiness

## Non-Goals

The project should not become:
- a simple CMS
- a dashboard-first app
- a generic blog
- a random Twitter clone with no editorial identity

## Working Question

Every future step should be judged by this question:

Does this move Waraqhur closer to becoming a professional Arabic social news platform built on the strengths of the legacy Akhbar project?
