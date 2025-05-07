import type { APIRoute } from 'astro';

// Mark this endpoint as server-rendered
export const prerender = false;

// Simple in-memory store for rate limiting (would use Redis or similar in production)
const ipSubmissions: Record<string, number[]> = {};
const EMAIL_SUBMISSIONS: Record<string, number[]> = {};

// Rate limiting settings
const MAX_SUBMISSIONS_PER_HOUR = 5;
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// Brevo API endpoint handler
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { email, website, signupTime } = data;
    
    // 1. Bot detection via honeypot
    if (website && website.length > 0) {
      console.log('Bot detected via honeypot field');
      // Return success to fool bots but don't actually process
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subscription successful' 
        }),
        { status: 200 }
      );
    }
    
    // 2. Bot detection via timing (if filled too quickly)
    if (signupTime < 1500) { // Less than 1.5 seconds is suspicious
      console.log('Bot detected via timing - form filled too quickly');
      // Return success to fool bots but don't actually process
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subscription successful' 
        }),
        { status: 200 }
      );
    }
    
    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email is required' 
        }),
        { status: 400 }
      );
    }
    
    // 3. Basic email validation
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid email format' 
        }),
        { status: 400 }
      );
    }
    
    // 4. Rate limiting by IP address
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('cf-connecting-ip') || 
                    'unknown';
                    
    const now = Date.now();
    
    // Check IP-based rate limiting
    if (!ipSubmissions[clientIP]) {
      ipSubmissions[clientIP] = [];
    }
    
    // Remove old entries
    ipSubmissions[clientIP] = ipSubmissions[clientIP].filter(
      timestamp => now - timestamp < RATE_WINDOW
    );
    
    // Check if too many submissions from this IP
    if (ipSubmissions[clientIP].length >= MAX_SUBMISSIONS_PER_HOUR) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Too many signup attempts. Please try again later.' 
        }),
        { status: 429 }
      );
    }
    
    // 5. Rate limiting by email address
    const normalizedEmail = email.toLowerCase();
    if (!EMAIL_SUBMISSIONS[normalizedEmail]) {
      EMAIL_SUBMISSIONS[normalizedEmail] = [];
    }
    
    // Remove old entries
    EMAIL_SUBMISSIONS[normalizedEmail] = EMAIL_SUBMISSIONS[normalizedEmail].filter(
      timestamp => now - timestamp < RATE_WINDOW
    );
    
    // Check if this email has been submitted too many times
    if (EMAIL_SUBMISSIONS[normalizedEmail].length >= 2) { // Stricter limit for same email
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'This email has been signed up recently.' 
        }),
        { status: 429 }
      );
    }
    
    // Make API call to Brevo
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': import.meta.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        email,
        listIds: [4], // Add to list with ID: 4
        updateEnabled: true, // Update contact if it already exists
        attributes: {
          SIGNUP_DATE: new Date().toISOString().split('T')[0],
          SOURCE: 'landing_page'
        }
      })
    });
    
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: responseData.message || 'Failed to subscribe' 
        }),
        { status: response.status }
      );
    }
    
    // Record this submission for rate limiting
    ipSubmissions[clientIP].push(now);
    EMAIL_SUBMISSIONS[normalizedEmail].push(now);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Successfully subscribed!' 
      }),
      { status: 200 }
    );
    
  } catch (error) {
    console.error('Error in subscribe endpoint:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Server error' 
      }),
      { status: 500 }
    );
  }
}