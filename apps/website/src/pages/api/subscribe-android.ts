import type { APIRoute } from 'astro';

// Désactiver le prerendering pour cette route API
export const prerender = false;

interface SubscribeRequest {
  email: string;
}

interface SubscribeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Validation simple de l'email
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export const POST: APIRoute = async ({ request }): Promise<Response> => {
  try {
    // Essayer de parser le body en JSON
    let body: SubscribeRequest;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ success: false, error: 'Format de requête invalide' } as SubscribeResponse),
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
        JSON.stringify({ success: false, error: 'Email requis' } as SubscribeResponse),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Format d\'email invalide' } as SubscribeResponse),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Récupération des variables d'environnement
    const apiKey = import.meta.env.BREVO_API_KEY;
    const listId = import.meta.env.BREVO_LIST_ID_ANDROID;

    if (!apiKey || !listId) {
      console.error('Variables d\'environnement Brevo manquantes', { apiKey: !!apiKey, listId });
      return new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' } as SubscribeResponse),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Préparer le body pour Brevo (format exact selon la doc Brevo)
    const listIdNumber = parseInt(listId, 10);
    const brevoBody = {
      email: email.trim().toLowerCase(),
      listIds: [listIdNumber],
      updateEnabled: true,
    };

    const bodyString = JSON.stringify(brevoBody);
    
    console.log('=== REQUÊTE BREVO (Android) ===');
    console.log('URL:', 'https://api.brevo.com/v3/contacts');
    console.log('Method: POST');
    console.log('Headers:', {
      'api-key': apiKey ? `${apiKey.substring(0, 20)}...` : 'MANQUANT',
      'Content-Type': 'application/json',
    });
    console.log('Body (objet):', brevoBody);
    console.log('Body (string):', bodyString);
    console.log('ListId type:', typeof listIdNumber, 'value:', listIdNumber);
    console.log('Email:', email.trim().toLowerCase());
    console.log('==============================');

    // Appel à l'API Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: bodyString,
    });

    // Gérer le cas 204 (No Content) - succès avec body vide
    if (brevoResponse.status === 204) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Inscription réussie ! Vous recevrez un email dès que l\'app sera disponible sur Android.' 
        } as SubscribeResponse),
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
          // Si le parsing échoue, on continue avec un objet vide
          console.warn('Impossible de parser la réponse Brevo:', text);
        }
      }
    }

    // Gérer les cas spécifiques de Brevo
    if (!brevoResponse.ok) {
      console.error('Erreur Brevo:', {
        status: brevoResponse.status,
        statusText: brevoResponse.statusText,
        data: brevoData,
      });

      // Email déjà existant
      if (brevoResponse.status === 400 && (
        brevoData.message?.includes('already exists') || 
        brevoData.message?.includes('Contact already exist')
      )) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Vous êtes déjà inscrit ! Vous recevrez un email dès que l\'app sera disponible.' 
          } as SubscribeResponse),
          { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }

      // Retourner l'erreur exacte de Brevo pour le débogage
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: brevoData.message || brevoData.error || 'Erreur lors de l\'inscription. Veuillez réessayer plus tard.',
          details: process.env.NODE_ENV === 'development' ? brevoData : undefined,
        } as SubscribeResponse),
        { 
          status: brevoResponse.status >= 400 && brevoResponse.status < 500 ? 400 : 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Inscription réussie ! Vous recevrez un email dès que l\'app sera disponible sur Android.' 
      } as SubscribeResponse),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // Log l'erreur pour le débogage (ne pas exposer les détails au client)
    console.error('Erreur serveur lors de l\'inscription:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Une erreur est survenue. Veuillez réessayer plus tard.' 
      } as SubscribeResponse),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};
