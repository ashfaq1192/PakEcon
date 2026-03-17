# Feature Specification: PakEcon.ai Initial Platform

**Feature Branch**: `001-pakecon-initial`
**Created**: 2026-03-15
**Status**: Implemented
**Input**: User description: "Implement PakEcon.ai platform as specified in blueprint.md - Zero-cost architecture with Cloudflare, Astro 6, real-time economic data from SBP/PBS/FBR, interactive tools (Tax Optimizer, Mandi Table, Age Calculator, PDF Converter, Image Resizer), AI-generated insights with E-E-A-T compliance, and automated agent swarm (Scraper/Analyst/Publisher) for content publishing"

---

## User Scenarios & Testing

### User Story 1 - View Economic Data Dashboard (Priority: P1)

A visitor to PakEcon.ai lands on the homepage and wants to quickly understand the current state of Pakistan's economy. They should see:

- Current exchange rates for major currencies (USD, EUR, GBP, etc.)
- Latest commodity prices (gold, wheat, petrol, etc.)
- Recent market insights and analysis
- Links to interactive tools for tax calculation and utilities

**Why this priority**: This is the core value proposition - providing authoritative, real-time economic data to Pakistani users. Without this, the platform has no reason to exist.

**Independent Test**: Can be tested by loading the homepage in a browser and verifying that exchange rates, commodity prices, and market insights display correctly without requiring login or any server-side processing.

**Acceptance Scenarios**:

1. **Given** User visits homepage, **When** page loads, **Then** current exchange rates for at least 5 currencies are displayed
2. **Given** User visits homepage, **When** page loads, **Then** commodity prices for major categories (gold, agricultural, fuel) are displayed
3. **Given** User scrolls down, **When** they reach the insights section, **Then** recent market analysis articles are visible with titles, summaries, and publication dates
4. **Given** User clicks a "Calculate Your Tax" CTA, **When** page navigates, **Then** Tax Optimizer tool is visible and ready for input

---

### User Story 2 - Calculate Income Tax (Priority: P1)

A Pakistani taxpayer needs to estimate their annual income tax liability based on FBR 2026 tax slabs. If they are a freelancer or IT professional, they should be able to apply Digital Nation Act credits (10% discount). They want to see the tax broken down by income slab and understand the impact of different income levels.

**Why this priority**: The Tax Optimizer is the most popular interactive tool on the platform and directly addresses a high-pain-point user need (tax planning). It demonstrates the platform's ability to provide practical, high-value utilities.

**Independent Test**: Can be tested by entering various income amounts (e.g., 500,000 PKR, 1,500,000 PKR, 5,000,000 PKR) and verifying that the calculated tax matches expected values from FBR 2026 slabs, and confirming that freelancer credits are correctly applied when enabled.

**Acceptance Scenarios**:

1. **Given** User enters annual income of 1,500,000 PKR, **When** they calculate tax, **Then** the system displays PKR 45,000 (15% of 300,000 above 1.2M) as the total tax
2. **Given** User checks "Freelancer / IT Professional" toggle, **When** "Apply Digital Nation Act Credits" option becomes visible, **When** they enable it, **Then** the calculated tax reduces by 10% (from PKR 45,000 to PKR 40,500)
3. **Given** User enters income below 600,000 PKR, **When** they calculate tax, **Then** the system displays PKR 0 as the total tax (0% slab)
4. **Given** User views the tax breakdown, **When** the result is shown, **Then** they see a detailed table showing taxable amount and tax for each income slab

---

### User Story 3 - View Mandi Intelligence Table (Priority: P2)

A consumer wants to compare commodity prices across different Pakistani cities to make informed purchasing decisions. They should be able to filter by city, commodity type, and sort by price or price change. They want to see price trends (increasing/decreasing indicators) to understand market direction.

**Why this priority**: The Mandi Table provides practical value to daily consumers and demonstrates the platform's ability to present complex data in an accessible, filterable interface. It's less critical than tax calculation but still high-value for the target audience.

**Independent Test**: Can be tested by loading the Mandi Intelligence section with sample commodity price data and verifying that the table displays correctly, filtering by city/commodity works, and sorting by price or change shows appropriate ordering.

**Acceptance Scenarios**:

1. **Given** User opens Mandi Intelligence section, **When** page loads, **Then** commodity prices for multiple cities (Karachi, Lahore, Islamabad, etc.) and commodities (wheat, sugar, tomato, onion) are displayed in a table
2. **Given** User selects "Lahore" from city filter, **When** filter is applied, **Then** table shows only Lahore prices
3. **Given** User clicks "Price Change" sort option, **When** sort is applied, **Then** commodities are ordered by percentage change (most volatile first)
4. **Given** User views price data, **When** an item shows red text, **When** they look at the indicator, **Then** they understand the commodity price has increased; green text means price has decreased

---

### User Story 4 - Use Client-Side Utilities (Priority: P2)

A user needs to perform quick calculations and file conversions without uploading their data to any server. They want to use an age calculator to determine exact age, convert PDF files to images for sharing or editing, and resize images for web use. All of this should happen in their browser with no network requests for file processing.

**Why this priority**: These utility tools serve as "traffic magnets" - users return repeatedly for simple tasks. Client-side processing ensures privacy (no uploads) and reduces server costs (zero-cost architecture). While individually less critical than core data features, collectively they drive significant traffic.

**Independent Test**: Can be tested by opening each utility tool, verifying that Age Calculator correctly computes age from a birth date, PDF Converter processes a sample PDF and generates downloadable images, and Image Resizer accepts an image, resizes it according to settings, and produces a downloadable result.

**Acceptance Scenarios**:

1. **Given** User is on the Utilities page, **When** they scroll to Age Calculator, **When** they enter birth date, **Then** the system displays age in years, months, and days
2. **Given** User uploads a PDF file using PDF Converter, **When** conversion completes, **Then** they see preview images of each PDF page and can download converted images (PNG/JPEG/WebP)
3. **Given** User uploads an image using Image Resizer, **When** they specify new dimensions (e.g., 800px width), **When** "Maintain aspect ratio" is checked, **Then** height is automatically calculated and image is resized accordingly
4. **Given** User is on any utility page, **When** they complete their task, **Then** no file data has been sent to any server (verified by checking network tab in browser dev tools)

---

### User Story 5 - Read Authoritative Market Insights (Priority: P1)

A researcher, journalist, or informed citizen wants to read professional economic analysis about Pakistan. They expect content that cites official sources (SBP, PBS, FBR), includes data-driven insights, and is written by credentialed economics professionals. They should be able to understand the significance of economic trends and access related government sources.

**Why this priority**: Market insights are the "content moat" that differentiates PakEcon.ai from other economic websites. High-quality, E-E-A-T compliant content is essential for organic search traffic and Google AdSense approval. This is a foundational differentiator.

**Independent Test**: Can be tested by visiting the homepage insights section or reading individual insight articles and verifying that each includes proper citations to official sources, displays author credentials, and shows a clear disclaimer that the content is educational and not financial advice.

**Acceptance Scenarios**:

1. **Given** User views the homepage insights section, **When** they read an article about exchange rates, **Then** the article cites State Bank of Pakistan as the source with a link to sbp.org.pk
2. **Given** User reads an analysis, **When** they scroll to the bottom, **Then** they see the author credentials displayed (M.Phil Economics, B.Com) and a link to the About page
3. **Given** User reads any content, **When** they view the page footer, **Then** they see the E-E-A-T disclaimer: "Information provided is for educational purposes and based on public data. Not financial advice."
4. **Given** User uses search or navigates to sitemap, **When** they access content, **Then** proper Schema.org JSON-LD markup is present for search engines to understand the content type

---

### User Story 6 - Access Author Credentials (Priority: P2)

A user or search evaluator wants to verify PakEcon.ai's authoritativeness before relying on the economic information. They should be able to visit the About page and see clear display of the founder's qualifications (education, experience) and professional credentials. This should establish trust and comply with Google's E-E-A-T guidelines.

**Why this priority**: Author credentials are required for Google's E-E-A-T quality signals. Without clear, verifiable credentials, the platform cannot establish authoritativeness for search ranking or AdSense approval. This is a compliance requirement, not just nice-to-have.

**Independent Test**: Can be tested by visiting the About page and verifying that it displays the author's name, education qualifications (M.Phil Economics, B.Com), professional experience details, and links to social media profiles for verification.

**Acceptance Scenarios**:

1. **Given** User clicks "About" in navigation, **When** page loads, **Then** the author's name and credentials are prominently displayed
2. **Given** User scrolls to education section, **When** they read, **Then** they see "M.Phil Economics" and "B.Com" clearly stated with year of completion where relevant
3. **Given** User views professional experience, **When** they read, **Then** they see relevant roles and institutions listed
4. **Given** user is on any page, **When** they view footer, **Then** there's a link to "About & Credentials" for easy access to author information

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST display current exchange rates for PKR against at least 6 major currencies (USD, EUR, GBP, AED, SAR, CNY)
- **FR-002**: System MUST display commodity prices for at least 15 items across major categories (gold, silver, fuel, agricultural: wheat, rice, sugar, flour, tomato, onion, potato, chicken, eggs, milk, lentils)
- **FR-003**: System MUST provide tax calculation based on FBR 2026 tax slabs with support for income ranges from 0 to 4,100,000+ PKR
- **FR-004**: System MUST allow users to enable "Digital Nation Act" tax credits (10% discount) when they select "Freelancer / IT Professional" option
- **FR-005**: System MUST display tax breakdown showing taxable amount and tax calculated for each income slab
- **FR-006**: Mandi Table MUST support filtering by city (Karachi, Lahore, Islamabad, Peshawar, Multan, Quetta) and commodity type
- **FR-007**: Mandi Table MUST support sorting by price (high to low) and price change (highest volatility first)
- **FR-008**: Age Calculator MUST accept birth date input and display age in years, months, and days with total days lived
- **FR-009**: PDF Converter MUST accept PDF files and convert each page to PNG, JPEG, or WebP images
- **FR-010**: PDF Converter MUST use pdf-lib.js loaded via CDN (client-side processing)
- **FR-011**: Image Resizer MUST accept image files and resize them to specified dimensions with quality control
- **FR-012**: Image Resizer MUST use HTML5 Canvas API for client-side processing
- **FR-013**: All utility tools MUST process files entirely in the browser without any data upload to server endpoints
- **FR-014**: System MUST display market insights with proper Schema.org Article markup for SEO
- **FR-015**: System MUST include author credentials (name, education, experience) on About page for E-E-A-T compliance
- **FR-016**: System MUST display E-E-A-T disclaimer on every page footer: "Information provided is for educational purposes and based on public data. Not financial advice."
- **FR-017**: System MUST generate sitemap.xml automatically via @astrojs/sitemap integration for search engines
- **FR-018**: System MUST support responsive design for mobile, tablet, and desktop viewports

### Data Requirements

- **DR-001**: Exchange rate data MUST be sourced from State Bank of Pakistan (sbp.org.pk) with currency code, rate, date, and source
- **DR-002**: Commodity price data MUST include commodity name, city, price, unit, and date
- **DR-003**: Tax slab data MUST follow FBR 2026 structure with year, minimum income, maximum income (if applicable), tax rate, and effective date
- **DR-004**: Market insight data MUST include title, content, summary, delta (percentage change), indicators array, publication date, and citation links

### Performance Requirements

- **PR-001**: Homepage MUST load First Contentful Paint (FCP) in under 1.8 seconds
- **PR-002**: Largest Contentful Paint (LCP) MUST be under 2.5 seconds
- **PR-003**: Time to Interactive (TTI) MUST be under 3.5 seconds
- **PR-004**: System MUST achieve Lighthouse Performance score of 90+ on mobile and desktop

### Security & Privacy Requirements

- **SEC-001**: All utility tools MUST process files 100% client-side with zero data uploads to ensure user privacy
- **SEC-002**: AGENT_SECRET environment variable MUST be used to authenticate Cloudflare Functions API trigger endpoint
- **SEC-003**: No sensitive financial or personal data MUST be logged or stored beyond what's required for functional operation
- **SEC-004**: All external API calls (to data sources) MUST include appropriate user-agent headers and respect robots.txt with 10-second rate limiting between requests

### Compliance Requirements

- **COMP-001**: All content MUST comply with Google's E-E-A-T guidelines (Experience, Expertise, Authoritativeness, Trustworthiness)
- **COMP-002**: Every page MUST include the disclaimer about educational purposes and non-financial-advice
- **COMP-003**: Author credentials MUST be prominently displayed with verifiable education (M.Phil Economics, B.Com)
- **COMP-004**: All insights MUST cite official government sources (SBP, PBS, FBR, PMEX) with working links

## Key Entities

- **Exchange Rate**: Represents the current exchange rate between Pakistani Rupee (PKR) and a foreign currency. Attributes: currency code (USD, EUR, etc.), rate value, date, source (SBP), timestamp.

- **Commodity Price**: Represents the current market price of a commodity in a specific Pakistani city. Attributes: commodity name (wheat, gold, petrol, etc.), city (Karachi, Lahore, etc.), price value, unit (kg, tola, liter), date, source, change percentage.

- **Tax Slab**: Represents an income tax bracket as defined by FBR 2026. Attributes: year (2026), minimum income (PKR), maximum income (PKR or null for highest slab), tax rate (decimal), effective from date.

- **Market Insight**: An economic analysis article generated by the Agent system. Attributes: unique ID, title, 300+ word content, key summary, delta (percentage change), indicators array (categorized), publication status, timestamp.

- **Author Credential**: Represents the professional qualifications of the content creator for E-E-A-T compliance. Attributes: full name, highest degree (M.Phil Economics), additional degrees (B.Com), years of completion, professional experience, social media links.

## Edge Cases

- What happens when data source websites are down or unreachable?

  The Agent Scraper MUST fall back to cached data stored in D1 database for the past 7 days. A log entry MUST be recorded indicating the source was unavailable and cached data was served.

- What happens when user enters invalid input in tax calculator?

  The system MUST display a user-friendly error message without breaking the page layout. Input validation should prevent negative values, non-numeric characters, or implausible amounts (e.g., negative income).

- What happens when PDF upload fails (corrupted file, unsupported format)?

  The PDF Converter MUST display a clear error message explaining what went wrong and suggesting user verify the file format. The interface MUST remain responsive and allow re-uploading.

- What happens when Cloudflare D1 database write operation fails?

  The Agent workflow MUST log the error, mark the workflow stage as "error" in the KV state, and NOT corrupt any existing data. Partial writes should be avoided through proper transaction handling.

- What happens when a user's browser doesn't support a required API (e.g., Canvas for image resizing)?

  The system MUST detect browser capabilities and either provide a polyfill or display a graceful degradation message suggesting they use a modern browser. Core functionality should remain accessible where possible.

- What happens when scheduled agent workflow is triggered while previous execution is still in progress?

  The KV-based workflow state MUST check for an existing workflow state. If a workflow is already running (state exists with recent timestamp), the new trigger should either wait for completion or fail gracefully with a message indicating a workflow is already in progress.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Homepage loads and displays economic data (exchange rates, commodities, insights) in under 3 seconds on mobile and desktop
- **SC-002**: Tax Calculator correctly computes tax for income amounts from 0 to 10,000,000 PKR with FBR 2026 slab accuracy
- **SC-003**: User can filter Mandi Table by city and commodity type with results updating in under 500ms
- **SC-004**: All utility tools (Age Calculator, PDF Converter, Image Resizer) process input files without any data uploaded to server (verified by monitoring network activity)
- **SC-005**: Market insights articles include proper Schema.org markup and citations to official sources (SBP, PBS, FBR, PMEX)
- **SC-006**: About page displays author credentials (M.Phil Economics, B.Com) that match Google's E-E-A-T requirements
- **SC-007**: Platform achieves Lighthouse Performance score of 90+ on mobile and desktop
- **SC-008**: Agent swarm workflow (Scraper → Analyst → Publisher) executes successfully every 6 hours and generates content when significant economic changes occur (>1% delta threshold)
- **SC-009**: All pages include the E-E-A-T disclaimer: "Information provided is for educational purposes and based on public data. Not financial advice."
- **SC-010**: Sitemap.xml is generated and accessible at /sitemap-index.xml with all pages included
