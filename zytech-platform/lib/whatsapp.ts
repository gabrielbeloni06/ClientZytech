

const META_VERSION = 'v19.0'; 

export async function sendWhatsAppMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string
) {
  const url = `https://graph.facebook.com/${META_VERSION}/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp", 
    recipient_type: "individual",
    to: to,
    type: "text",
    text: { preview_url: false, body: text }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(">>> [META ERROR - SEND]", JSON.stringify(data, null, 2));
      return null;
    }

    return data;
  } catch (error) {
    console.error(">>> [FETCH ERROR]", error);
    return null;
  }
}

export async function getMediaUrl(mediaId: string, accessToken: string) {
  const url = `https://graph.facebook.com/${META_VERSION}/${mediaId}`;

  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    const data = await response.json();
    return data.url || null; 
  } catch (error) {
    console.error(">>> [META ERROR - GET MEDIA]", error);
    return null;
  }
}

export async function downloadMedia(mediaUrl: string, accessToken: string) {
  try {
    const response = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;
  } catch (error) {
    console.error(">>> [DOWNLOAD ERROR]", error);
    return null;
  }
}