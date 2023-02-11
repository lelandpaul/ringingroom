from glob import glob
from pydub import AudioSegment

for f in glob("*.wav"):
    a = AudioSegment.from_wav(f)
    faded = a[:1500].fade_out(1000)
    if "back" in f:
        faded = faded + 6
    faded.export("output/" + f, format="wav")

for n in range(4, 8):
    for h in ["hand", "back"]:
        a = AudioSegment.from_wav(f"{n}{h}.wav")
        new_sample_rate = int(a.frame_rate * 2)
        shifted = a._spawn(a.raw_data, overrides={"frame_rate": new_sample_rate})
        faded = shifted[:1500].fade_out(1000)
        if h == "back":
            faded = faded + 6
        faded.export(f"output/e{n-3}{h}.wav", format="wav")
