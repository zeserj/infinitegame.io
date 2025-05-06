import type { APIRoute } from 'astro';

// Mark this endpoint as server-rendered
export const prerender = false;

// Brevo API endpoint handler
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { email } = data;
    
    if (!email) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Email is required' 
        }),
        { status: 400 }
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