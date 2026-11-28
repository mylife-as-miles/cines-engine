#!/usr/bin/env python3
"""What is said in a take or a mix, heard by a speech model that runs here: no key, no cost.

    /root/leonxlnx/earshot/.venv/bin/python tools/hear.py out/takes/Q11_t1.mp4 [openai/whisper-base]

Prints the words in 30-second windows with rough times, and the model's own probability that a window holds no speech.
The model (Whisper, through transformers) is fetched from huggingface.co on first use, about 290 MB for the base one.

Use it for: are the lines there, word for word, once each; does anyone speak where nobody should. It does not know
invented names (it has heard "Anvil Vale" as "Angul veiled"), it says nothing about whose voice it is or how it
sounds, and over music alone it may print a stray phrase: read that against the no-speech probability.
"""
import subprocess, sys
import numpy as np
import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

SR = 16000


def main():
    path = sys.argv[1]; name = sys.argv[2] if len(sys.argv) > 2 else 'openai/whisper-base'
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32)
    proc = WhisperProcessor.from_pretrained(name); model = WhisperForConditionalGeneration.from_pretrained(name)
    voc = proc.tokenizer.get_vocab(); none = voc.get('<|nospeech|>', voc.get('<|nocaptions|>'))
    for a in range(0, max(1, int(len(x) / SR)), 28):                        # windows overlap by two seconds, so a line on a boundary is heard whole once
        seg = x[a * SR:(a + 30) * SR]
        if len(seg) < SR:
            break
        inp = proc(seg, sampling_rate=SR, return_tensors='pt')
        with torch.no_grad():
            ids = model.generate(inp.input_features, return_timestamps=True, max_new_tokens=220, language='en', task='transcribe')
            first = model(inp.input_features, decoder_input_ids=torch.tensor([[model.config.decoder_start_token_id]])).logits[0, 0]
        text = proc.batch_decode(ids, skip_special_tokens=False, decode_with_timestamps=True)[0]
        print(f'from {a} s (no speech: {float(torch.softmax(first, -1)[none]):.2f}): {text}')


if __name__ == '__main__':
    main()
