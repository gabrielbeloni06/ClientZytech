import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";

export async function transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const groq = new Groq({ apiKey });
  
  const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
  
  try {
    fs.writeFileSync(tempFilePath, audioBuffer);
    
    const fileStream = fs.createReadStream(tempFilePath);

    const transcription = await groq.audio.transcriptions.create({
      file: fileStream, 
      model: "whisper-large-v3", 
      response_format: "json",
      language: "pt", 
      temperature: 0.0,
    });

    return transcription.text;

  } catch (error) {
    console.error("Erro na transcrição Groq:", error);
    return null;
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}