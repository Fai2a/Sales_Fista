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
  if (!key || key.includes('PASTE_YOUR')) {
    throw new Error('NO_API_KEY');
  }

  // Clean the URL (remove query params/fragments)
  const cleanUrl = linkedinUrl.split('?')[0].replace(/\/$/, '');

  const response = await fetch(
    `https://${RAPIDAPI_HOST}/get-linkedin-profile?linkedin_url=${encodeURIComponent(cleanUrl)}&include_skills=false`,
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
    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }
    throw new Error(`API_ERROR: ${response.status} ${text}`);
  }

  const json = await response.json();

  // The API wraps the profile in a `data` field
  const profile = json.data || json;

  // Parse the response into our LeadData shape
  const name: string = profile.full_name || profile.firstName + ' ' + profile.lastName || '';
  const designation: string = profile.headline || profile.position || '';
  const email: string = profile.email || profile.personal_email || profile.work_email || '';
  const phone: string =
    (profile.phone_numbers && profile.phone_numbers[0]?.number) ||
    profile.phone ||
    '';
  const location: string = profile.location || profile.country || '';
  const company: string =
    (profile.experiences && profile.experiences[0]?.company) ||
    profile.current_company ||
    '';
  const profileImageUrl: string = profile.profile_picture_url || profile.photo_url || '';
  const bio: string = profile.summary || '';

  return {
    name,
    designation,
    email,
    phone,
    location,
    city: location,
    company,
    linkedin_url: cleanUrl,
    profile_image: profileImageUrl,
    connectionCount: String(profile.connections_count || ''),
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
