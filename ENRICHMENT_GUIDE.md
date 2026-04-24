# LeadVault Enrichment System - Strict Compliance Mode

This document outlines the architecture for the compliant, search-based enrichment system.

## 1. Core Principles (Strict Compliance)

- **Accuracy Over Completeness**: It is better to return no email than an unverified or guessed one.
- **No Synthetic Emails**: Generation of emails using patterns (e.g., `first.last@company.com`) is strictly prohibited.
- **Explicit Sources Only**: Contact details must be extracted from publicly available, trusted sources.
- **Verification**: If no verified email exists, the system must respond: *"No publicly available verified email found."*

## 2. Enrichment Workflow

### Step 1: Target Identification
The system receives the Name, Role, and Company from the LinkedIn scraper.

### Step 2: Source Discovery
The backend performs targeted searches across:
- Official company "About" or "Team" pages.
- Personal portfolios and GitHub profiles.
- Public conference speaker lists or research publications.

### Step 3: Explicit Extraction
The system scans these pages specifically for published `mailto:` links or contact text.

### Step 4: Multi-Source Validation
If an email is found, the system attempts to verify it against a second public source (e.g., a LinkedIn profile match or a news article citation).

## 3. Implementation Status

The current backend structure in `/api/enrich` is built to support this workflow.
To enable live searching, a search API (like **Serper.dev** or **Google Custom Search**) should be integrated into the `ENRICHMENT PROCESS` block.

### Example Integration (Conceptual):
```javascript
async function searchPublicData(name, company) {
  const query = `"${name}" "${company}" email OR contact`;
  const results = await callSerperApi(query);
  // Logic to parse results for explicit email matches...
}
```

## 4. UI Behavior

- **High Confidence**: Displayed when the email is found and verified across multiple sources.
- **Source Links**: The extension log and dashboard record the specific URLs where the data was found for audit purposes.
- **Fallback**: If no data is found, a clear "No verified email found" message is shown to the user.
