from pydub import AudioSegment
from pydub.effects import low_pass_filter
from glob import glob

for f in glob('*.wav'):
    a = AudioSegment.from_wav(f)
    lp = low_pass_filter(a, 1000)
    a.export(f, format='wav')
    
