import axios from 'axios';

export async function sendWhatsAppMessage(
  accessToken: string,
  phoneId: string,
  to: string,
  message: string
) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Erro ao enviar mensagem WP:", error.response?.data || error.message);
  }
}

export async function getMediaUrl(mediaId: string, accessToken: string): Promise<string | null> {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v19.0/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response.data.url;
  } catch (error) {
    console.error("Erro ao obter URL da mídia:", error);
    return null;
  }
}

export async function downloadMedia(url: string, accessToken: string): Promise<ArrayBuffer | null> {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  } catch (error) {
    console.error("Erro ao baixar mídia:", error);
    return null;
  }
}