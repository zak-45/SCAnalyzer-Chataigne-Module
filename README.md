# SCAnalyzer-Chataigne-Module

![image](https://user-images.githubusercontent.com/121941293/229838656-b568b3cc-4eba-4d5a-80d6-d6c85fdb1974.png)


Song analyzer, timecoded sequence creation. Actions/ Triggers execution based on segmenter/rhythm difference. 
```
Segmenter : divides a single channel of music up into structurally consistent segments.
            It returns a numeric value (the segment type) for each moment at which a new segment starts.

Rhythm difference : Calculates rhythmic features of a signal, including onsets and tempo.
                     * Difference: The difference between the onset curve and its moving average. Used as the input for peak-picking.
```

Main goal is to create automatic sequence with actions/triggers execution : could be any protocol/software already integrated into Chataigne, even external by using HTTP module for example.

It's based on these two Vamp plugins: 
```
QM Segmenter and BBC Rhythm Difference.
```

The Sonic Annotator extraction tool is necessary and is the main process that will be run. SCAnalyzer take json datas from it, interpret them and create requested triggers/mapping.


This module is deeply integrated with WLED and LedFX, so if you use the corresponding modules, it will automaticaly create actions for them.
Websocket , UDP and HTTP protocols are used, depend of the necessity and required response time.


It will also take care of the Spleeter module to generate mapping for only vocal part of the song.

WLEDAudioSync replay file feature is part of the process. You can even use more than one module if you need to send to ESP8266 and ESP32 on same time.


'Create Show' command will generate all actions/triggers/mapping with few clicks.


Links :

Chataigne : https://benjamin.kuperberg.fr/chataigne/fr

Vamp Plugins : https://vamp-plugins.org/index.html  ---> Pack : https://vamp-plugins.org/pack.html

Sonic Annotator : https://vamp-plugins.org/sonic-annotator/ --> binaries : https://code.soundsoftware.ac.uk/projects/sonic-annotator/files


