
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Define __dirname for ES6 modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to extract audio
const extractAudio = (videoPath, audioPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(audioPath)
      .on('end', () => {
        console.log('Audio extraction finished');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error occurred:', err);
        reject(err);
      })
      .run();
  });
};

// Function to call Python script for transcription
const transcribeAudio = (audioPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const pythonExecutable = process.platform === 'win32' ? path.join(__dirname, 'venv', 'Scripts', 'python') : path.join(__dirname, 'venv', 'bin', 'python');
    const pythonProcess = spawn(
      pythonExecutable,
      [path.join(__dirname, 'whisper_transcribe.py'), audioPath, outputPath]
    );

    pythonProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(`Python script exited with code ${code}`);
      } else {
        resolve();
      }
    });
  });
};

// Function to analyze sentiment and add emojis
const analyzeSentimentAndAddEmojis = async (text) => {
  // Dummy sentiment analysis (replace with real sentiment analysis if needed)
  const sentimentToEmoji = {
    "POSITIVE": '😊',
    "NEGATIVE": '😢',
    "NEUTRAL": '😐'
  };
  const sentences = text.split('. ');
  // Adding dummy sentiments
  const sentiments = new Array(sentences.length).fill("NEUTRAL");
  const textWithEmojis = sentences.map((sentence, index) => `${sentence} ${sentimentToEmoji[sentiments[index]]}`).join('. ');
  return textWithEmojis;
};

// Function to create SRT file with timestamps
const createSRTFileWithTimestamps = async (text, timestamps, srtFilePath) => {
  let srtContent = '';

  timestamps.forEach((segment, index) => {
    const startTime = segment.start;
    const endTime = segment.end;
    const sentence = segment.text.trim();
    srtContent += `${index + 1}\n`;
    srtContent += `${formatTimestamp(startTime)} --> ${formatTimestamp(endTime)}\n`;
    srtContent += `${sentence}\n\n`;
  });

  fs.writeFileSync(srtFilePath, srtContent);
};

// Helper function to format timestamp
const formatTimestamp = (seconds) => {
  const milliseconds = Math.floor(seconds * 1000);
  const date = new Date(milliseconds);
  return date.toISOString().substr(11, 12).replace('.', ',');
};

// Function to add subtitles to video
const addSubtitlesToVideo = (videoPath, srtPath, outputVideoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .outputOptions('-vf', `subtitles=${srtPath}`)
      .output(outputVideoPath)
      .on('end', () => {
        console.log('Subtitles added to video');
        resolve();
      })
      .on('error', (err) => {
        console.error('Error occurred:', err);
        reject(err);
      })
      .run();
  });
};

// Example usage
const startProcessing = async () => {
  const videoFilePath = 'project.mp4';
  const audioOutputPath = 'output_audio.wav';
  const transcriptionOutputPath = 'transcription.json';

  try {
    await extractAudio(videoFilePath, audioOutputPath);
    await transcribeAudio(audioOutputPath, transcriptionOutputPath);

    const transcriptionData = JSON.parse(fs.readFileSync(transcriptionOutputPath));
    const transcription = transcriptionData.transcription;
    const timestamps = transcriptionData.timestamps;

    const textWithEmojis = await analyzeSentimentAndAddEmojis(transcription);
    await createSRTFileWithTimestamps(textWithEmojis, timestamps, 'subtitles.srt');
    await addSubtitlesToVideo(videoFilePath, 'subtitles.srt', 'output_with_subs.mp4');
  } catch (error) {
    console.error('Error:', error);
  }
};

startProcessing();
