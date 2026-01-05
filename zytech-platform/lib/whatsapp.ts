const EVO_API_URL = process.env.EVOLUTION_API_URL;
const EVO_GLOBAL_KEY = process.env.EVOLUTION_API_KEY; 

export async function sendWhatsAppMessage(
  _unused_token: string, 
  instanceName: string,  
  to: string,
  text: string
) {
  if (!EVO_API_URL || !EVO_GLOBAL_KEY) {
    console.error(">>> [EVO ERROR] URL ou Key não configuradas no .env");
    return null;
  }

  const cleanPhone = to.replace(/\D/g, '');
  
  const url = `${EVO_API_URL}/message/sendText/${instanceName}`;

  const payload = {
    number: cleanPhone,
    text: text,
    delay: 1200, 
    linkPreview: true
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_GLOBAL_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(">>> [EVO ERROR]", JSON.stringify(data, null, 2));
      return null;
    }

    return data;
  } catch (error) {
    console.error(">>> [FETCH ERROR]", error);
    return null;
  }
}

/**
 * Obtém Mídia via Evolution API
 */
export async function getMediaUrl(mediaId: string, _token: string) {
  return null; 
}

export async function downloadMedia(url: string, _token: string) {
    return null;
}