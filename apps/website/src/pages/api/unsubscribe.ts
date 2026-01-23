import type { APIRoute } from 'astro';

// Désactiver le prerendering pour cette route API
export const prerender = false;

interface UnsubscribeRequest {
  email: string;
}

interface UnsubscribeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Validation simple de l'email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const DELETE: APIRoute = async ({ request }): Promise<Response> => {
  try {
    // Essayer de parser le body en JSON
    let body: UnsubscribeRequest;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Format de requête invalide' } as UnsubscribeResponse),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    const { email } = body;

    // Validation
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Email requis' } as UnsubscribeResponse),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Format d\'email invalide' } as UnsubscribeResponse),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Récupération des variables d'environnement
    const apiKey = import.meta.env.BREVO_API_KEY;

    if (!apiKey) {
      console.error('Variable d\'environnement Brevo manquante');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' } as UnsubscribeResponse),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    const emailEncoded = encodeURIComponent(email.trim().toLowerCase());

    // Supprimer le contact de Brevo
    const brevoResponse = await fetch(`https://api.brevo.com/v3/contacts/${emailEncoded}`, {
      method: 'DELETE',
      headers: {
        'api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    // Gérer le cas 204 (No Content) - succès avec body vide
    if (brevoResponse.status === 204) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Vous avez été désinscrit avec succès. Vous ne recevrez plus d\'emails de notre part.'
        } as UnsubscribeResponse),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parser le JSON seulement si le body n'est pas vide
    let brevoData: any = {};
    const contentType = brevoResponse.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const text = await brevoResponse.text();
      if (text) {
        try {
          brevoData = JSON.parse(text);
        } catch (e) {
          console.warn('Impossible de parser la réponse Brevo:', text);
        }
      }
    }

    // Gérer le cas 404 - contact n'existe pas
    if (brevoResponse.status === 404 && (
      brevoData.code === 'document_not_found' ||
      brevoData.message?.includes('does not exist') ||
      brevoData.message?.includes('Contact does not exist')
    )) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cette adresse email n\'est pas inscrite dans nos listes.'
        } as UnsubscribeResponse),
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Autres erreurs
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Une erreur est survenue lors de la désinscription. Veuillez contacter contact@cashou.app pour obtenir de l\'aide.'
      } as UnsubscribeResponse),
      { 
        status: brevoResponse.status >= 400 && brevoResponse.status < 500 ? 400 : 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erreur serveur lors de la désinscription:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Une erreur est survenue. Veuillez contacter contact@cashou.app pour obtenir de l\'aide.' 
      } as UnsubscribeResponse),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};
