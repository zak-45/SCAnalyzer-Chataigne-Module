[![image](https://user-images.githubusercontent.com/121941293/283798323-94bb9a2c-65b0-4d98-a483-e49d4d9b0eb1.png)](http://benjamin.kuperberg.fr/chataigne/en)

# SCAnalyzer-Chataigne-Module

![image](https://user-images.githubusercontent.com/121941293/229838656-b568b3cc-4eba-4d5a-80d6-d6c85fdb1974.png)


Song analyzer, timecoded sequence creation. Actions/ Triggers execution based on segmenter/rhythm difference. This work mainly for mp3 audio file. Should work on any OS where Chataigne / Sonic Annotator are running.
```
Segmenter : divides a single channel of music up into structurally consistent segments.
            It returns a numeric value (the segment type) for each moment at which a new segment starts.

Rhythm difference : Calculates rhythmic features of a signal, including onsets and tempo.
                     * Difference: The difference between the onset curve and its moving average.
                        Used as the input for peak-picking.
```

Main goal is to create automatic sequence with actions/triggers execution : could be any protocol/software already integrated into Chataigne, even external by using HTTP module for example.

It's based on these two [Vamp plugins](https://vamp-plugins.org/index.html): 
```
QM Segmenter.
```
see demo : https://youtu.be/vkKx9QjBUSk

```
BBC Rhythm Difference.
```
see demo : https://youtu.be/6Crcvwpx4_0

The [Sonic Annotator](https://vamp-plugins.org/sonic-annotator/) extraction tool is necessary and is the main process that will be run. SCAnalyzer take json datas from it, interpret them and create requested triggers/mapping.

As options :

This module is deeply integrated with [WLED](https://github.com/zak-45/WLED-Chataigne-Module) and [LedFX](https://github.com/zak-45/LedFX-Chataigne-Module), so if you use the corresponding modules, it can automaticaly create actions for them.
Websocket , UDP and HTTP protocols are used, depend of the necessity and required response time.


It will also take care of the [Spleeter module](https://github.com/zak-45/SpleeterGUI-Chataigne-Module) to generate mapping for only vocal part of the song. 

See: https://youtu.be/TxMugj49Dz4

[WLEDAudioSync](https://github.com/zak-45/WLEDAudioSync-Chataigne-Module) replay file feature is part of the process. You can even use more than one WLEDAudioSync module if you need to send on same time to WLED fw based on ESP8266 and WLED fw based on ESP32.


See : https://youtu.be/Fy8NGl8-Jyc


'Create Show' command will generate all actions/triggers/mapping with few clicks.


Links :

Chataigne : https://benjamin.kuperberg.fr/chataigne/fr

Vamp Plugins : https://vamp-plugins.org/index.html  ---> Pack : https://vamp-plugins.org/pack.html

Sonic Annotator : https://vamp-plugins.org/sonic-annotator/ --> binaries : https://code.soundsoftware.ac.uk/projects/sonic-annotator/files

Youtube Chanel : https://youtube.com/@NGEvents?feature=shared

## Installation :

Manual (any OS) :

Install Chataigne (v 1.9.25b2 min.) & copy this repository into :
```
<Chataigne>/modules/SCAnalyzer-Chataigne-Module-main
```
you can also install it using the custom module manager :

![img.png](img.png)



You need also this utility module to have full features: https://github.com/zak-45/SCAnalyzer_util
```
 copy to <Chataigne>/modules/SCAnalyzer_util

```


Install Sonic Annotator and the corresponding vamp plugins (see related links and documentation).


https://vamp-plugins.org/pack.html

https://code.soundsoftware.ac.uk/projects/sonic-annotator/files

## Use it : 

Go to Modules, right click, custom / SCAnalyzer

![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/7304946e-20fe-40cd-b1d8-e7ccf3233b5c)


You should see these modules loaded and on Inspector, all related params.

![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/c801a3fc-74d7-4910-a2e5-1b0fde85da0b)

``` 
On Inspector / Parameters

Audio Params 

            Global Delay : delay in ms to execute all triggers/consequences & mapping/outputs.
                           mainly used to sync actions (lights) with audio
                           in case of delay during playback(e.g use of BT  wireless speaker).
```
![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/050a4bdb-78f8-4054-856d-942d18500b5e)
```

Sonic Params 

            Run Sonic Visualizer : click to execute Sonic Visualizer app (optional)
                        // Sonic Visualiser : to be adapted by OS
                        sonicVisu = "C:/Program Files/Sonic Visualiser/Sonic Visualiser.exe";

            Sonic Annotator info : click to go web documentation
            *Sonic Annotator location : choose where sonic annotator app can be found (mandatory)
            output folder : folder to store the json datas
            *transform file : file to use when want custom params for segmenter vamp plugin 
            *Rhythm transform file : file to use when want custom params for rhythm vamp plugin
            
            * Be sure to set right folder, you can click on right icon to see if Chataigne found them                        

```
![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/1eb977bb-b290-4664-abe0-7b19f91b427b)
```

Group Params

            Link to group number : select group number to choose during automatic mapping creation.
                                    the one selected need to exist in custom variables.
            Scgroup xx (1 .. 12) : enter a group name to create an entry in custom variables.
```
![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/da1e8a06-a542-4378-8b4b-574c2ee13800)
```
     ----- Info on group feature ---------

            each group will have :
                        Variables container with one to many IP address (others should work, name need to be IPxxx).
                        Calculated params container with variables used/calculated by script and read only.

```
![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/9cfd309f-6269-429e-806a-f2ac01d19103)

```
                        in case of WLED module presence,
                        a Default WLED params container with default values that can be set.
                        These values will be used during automatic WLED actions generation.
```

![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/a76feb2f-9d8a-450a-82cb-53462a8d2017)

```

Mapping Params

            Reset mapping Max value : check to create during mapping a zero point before and after the max value.
                                      Caution, extra time needed and to use for test only.

            Split : actions will be split (in modulo of index) through all IP address
                    set in the selected group.

            Sequential : actions will be split (in sequential order & loop) through all IP address
                         set in the selected group.
```
![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/82223b13-148e-40e1-bed9-17b5de18fea6)
see : https://youtu.be/tL3g7ofz_Ts

```
            ----- Visual representation for Reset mapping Max value ------

default (without Reset mapping Max value) :
```
![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/9f71a770-e6a0-45dd-8476-b1bb609dedd0)
```
Reset mapping Max value checked :
```
![image](https://github.com/zak-45/SCAnalyzer-Chataigne-Module/assets/121941293/73c46275-21c6-4f7e-8c5e-f992ce7133ad)

```
            -------- Example for Split & Sequential -------

            During sequence playback, index value will be incremented each time during mapping output
            (from 1 ... n)
            Suppose we have 3 IP addresses in the group :
                        IP : 192.168.1.1
                        IP1: 192.168.1.2
                        IP2: 192.168.1.3

            Split case :for index value 1 the mapping output will be set to IP
                        for index value 2 the mapping output will be set to IP1
                        for index value 3 the mapping output will be set to IP2
                        for index value 4 the mapping output will be set to IP1
                        for index value 5 the mapping output will be set to IP
                        for index value 6 the mapping output will be set to IP2
                        for index value 7 the mapping output will be set to IP
                        for index value 8 the mapping output will be set to IP1
                        for index value 9 the mapping output will be set to IP2
                        for index value 10 the mapping output will be set to IP1
                        ....

            Sequential case : more simple
                         this will go from IP, IP1, IP2, IP, IP1, IP2 ....
```





