import whisper
import json
import sys

def transcribe_audio(audio_path, output_path):
    model = whisper.load_model("base")
    result = model.transcribe(audio_path, fp16=False)
    transcription = result['text']
    segments = result['segments']

    output = {
        "transcription": transcription,
        "timestamps": segments
    }

    with open(output_path, 'w') as f:
        json.dump(output, f, indent=4)

if __name__ == "__main__":
    audio_path = sys.argv[1]
    output_path = sys.argv[2]
    transcribe_audio(audio_path, output_path)
