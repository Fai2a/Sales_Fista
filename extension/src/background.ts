// Service worker for the LeadVault Extension
import { RAPIDAPI_KEY, RAPIDAPI_HOST, DASHBOARD_API_URL } from './config';


chrome.runtime.onInstalled.addListener(() => {
  console.log("LeadVault Extension Installed successfully.");
});

// Main message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.action === 'FETCH_LINKEDIN_PROFILE') {
    fetchLinkedInProfile(message.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => {
        console.error('RapidAPI error:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }

  if (message.action === 'SAVE_LEAD') {
    saveLeadToDashboard(message.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => {
        console.error("Save error:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// ── RapidAPI LinkedIn Fetch ──────────────────────────────────────────────────

async function fetchLinkedInProfile(linkedinUrl: string) {
  const key = RAPIDAPI_KEY;
  if (!key || key.includes('PASTE_YOUR') || key.includes('ENCRYPTION_KEY') || key.startsWith('[')) {
    throw new Error('NO_API_KEY');
  }

  // Clean the URL and extract username
  // URL format: https://www.linkedin.com/in/username/
  const cleanUrl = linkedinUrl.split('?')[0].replace(/\/$/, '');
  const username = cleanUrl.split('/in/')[1];

  if (!username) {
    throw new Error('API_ERROR: Could not parse username from LinkedIn URL');
  }

  // Calling the correct endpoint for fresh-linkedin-scraper-api
  const response = await fetch(
    `https://${RAPIDAPI_HOST}/api/v1/user/profile?username=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: {
        'x-rapidapi-host': RAPIDAPI_HOST,
        'x-rapidapi-key': RAPIDAPI_KEY,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 403 || response.status === 401) {
      throw new Error('INVALID_API_KEY');
    }
    if (response.status === 404) {
      throw new Error('API_ERROR: Profile not found by this API');
    }
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`API_ERROR: ${response.status} ${text}`);
  }

  const json = await response.json();
  const profile = json.data || json;

  // Mapping fields based on the new API response structure
  const name = profile.full_name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || '';
  const designation = profile.headline || profile.position || '';
  
  // Robust Email Detection from API
  const email = profile.email || 
                (profile.personal_emails && profile.personal_emails[0]) ||
                (profile.work_emails && profile.work_emails[0]) ||
                profile.personal_email || 
                profile.work_email || '';

  // Robust Phone Detection from API
  let phone = profile.phone || '';
  if (!phone && profile.phone_numbers && Array.isArray(profile.phone_numbers)) {
      phone = profile.phone_numbers[0]?.number || profile.phone_numbers[0] || '';
  }
  
  // Handle Location (could be object or string)
  let loc = profile.location || profile.country || '';
  if (typeof loc === 'object' && loc !== null) {
      loc = (loc as any).city || (loc as any).name || (loc as any).country || JSON.stringify(loc);
  }

  // Handle Company (could be object or string or array)
  let comp = '';
  const firstExp = (profile.experiences && profile.experiences[0]) || (profile.experience && profile.experience[0]);
  
  if (firstExp) {
      const c = firstExp.company || firstExp.companyName;
      comp = typeof c === 'object' ? (c.name || c.title || '') : (c || '');
  } 
  
  if (!comp) {
      const c = profile.current_company || profile.company;
      comp = typeof c === 'object' ? (c.name || c.title || '') : (c || '');
  }

  const profileImageUrl = profile.profile_picture_url || profile.photo_url || '';
  const bio = profile.summary || '';

  return {
    name,
    designation,
    email: String(email),
    phone: String(phone),
    location: String(loc),
    city: String(loc),
    company: String(comp),
    linkedin_url: cleanUrl,
    profile_image: profileImageUrl,
    connectionCount: String(profile.connections_count || profile.connections || ''),
    bio,
    skills: [],
  };
}

// ── Save to Dashboard ────────────────────────────────────────────────────────

async function saveLeadToDashboard(leadData: any) {
  const response = await fetch(DASHBOARD_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(leadData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dashboard error: ${errorText}`);
  }

  return response.json();
}
