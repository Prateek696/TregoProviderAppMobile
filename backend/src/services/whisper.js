const Groq = require('groq-sdk');
const fs = require('fs');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Transcribe an audio file using Groq Whisper
// Returns the transcribed text string
async function transcribeAudio(filePath) {
  const audioStream = fs.createReadStream(filePath);

  const transcription = await groq.audio.transcriptions.create({
    file: audioStream,
    model: 'whisper-large-v3',
    response_format: 'text',
    // No language specified — auto-detect PT, EN, RO, or any mix
  });

  // Groq returns a plain string when response_format is 'text'
  return typeof transcription === 'string' ? transcription.trim() : transcription.text.trim();
}

module.exports = { transcribeAudio };
