import { NextResponse } from 'next/server';
import { crawlCompanyWebsite } from '@/lib/crawler';

/**
 * LeadVault Enrichment API - Crawl & Extract Version
 * Objective: Crawl company websites to identify explicitly published contact details.
 * NO GUESSING OR SYNTHETIC EMAILS ALLOWED.
 */

interface EnrichmentRequest {
  name: string;
  company: string;
  domain?: string;
}

function guessDomain(company: string): string {
  return company
    .toLowerCase()
    .replace(/\(.*\)/g, '')
    .replace(/[,.&]/g, ' ')
    .replace(/\s+(inc|ltd|llc|corp|corporation|group|solutions|pvt|private|limited|holding|holdings|pvt ltd|plc|co|company|ag|sa)\b/g, '')
    .trim()
    .split(' ')[0]
    .replace(/[^a-z0-9]/g, '') + '.com';
}

export async function POST(req: Request) {
  try {
    const body: EnrichmentRequest = await req.json();
    const { name, company, domain: providedDomain } = body;

    if (!name || !company) {
      return NextResponse.json({ error: 'Name and company are required' }, { status: 400 });
    }

    // --- ENRICHMENT PROCESS ---

    // 1. Identify Target Domain
    const domain = providedDomain || guessDomain(company);

    // 2. Crawl Company Website (Explicit Extraction)
    // This follows the strict process: Discover pages -> Extract -> Detect -> Normalize -> Filter
    const crawlResults = await crawlCompanyWebsite(domain);

    // 3. Filter for relevant person-specific data if possible
    // (In this version, we return all found corporate contacts found on priority pages)
    
    const results = {
      company_domain: crawlResults.company_domain,
      emails: crawlResults.emails,
      phone_numbers: crawlResults.phone_numbers,
      message: crawlResults.emails.length > 0 ? "Explicit contact details found on company website." : "No publicly available verified email found."
    };

    if (results.emails.length === 0 && results.phone_numbers.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "No publicly available verified email found.",
        notes: `Searched ${domain} and priority pages (/contact, /about, etc.). No explicit contact details found.`
      });
    }

    // Pick the most relevant email for the extension UI (priority to High confidence)
    const bestEmail = results.emails.sort((a, b) => {
      const score = { 'High': 3, 'Medium': 2, 'Low': 1 };
      return score[b.confidence] - score[a.confidence];
    })[0];

    return NextResponse.json({
      success: true,
      data: {
        email: bestEmail?.value || null,
        source: bestEmail?.source_url || results.company_domain,
        confidence: bestEmail?.confidence || 'Low',
        notes: `Found on ${bestEmail?.source_url || domain}`,
        all_results: results
      }
    });

  } catch (error) {
    console.error('Enrichment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
