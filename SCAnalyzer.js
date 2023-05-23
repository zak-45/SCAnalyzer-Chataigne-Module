/* 

author:	zak45
date:	03/11/2022
version:1.0.0

Chataigne Module for  Sound Analysis using Vamp plugin .

This work mainly for mp3 file.
Manage the segmenter plugin from QM.
Manage the Rhythm Diff plugin from BBC.
Can create corresponding actions for LedFX / WLEd if required.
Automatic show creation feature.
Play all sequences from start to end.
Delay effects max 500 ms. To help in case of BT speakers.

Default easing need to be set to Hold ( in Preferences )

*/

// Main module parameters 

var sequence = "";
var targetFile = "";
// segmenter
var shouldProcessSeg = false;
var segAnalyzerIsRunning = false;
var featureType = "";
var nSegmentTypes = "";
var neighbourhoodLimit = "";
//rhythm
var shouldProcessRhy = false;
var rhythmAnalyzerIsRunning = false;
var SubBands = "";
var Threshold = "";
var MovingAvgWindowLength = "";
var OnsetPeackWindowLength = "";
var MinBPM = "";
var MaxBPM = "";

// Sonic exe file name (required)
var SCAnalyzerExeName = "sonic-annotator.exe";

// Output file, if blank, sonic-annotator will consider to be the audio file name under audio file directory
var SCAoutputFile = "";

// Transform file name/location
var SCAtransform = "";

// Vamp Plugin name
var SCAvampPluginName = "";

// writer option with overwrite
var SCAoutputOptions = "-w jams --jams-force --jams-one-file";

// Final options
var SCAnalyzerOptions = "-d "+SCAvampPluginName+" "+SCAoutputOptions+' "'+SCAoutputFile+'" ';

// TEMP dir (required)
var tempDIR = "";

// Transform file
var origTransform = "";
var pathTransform = "";

// Ledfx test
var ledfxAuto = false;
// Ledfx Scene test
var useScenes = false;

// WLED test
var wledAuto = false;
var bkpWLEDValue = "";

// for playing all sequences in sequential way
var deltaTime = 0;
var numberToPlay = 0;
var lastsequence = 0;
var playseq = root.sequences.getItemAt(0);

// Enum param file : used to store Enum parameters modified / changed by end user
var enumFile = "SCAnalyzerEnumeffects.json";

// to made some logic only once at init
var isInit = true;

// increase timeout as we want to run Sonic in synchronus way (blocking)
script.setExecutionTimeout(300);

// Module test
var wledExist = null;
var ledfxExist = null;
var spleeterExist = null;

// Create a show
var keepJson = false;
var newAudio = "";
var moreInfo = "";
var spleeterIsRunning = false;
var createShowStep2 = false;
var createShowStep3 = false;
var createShowStep4 = false;
var createShowStep5 = false;
var spleeterOccurrence = 0;
var spleeterMaxOccurrences = 240;
  
//We create necessary entries in modules & sequences. We need OS / Sound Card  and  Sequence with Trigger / Audio.
function init()
{

	script.log("-- Custom command called init()");	

	var infos = util.getOSInfos(); 
	
	script.log("Hello "+infos.username);	
	script.log("We run under : "+infos.name);

	// we check required TMP folder
	analyzerTMP();
	script.log("Temp folder : "+tempDIR);
	if (tempDIR == "")
	{
		util.showMessageBox("Sonic Analyzer !", "TMP, TMPDIR or TEMP env variable not found", "warning", "OK");
	}
	
	// modules  test
	var osExist = root.modules.getItemWithName("OS");
	var SCexist = root.modules.getItemWithName("Sound Card");
	var SCAexist = root.modules.getItemWithName("SCAnalyzer");	
	ledfxExist = root.modules.getItemWithName("LedFX");
	wledExist = root.modules.getItemWithName("WLED");
	spleeterExist = root.modules.getItemWithName("Spleeter");

	if (SCexist.name == "soundCard" || SCAexist.name == "sCAnalyzer")
	{	
		script.log("Module Sound Card exist");
		
	} else {
			
		var newSCModule = root.modules.addItem("Sound Card"); 		
	}
	
	if (osExist.name == "os")
	{
		script.log("Module OS exist");
		
	} else {
			
		var newOSModule = root.modules.addItem("OS");
			
	}
	
	if (ledfxExist.name == "ledFX")
	{
		script.log("Module LedFX present");		
		var ledfxcontainer = local.parameters.getChild("LedFX Params");

		if (ledfxcontainer == undefined)
		{
			var newledfxcontainer = local.parameters.addContainer("LedFX Params");
			newledfxcontainer.addStringParameter("Default virtual device name","Enter default device name used for trigger consequences","ledfxdevice");
			newledfxcontainer.addEnumParameter("Associated effects","Effect to use by segment from prefix A thru L e.g.'A = power, B = blocks ,C ...' . Right click, set options to adapt","A","Power","B","Blocks","C","BPM Strobe");
			newledfxcontainer.addBoolParameter("Create actions","Checked, will create consequences using default device / associated effects ",false);
			
		} else {
			
			script.log('Nothing to do');
			root.modules.ledFX.scripts.ledFXCMD.reload.trigger();
		}
				
	} else {
		
		script.log("No module LedFX");
	}

	var wledcontainer = local.parameters.getChild("WLED Params");
	if (wledExist.name == "wled")
	{
		script.log("Module WLED present");
		wledcontainer.setCollapsed(false);
		root.modules.wled.scripts.wledcmd.reload.trigger();
		
	} else {
			
		script.log("No module WLED");
		wledcontainer.setCollapsed(true);
	} 	

	var spleetercontainer = local.parameters.getChild("Spleeter Params");
	if (spleeterExist.name == "spleeter")
	{
		script.log("Module Spleeter present");
		spleetercontainer.setCollapsed(false);
		
	} else {
			
		script.log("No module Spleeter");
		spleetercontainer.setCollapsed(true);
	}
	
	// test sequence
	var SQexist = root.sequences.getItemWithName("Sequence");
	
	if (SQexist.name == "sequence")
	{
		script.log("Sequences Sequence exist");
		
	} else {

		var newSequence = root.sequences.addItem();
		var newTSequence = newSequence.layers.addItem("Trigger");
		var newASequence = newSequence.layers.addItem("Audio");			
	}
	
	// set rate 1 second
	var rate = 1;
	script.setUpdateRate(rate);	
}

// Triggered once by second (rate = 1), sequence start from index 0, when one sequence reach end time, we switch to index +1
function update (deltaTime)
{	

	// Initialize once some Param
	if (isInit === true)
	{
		script.log('Initialize');
		// load saved Enum
		analyzerLoadenum();
		isInit = false;
	}
	
	// start long pocess on it's own thread to run in blocking mode but not block the main UI
	if (shouldProcessSeg)
	{
		shouldProcessSeg = false;
		runsegAnalyzer (sequence, targetFile, featureType, nSegmentTypes, neighbourhoodLimit);
	}

	// start long pocess on it's own thread to run in blocking mode but not block the main UI
	if (shouldProcessRhy)
	{
		shouldProcessRhy = false;
		runrhythmAnalyzer (sequence, targetFile, SubBands, Threshold, MovingAvgWindowLength, OnsetPeackWindowLength, MinBPM, MaxBPM);
	}

	if (spleeterIsRunning) 
	{
		checkSpleeter();
	}
	
	if (createShowStep2) 
	{
		checkStep1();
		
	} else if (createShowStep3)	{
		
		checkStep2();
		
	} else if (createShowStep4) {
		
		checkStep3();
		
	} else if (createShowStep5) {
		
		checkStep4();
		
	} else if (createShowLast)  {
		
		checkLast();
	}	

	// Play all enabled sequences
	if (lastsequence < numberToPlay) 
	{
		if (playseq.enabled.get() == 1) 
		{
			if (playseq.currentTime.get() == playseq.totalTime.get())
			{
				script.log("Reach end of time");
				lastsequence += 1;
				if (lastsequence  == numberToPlay)
				{
					numberToPlay = 0;
					script.log("End Sequences");				
					
				} else {
					
					playseq = root.sequences.getItemAt(lastsequence);
					script.log("Sequence to play : " +playseq.name);				
				}
				
			} else if (playseq.isPlaying.get() == 0)

			{
				playseq.play.trigger();
				script.log("Play  sequence : " +playseq.name);
			}
			
		} else {

			script.log("Sequence to bypass : " +playseq.name);							
			lastsequence += 1;
			playseq = root.sequences.getItemAt(lastsequence);
			if (lastsequence  == numberToPlay)
			{
				numberToPlay = 0;
				script.log("End Sequences");				
				
			}				
		}
	}
}

// execution depend on the user response
function messageBoxCallback (id, result)
{
	script.log("Message box callback : "+id+" : "+result); 
	
	if (id == "msgDefaultEffects")
	{
		//script.log('defaultEffects Call back');

		if (result == "1")
		{
			script.log('Delete all effects and loading default one');
			analyzerLoaddefault();			
		}
	}	
}

function scriptParameterChanged (param)
{
	script.log("Script Param changed : "+param.name);	
}

function moduleParameterChanged (param)
{
	script.log("Module Param changed : "+param.name);
	
	if ( isInit === false)
	{
		if (param.name == "transformFile")
		{
			origTransform = param.getAbsolutePath();
			
		} else if (param.name == "createActions") {
			
			if (ledfxExist.name != "ledFX")
			{	
				util.showMessageBox("Sonic Analyzer !", "No LEDFX Module , maybe reload the script....", "info", "Got it");
			}
			
			ledfxAuto = param.get();
			
		} else if (param.name == "createWLEDActions") {
			
			if (wledExist.name != "wled")
			{
				util.showMessageBox("Sonic Analyzer !", "No WLED Module , maybe reload the script....", "info", "Got it");
			}
			
			wledAuto = param.get();
			
		} else if (param.name == "createVocal") {
			
			if (spleeterExist.name != "spleeter")
			{
				util.showMessageBox("Sonic Analyzer !", "No Spleeter Module , maybe reload the script....", "info", "Got it");
			}
			
		} else if (param.name == "wledLive") {
			
			wledAuto = param.get();
			
		} else if (param.name == "sonicAnnotatorInfo") {
			
			util.gotoURL('https://vamp-plugins.org/sonic-annotator/');
			
		} else if (param.name == "associatedEffects") {
			
			util.writeFile(enumFile,local.parameters.ledFXParams.associatedEffects.getAllOptions(),true);	
			
		} else if (param.name == "loadDefault")	{
			
			util.showYesNoCancelBox("msgDefaultEffects", "Confirm ?", "Do you really want to load default effects ?", "question", "Yes", "No", "Cancel...");
			
		} else if (param.name.contains("wledGroup")){
			
			wledCustomVariables(param.name);
			
		} else if (param.name == "activateColors") {
			
			activateColors();
				
		} else if (param.name == "deActivateColors") {
			
			deActivateColors();
			
		} else if (param.name == "resetEffects") {
			
			resetEffects();
			
		} else if (param.name == "resetPalettes") {
			
			resetPalettes();
		}
	}
}

function moduleValueChanged (value) 
{	
	script.log("Module value changed : "+value);	
}

// check to see if something to do
function segAnalyzer (insequence, intargetFile, infeatureType, innSegmentTypes, inneighbourhoodLimit)
{
	segAnalyzerIsRunning = true;

	if (insequence == "" && intargetFile == "" )
	{
		script.log("Nothing to do !!");
		segAnalyzerIsRunning = false;
		
	} else {
	
	sequence = insequence;
	targetFile = intargetFile;
	featureType = infeatureType;
	nSegmentTypes = innSegmentTypes;
	neighbourhoodLimit = inneighbourhoodLimit;
	
	util.showMessageBox("Sonic Analyzer ! QM-SEGMENTER ", "This could take a while ...."+moreInfo, "info", "Got it");
	
	shouldProcessSeg = true;
		
	}
}

// Run Sonic: wait and read received data from Segmenter		
function runsegAnalyzer (sequence, targetFile, featureType, nSegmentTypes, neighbourhoodLimit) 
{
	segAnalyzerIsRunning = true;
	
	// Sonic executable
	SCAnalyzerExeName = local.parameters.sonicParams.sonicAnnotatorLocation.getAbsolutePath();
	// check to see if Sonic exe exist
	if (util.fileExists(SCAnalyzerExeName) == 1)
	{
		// transform file to read
		origTransform = local.parameters.sonicParams.transformFile.getAbsolutePath();
		// plugin name
		SCAvampPluginName = "vamp:qm-vamp-plugins:qm-segmenter:segmentation";
		// result output file
		SCAoutputFile = local.parameters.sonicParams.outputFile.getAbsolutePath();
		// check to see if transform file is necessary
		if ((featureType != 1 || nSegmentTypes != 10 || neighbourhoodLimit != 4) && (origTransform != ""))
		{
			script.log("Using transform file : "+origTransform);
			segAnalyzerTransform (featureType, nSegmentTypes, neighbourhoodLimit);				
			SCAnalyzerOptions = "-t "+'"'+pathTransform+'"'+" "+SCAoutputOptions+' "'+SCAoutputFile+'" ';				
			
		} else {
			
			script.log("Using default parameters for the plugin, if you want to customize, select a transform");
			SCAnalyzerOptions = "-d "+SCAvampPluginName+" "+SCAoutputOptions+' "'+SCAoutputFile+'" ';				
			
		}

		// we have some work to do, target first else file 
		if (sequence.contains("/"))
		{
			script.log('Retreive data from sequence : ' + sequence);
			var splitseq = sequence.split("/");
			var sequenceName = splitseq[2];
			var audioName = splitseq[4];
			// set newSequence to existing one
			var newSequence =  root.sequences.getItemWithName(sequenceName);
			// set newAudio to existing one 
			newAudio =  newSequence.layers.getItemWithName(audioName);
			// targetFile
			var targetFile = newAudio.clips.audioClip.filePath.getAbsolutePath();
			script.log('Target file  from sequence : ' + targetFile);				
					
		} else if (targetFile != ""){

			script.log('Create new sequence from filename :'+targetFile);
			// create new sequence / audio clip 
			var newSequence =  root.sequences.addItem('Sequence');	
			newAudio =  newSequence.layers.addItem('Audio');
			var newAudioClip =  newAudio.clips.addItem('audioClip');	
			newAudioClip.filePath.set(targetFile);
			
		} else {
			
			script.logError("Something wrong on segAnalyzer....");
			return;
		}
		
	
		// if output file not set, we set it as audio clip file name 
		if (SCAoutputFile == "")
		{						
			SCAoutputFile =  targetFile.replace(".mp3", "").replace(".wav", "") + ".json";
		}
		
		// Run only if necessary
		if (keepJson === false)
		{
			//set output file to blank to avoid reading old values in case sonic-annotator not run as should.
			util.writeFile(SCAoutputFile, "", true);
			
			var exeCMD = '"'+SCAnalyzerExeName+'" '+SCAnalyzerOptions+'"'+targetFile+'"';
			script.log('command to run : '+ exeCMD);
			
			// we execute the Sonic-annotator in blocking mode
			var launchresult = root.modules.os.launchProcess(exeCMD, true);
			script.log("Sonic Analyzer return code : "+launchresult);
			if (launchresult == "")
			{
				util.showMessageBox("Sonic Analyzer !", "Something wrong....", "warning", "OK");
				return;
			}				
		}

		// read the result 
		script.log("we read from : " + SCAoutputFile);
		var SCAJSONContent = util.readFile(SCAoutputFile,true);
		
		// set flag for ledfx and/or wled auto actions creation
		var ledfxExist = root.modules.getItemWithName("LedFX");
		if (ledfxExist.name == "ledFX")
		{
			ledfxAuto = local.parameters.ledFXParams.createActions.get();		
			useScenes = local.parameters.ledFXParams.useScenes.get();		
		}
		var wledExist = root.modules.getItemWithName("WLED");			
		if (wledExist.name == "wled")
		{
			wledAuto = local.parameters.wledParams.createWLEDActions.get();						
		}
		
		// create the container for result values
		local.values.removeContainer("Vamp plugin");
		var newContainer = local.values.addContainer("Vamp plugin");

		// create Vamp plugin values
		newContainer.addStringParameter("File Name","",SCAJSONContent.file_metadata.identifiers.filename);
		newContainer.addStringParameter("duration","",SCAJSONContent.file_metadata.duration);
		newContainer.addStringParameter("artist","",SCAJSONContent.file_metadata.artist);
		newContainer.addStringParameter("title","",SCAJSONContent.file_metadata.title);

		// only mp3 file
		if (targetFile.contains(".mp3")){
			newSequence.setName(SCAJSONContent.file_metadata.artist);
		}
		
		newAudio.setName(SCAJSONContent.file_metadata.identifiers.filename);
		
		// create Triggers from the json result file 
		var newLayersTrigger =  newSequence.layers.addItem('Trigger');
		var prefix = "QM-";
		if (mappEffect == 1)
		{
			prefix = "Calc-"+mapGroup;
		}
		newLayersTrigger.setName("Triggers : "+ prefix +SCAJSONContent.annotations[0].annotation_metadata.annotator.output_id);
		newLayersTrigger.triggerWhenSeeking.set(false);
		
		for (var i = 0; i < SCAJSONContent.annotations.length; i += 1)
		{
			
			// set annotations in values
			var newannotationsContainer = newContainer.addContainer("annotations");		
			newannotationsContainer.addStringParameter("tools","",SCAJSONContent.annotations[i].annotation_metadata.annotation_tools);
			newannotationsContainer.addStringParameter("data source","",SCAJSONContent.annotations[i].annotation_metadata.data_source);
			// set annotator in values
			var newannotatorContainer = newannotationsContainer.addContainer("annotator");
			newannotatorContainer.addStringParameter("plugin_id ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.plugin_id);
			newannotatorContainer.addStringParameter("output_id ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.output_id);
			newannotatorContainer.addStringParameter("plugin_version ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.plugin_version);
			newannotatorContainer.addStringParameter("step_size ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.step_size);
			newannotatorContainer.addStringParameter("block_size ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.block_size);				
			newannotatorContainer.addStringParameter("sample_rate ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.sample_rate);
			newannotatorContainer.addStringParameter("transform_id ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.transform_id);
			// set parameters in values
			var newparametersContainer = newannotatorContainer.addContainer("parameters");
			newparametersContainer.addStringParameter("featureType ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.featureType);
			newparametersContainer.addStringParameter("nSegmentTypes ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.nSegmentTypes);
			newparametersContainer.addStringParameter("neighbourhoodLimit ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.neighbourhoodLimit);
			
			// set vamp plugin parameters in Trigger header (will not be saved)
			var tparam1 = newLayersTrigger.addStringParameter("featureType ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.featureType);
			tparam1.setAttribute("readOnly", true);
			tparam1.setAttribute("saveValueOnly", false);
			var tparam2 = newLayersTrigger.addStringParameter("nSegmentTypes ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.nSegmentTypes);
			tparam2.setAttribute("readOnly", true);
			tparam2.setAttribute("saveValueOnly", false);
			var tparam3 = newLayersTrigger.addStringParameter("neighbourhoodLimit ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.neighbourhoodLimit);
			tparam3.setAttribute("readOnly", true);
			tparam3.setAttribute("saveValueOnly", false);
		
			script.log("Occurence : "+i+" data length : "+SCAJSONContent.annotations[i].data.length);
			
			var newColor = [];
			var newEffect = 0;
			var newPalette = 0;
			
			// main Triggers / cues loop 
			for (var j = 0; j < SCAJSONContent.annotations[i].data.length; j += 1)
			{

				// no cue if create triggers for color/effect					
				if (mappEffect != 1){
					
					// set Cue time /name if cue not already exist for this time
					var cueExist = newSequence.cues.getItemWithName(j);
					
					if (cueExist == "")
					{
						var newCue = newSequence.cues.addItem();
						newCue.time.set(SCAJSONContent.annotations[i].data[j].time);
						newCue.setName(j);	
						
					} else {
						
						if (cueExist.time.get() != SCAJSONContent.annotations[i].data[j].time)
						{
							var newCue = newSequence.cues.addItem();
							newCue.time.set(SCAJSONContent.annotations[i].data[j].time);
							newCue.setName(j);								
						}
					}
				}
				
				// create new Trigger
				var newTrigger = newLayersTrigger.triggers.addItem();
				
				// set main Trigger values
				newTrigger.time.set(SCAJSONContent.annotations[i].data[j].time);			
				newTrigger.flagY.set(100000%j);
				newTrigger.setName(SCAJSONContent.annotations[i].data[j].label);
			
				// set Trigger color and create action for ledFX / WLED if requested, depend on segment name
				if (SCAJSONContent.annotations[i].data[j].label.contains("A"))
				{
					//newTrigger.color.set([1,0,0,1]);	
					newColor = local.parameters.defaultColors.segmentA.get();
					newTrigger.color.set(newColor);
					newEffect = local.parameters.defaultEffects.effectA.get();
					newPalette = local.parameters.defaultPalettes.paletteA.get();
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("A");
						
					} else {
						// Create init consequences put WLED on live mode if requested
						if (j == 0 && (wledExist.name == "wled") && ledfxAuto && (local.parameters.wledParams.wledLive.get() == 1))
						{
							analyzerWLEDInitConseq();
						
							// put delay between actions							
							newTrigger.consequences.stagger.set(.500);
						}
						
						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);	
						} 
						if (ledfxAuto)
						{
							analyzerLedFXConseq("A");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("B")) {
					//newTrigger.color.set([1,.30,1,1]);			
					newColor = local.parameters.defaultColors.segmentB.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectB.get();
					newPalette = local.parameters.defaultPalettes.paletteB.get();						
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("B");
						
					} else {


						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("B");					
						}						
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("C")) {
					
					//newTrigger.color.set([1,.11,.81,1]);			
					newColor = local.parameters.defaultColors.segmentC.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectC.get();
					newPalette = local.parameters.defaultPalettes.paletteC.get();						
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("C");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("C");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("D")) {
					//newTrigger.color.set([.1,.1,1,1]);			
					newColor = local.parameters.defaultColors.segmentD.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectD.get();
					newPalette = local.parameters.defaultPalettes.paletteD.get();						
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("D");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("D");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("E")) {
					//newTrigger.color.set([.1,.1,.1,1]);
					newColor = local.parameters.defaultColors.segmentE.get();
					newTrigger.color.set(newColor);
					newEffect = local.parameters.defaultEffects.effectE.get();
					newPalette = local.parameters.defaultPalettes.paletteE.get();						

					if (mappEffect == 1)
					{
						analyzerMapConseq("E");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("E");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("F")) {
					
					//newTrigger.color.set([.1,.01,.51,1]);
					newColor = local.parameters.defaultColors.segmentF.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectF.get();
					newPalette = local.parameters.defaultPalettes.paletteF.get();
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("F");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("F");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("G")) {
					
					//newTrigger.color.set([1,.15,.51,1]);
					newColor = local.parameters.defaultColors.segmentG.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectG.get();
					newPalette = local.parameters.defaultPalettes.paletteG.get();
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("G");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("G");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("H")) {
					
					//newTrigger.color.set([.1,.11,.61,1]);
					newColor = local.parameters.defaultColors.segmentH.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectH.get();
					newPalette = local.parameters.defaultPalettes.paletteH.get();						
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("H");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("H");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("I")) {
					
					//newTrigger.color.set([0,.81,0,1]);
					newColor = local.parameters.defaultColors.segmentI.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectI.get();
					newPalette = local.parameters.defaultPalettes.paletteI.get();						
							
					if (mappEffect == 1)
					{
						analyzerMapConseq("I");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("I");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("J")) {
					
					//newTrigger.color.set([.51,0,.01,1]);
					newColor = local.parameters.defaultColors.segmentJ.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectJ.get();
					newPalette = local.parameters.defaultPalettes.paletteJ.get();						
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("J");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("J");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("K")) {
					
					//newTrigger.color.set([.51,.10,.01,1]);
					newColor = local.parameters.defaultColors.segmentK.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectK.get();
					newPalette = local.parameters.defaultPalettes.paletteK.get();						
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("K");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("K");					
						}
					}
					
				} else if (SCAJSONContent.annotations[i].data[j].label.contains("L")) {
					
					//newTrigger.color.set([.51,.20,.01,1]);
					newColor = local.parameters.defaultColors.segmentL.get();
					newTrigger.color.set(newColor);						
					newEffect = local.parameters.defaultEffects.effectL.get();
					newPalette = local.parameters.defaultPalettes.paletteL.get();						
					
					if (mappEffect == 1)
					{
						analyzerMapConseq("L");
						
					} else {

						// Create consequences priority to WLED 
						if (wledAuto)
						{
							analyzerWLEDConseq(newColor,newEffect,newPalette);
							
						}
						if (ledfxAuto)
						{
							analyzerLedFXConseq("L");					
						}
					}
					
				} else {
					
					script.log("UNKNOWN Segment");
				}
			}
		}
		
	} else {
		
		script.log("Sonic exe not found");
		
		util.showMessageBox("Sonic Analyzer !", "sonic-annotator not found", "warning", "OK");
	
	}
	
	segAnalyzerIsRunning = false;
}

// check to see if something to do
function rhythmAnalyzer (insequence, intargetFile, inSubBands, inThreshold, inMovingAvgWindowLength, inOnsetPeackWindowLength, inMinBPM, inMaxBPM)
{
	rhythmAnalyzerIsRunning = true;
	
	if (insequence == "" && intargetFile == "" )
	{
		script.log('Nothing to do');
		rhythmAnalyzerIsRunning = false;
		
	} else {
	
		sequence = insequence;
		targetFile = intargetFile;
		SubBands = inSubBands;
		Threshold = inThreshold;
		MovingAvgWindowLength = inMovingAvgWindowLength;
		OnsetPeackWindowLength = inOnsetPeackWindowLength;
		MinBPM = inMinBPM;
		MaxBPM = inMaxBPM;	
		
		util.showMessageBox("Sonic Analyzer ! BBC-RHYTHM ", "This could take a while ...." + moreInfo, "info", "Got it");

		shouldProcessRhy = true;	
	}
}

// Run Sonic: wait and read received data from Rhythm Difference / create Mapping for WLED
function runrhythmAnalyzer (sequence, targetFile, SubBands, Threshold, MovingAvgWindowLength, OnsetPeackWindowLength, MinBPM, MaxBPM)
{
	rhythmAnalyzerIsRunning = true;
	
	// Sonic executable
	SCAnalyzerExeName = local.parameters.sonicParams.sonicAnnotatorLocation.getAbsolutePath();
	// check to see if Sonic exe exist
	if (util.fileExists(SCAnalyzerExeName) == 1)
	{
		// transform file to read
		origTransform = local.parameters.sonicParams.rhythmTransformFile.getAbsolutePath();
		// plugin name
		SCAvampPluginName = "vamp:bbc-vamp-plugins:bbc-rhythm:diff";			
		// result output file
		SCAoutputFile = local.parameters.sonicParams.outputFile.getAbsolutePath();
		// check to see if transform file is necessary
		if ((SubBands != 7 || Threshold != 1 || MovingAvgWindowLength != 200 || OnsetPeackWindowLength != 6 || MinBPM != 12 || MaxBPM != 300) && (origTransform != ""))
		{
			script.log("Using transform file : "+origTransform);
			rhythmAnalyzerTransform (SubBands, Threshold, MovingAvgWindowLength, OnsetPeackWindowLength, MinBPM, MaxBPM);				
			SCAnalyzerOptions = "-t "+'"'+pathTransform+'"'+" "+SCAoutputOptions+' "'+SCAoutputFile+'" ';				
			
		} else {
			
			script.log("Using default parameters for the plugin, if you want to customize, select a transform");
			SCAnalyzerOptions = "-d "+SCAvampPluginName+" "+SCAoutputOptions+' "'+SCAoutputFile+'" ';				
			
		}

		// we have some work to do, target first else file 
		if (sequence.contains("/"))
		{
			script.log('Retreive data from sequence : ' + sequence);
			var splitseq = sequence.split("/");
			var sequenceName = splitseq[2];
			var audioName = splitseq[4];
			// set newSequence to existing one
			var newSequence =  root.sequences.getItemWithName(sequenceName);
			// set newAudio to existing one 
			newAudio =  newSequence.layers.getItemWithName(audioName);
			// targetFile
			var targetFile = newAudio.clips.audioClip.filePath.getAbsolutePath();
			script.log('Target file  from sequence : ' + targetFile);								
					
		} else if (targetFile != ""){

			script.log('Create new sequence from filename :'+targetFile);
			// create new sequence / audio clip 
			var newSequence =  root.sequences.addItem('Sequence');	
			newAudio =  newSequence.layers.addItem('Audio');
			var newAudioClip =  newAudio.clips.addItem('audioClip');	
			newAudioClip.filePath.set(targetFile);
			
		} else {
			
			script.logError("Something wrong on rhythmAnalyzer....");
			return;
		}
		
		
		// if output file not set, we set it as audio clip file name 
		if (SCAoutputFile == "")
		{						
			SCAoutputFile =  targetFile.replace(".mp3", "").replace(".wav", "") + ".json";
		}
		
		if (keepJson === false)
		{
			//set output file to blank to avoid reading old values in case sonic-annotator not run as should.
			util.writeFile(SCAoutputFile, "", true);
			
			var exeCMD = '"'+SCAnalyzerExeName+'" '+SCAnalyzerOptions+'"'+targetFile+'"';
			script.log('command to run : '+ exeCMD);
			// we execute the Sonic-annotator in blocking mode
			var launchresult = root.modules.os.launchProcess(exeCMD, true);
			script.log("Sonic Analyzer return code : "+launchresult);
			if (launchresult == "")
			{
				util.showMessageBox("Sonic Analyzer !", "Something wrong....", "warning", "OK");
				return;
			}				
		}

		// read the result 
		script.log("we read from : " + SCAoutputFile);
		var SCAJSONContent = util.readFile(SCAoutputFile,true);
		
		// create the container for result values
		local.values.removeContainer("Vamp plugin");
		var newContainer = local.values.addContainer("Vamp plugin");

		// create Vamp plugin values
		newContainer.addStringParameter("File Name","",SCAJSONContent.file_metadata.identifiers.filename);
		newContainer.addStringParameter("duration","",SCAJSONContent.file_metadata.duration);
		newContainer.addStringParameter("artist","",SCAJSONContent.file_metadata.artist);
		newContainer.addStringParameter("title","",SCAJSONContent.file_metadata.title);

		// only if mp3 file 
		if (targetFile.contains(".mp3")){
			newSequence.setName(SCAJSONContent.file_metadata.artist);
		}
		newAudio.setName(SCAJSONContent.file_metadata.identifiers.filename);
		
		// create Mapping from the json result file 
		var newLayersMapping =  newSequence.layers.addItem('Mapping');
		newLayersMapping.automation.range.set(0,7);
		newLayersMapping.setName("Mapping: BBC-"+ SCAJSONContent.annotations[0].annotation_metadata.annotator.output_id);
		
		// set flag for wled auto actions creation
		var wledExist = root.modules.getItemWithName("WLED");			
		if (wledExist.name == "wled")
		{
			wledAuto = local.parameters.wledParams.createWLEDActions.get();						
		}
		
		for (var i = 0; i < SCAJSONContent.annotations.length; i += 1)
		{
			
			// set annotations in values
			var newannotationsContainer = newContainer.addContainer("annotations");		
			newannotationsContainer.addStringParameter("tools","",SCAJSONContent.annotations[i].annotation_metadata.annotation_tools);
			newannotationsContainer.addStringParameter("data source","",SCAJSONContent.annotations[i].annotation_metadata.data_source);
			// set annotator in values
			var newannotatorContainer = newannotationsContainer.addContainer("annotator");
			newannotatorContainer.addStringParameter("plugin_id ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.plugin_id);
			newannotatorContainer.addStringParameter("output_id ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.output_id);
			newannotatorContainer.addStringParameter("plugin_version ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.plugin_version);
			newannotatorContainer.addStringParameter("step_size ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.step_size);
			newannotatorContainer.addStringParameter("block_size ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.block_size);				
			newannotatorContainer.addStringParameter("sample_rate ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.sample_rate);
			newannotatorContainer.addStringParameter("transform_id ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.transform_id);
			// set parameters in values
			var newparametersContainer = newannotatorContainer.addContainer("parameters");
			newparametersContainer.addStringParameter("featureType ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.featureType);
			newparametersContainer.addStringParameter("nSegmentTypes ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.nSegmentTypes);
			newparametersContainer.addStringParameter("neighbourhoodLimit ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.neighbourhoodLimit);
			
			// set vamp plugin parameters in Mapping header Parameters (will not be saved)
			var tparam1 = newLayersMapping.mapping.parameters.addStringParameter("featureType ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.featureType);
			tparam1.setAttribute("readOnly", true);
			tparam1.setAttribute("saveValueOnly", false);
			var tparam2 = newLayersMapping.mapping.parameters.addStringParameter("nSegmentTypes ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.nSegmentTypes);
			tparam2.setAttribute("readOnly", true);
			tparam2.setAttribute("saveValueOnly", false);
			var tparam3 = newLayersMapping.mapping.parameters.addStringParameter("neighbourhoodLimit ","",SCAJSONContent.annotations[i].annotation_metadata.annotator.parameters.neighbourhoodLimit);
			tparam3.setAttribute("readOnly", true);
			tparam3.setAttribute("saveValueOnly", false);
		
			script.log("Occurence : "+i+" data length : "+SCAJSONContent.annotations[i].data.length);
			
			var pointsnumber = 0;
			var groupName = local.parameters.wledParams.associateGroup.get();
			var wledGroupNamevar = local.parameters.getChild("wledParams/"+groupName);
			if (wledGroupNamevar.name != "undefined")
			{
				var wledGroupName = wledGroupNamevar.get();
				
			} else {
				
				var wledGroupName = "NotSet";
				
			}
			var groupExist = root.customVariables.getItemWithName(wledGroupName);
			
			// Create mapping output (action)
			//
			// For Colors Loop
			if (local.parameters.defaultColors.loopColors.get() == 1)
			{
				// root.modules.sCAnalyzer.parameters.wledParams.associateGroup
				newLayersMapping.setName("MapColWLED: "+ groupName);
				// group need to exist
				if (groupName != 0  && groupExist.name != "undefined") 
				{
					createColorMapping(groupName);
					
				} else { 
				
					script.log("Group not set for  :" + groupName);
				
				}

			}				
			// For WLED
			if (wledAuto)
			{
				// root.modules.sCAnalyzer.parameters.wledParams.associateGroup
				var split = local.parameters.wledParams.split.get();
				var ps = local.parameters.wledParams.preset.get();
				newLayersMapping.setName("MapWLED: "+ groupName);

				if (groupName != 0  && groupExist.name != "undefined")
				{
					
					analyzerWLEDMapping(groupName, split, ps);
					
				} else {
					
					script.log("Group not set for  :" + groupName);
					
				}
			}
			
			// main mapping points loop creation (keys)
			for (var j = 0; j < SCAJSONContent.annotations[i].data.length; j += 1)
			{
			
				// create new point
				// 0.0 for the first one.
				if (j == 0)
				{
					var newKey = newLayersMapping.automation.addKey(0,0);
					pointsnumber += 1;						
				}
				// select only value not egal to zero
				else if (SCAJSONContent.annotations[i].data[j].value != 0)
				{
					// test to see if need to create zero value before and after (this increase time x3)
					var createmin = local.parameters.wledParams.resetMappingMaxValue.get();
					
					if (SCAJSONContent.annotations[i].data[j-1].value == 0) 							
					{
						if (createmin == 1)
						{
							var newKey = newLayersMapping.automation.addKey(SCAJSONContent.annotations[i].data[j-1].time,0);
							pointsnumber += 1;								
						}
					}
					
					// retreive max value from rhythm difference
					if (SCAJSONContent.annotations[i].data[j].value > SCAJSONContent.annotations[i].data[j-1].value ) 
					{
						var maxvalue = SCAJSONContent.annotations[i].data[j].value;
						var maxtime = SCAJSONContent.annotations[i].data[j].time;
					}
					
					if (SCAJSONContent.annotations[i].data[j+1].value == 0) 
					{
						var newKey = newLayersMapping.automation.addKey(maxtime,maxvalue);
						pointsnumber += 1;
						if (createmin == 1)
						{
							var newKey = newLayersMapping.automation.addKey(SCAJSONContent.annotations[i].data[j+1].time,0);
							pointsnumber += 1;								
						}
					}						
				}					
			}
		}
		
		script.log("Total number of points created : " + pointsnumber);

	} else {
		
		script.log("Sonic annotator app not found");
		
		util.showMessageBox("Sonic Analyzer !", "sonic-annotator not found", "warning", "OK");
	
	}
	
	rhythmAnalyzerIsRunning = false;
}

// Create Colors / Effects Based on segmentation... could be used by Mappings.
function calcColorEffect (sequence, mapGroup, featureType, nSegmentTypes, neighbourhoodLimit)
{
	script.log("We create colors/effects based on Segmenter");

	// file is nul, we use only sequence Param
	var targetFile = "";
	var mappEffect = true;
	segAnalyzer(sequence, targetFile, featureType, nSegmentTypes, neighbourhoodLimit);
	
}

// this will create the corresponding LedFX actions (scene activation) for triggers depending on the segment name
function analyzerLedFXConseq (segmentName)
{
	var conseq = newTrigger.consequences.addItem("Consequence");
	newTrigger.consequences.delay.set(local.parameters.audioParams.effectsDelay.get()/1000);
	
	if (useScenes)
	{
		conseq.setCommand("ledFX","LedFX-Scene","DeActivate ");
	} else {
		conseq.setCommand("ledFX","LedFX-Virtual","Apply Effect ");
	}
	var parcmd = conseq.getChild("command");
	if (useScenes)
	{
		local.parameters.ledFXParams.associatedScenes.set(segmentName);
		var myscene = local.parameters.ledFXParams.associatedScenes.get();
		if (myscene == "") {			
			myscene = local.parameters.ledFXParams.defaultSceneName.get();		
		}
		parcmd.scenename.set(myscene);
	} else {
		parcmd.devicename.set(local.parameters.ledFXParams.defaultVirtualDeviceName.get());
		local.parameters.ledFXParams.associatedEffects.set(segmentName);
		parcmd.effect.set(local.parameters.ledFXParams.associatedEffects.get());
	}
}

// For one specific mapGroup , this will create the corresponding action (consequence) for triggers depending on the segment name: can be used by Mapping
function analyzerMapConseq (segmentName)
{
	
	var numberofactions = 0;
	
	if (mapGroup != 0)
	{
		// check if custom variables exist for this group 
		// retreive groupe name 
		var wledGroupNamevar = local.parameters.getChild("wledParams/"+mapGroup);
		var wledGroupName = wledGroupNamevar.get();
		
	} else {
		
		var wledGroupName = "NotSet";
		
	}
	
	var groupExist = root.customVariables.getItemWithName(wledGroupName);
	
	if (groupExist.name != "undefined") 
	{
		if (newColor[3] == 1)
		{
			// COLOR
			var conseq = newTrigger.consequences.addItem("Consequence");
			newTrigger.consequences.delay.set(local.parameters.audioParams.effectsDelay.get()/1000);			
			conseq.setCommand("generic","","Set Parameter Value");
			
			var parcmd = conseq.getChild("command");
			parcmd.target.set("customVariables/"+ wledGroupName + "/calcWLEDParams/maincolor");
			parcmd.component.set("All");
			parcmd.operator.set("Equals");
			var parcmdvalue = parcmd.getChild("value");
			parcmdvalue.set(newColor);
			
			numberofactions += 1;
			
		}
		
		if (newEffect != -1)
		{
			// EFFECT
			var conseq = newTrigger.consequences.addItem("Consequence");
			newTrigger.consequences.delay.set(local.parameters.audioParams.effectsDelay.get()/1000);			
			conseq.setCommand("generic","","Set Parameter Value");
			
			var parcmd = conseq.getChild("command");
			parcmd.target.set("customVariables/"+ wledGroupName + "/calcWLEDParams/effectNumber");
			parcmd.component.set("All");
			parcmd.operator.set("Equals");
			var parcmdvalue = parcmd.getChild("value");
			parcmdvalue.set(newEffect);

			numberofactions += 1;

			if (numberofactions > 1)
			{
				// put delay between actions							
				newTrigger.consequences.stagger.set(.500);		
			}
			
		}

	} else {
		
		script.log("Group do not exist for " + mapGroup);
		
	}
}


// this will create the corresponding action (consequence) for WLED : initial when ledfxAuto is true 
function analyzerWLEDInitConseq ()
{
	var conseq = newTrigger.consequences.addItem("Consequence");
	conseq.setCommand("WLED","WLED","WLED On-Off");

	var parcmd = conseq.getChild("command");
	parcmd.live.set(true);	
	parcmd.on.set(true);
} 

function analyzerWLEDConseq (newColor,newEffect,newPalette)
{
	var numberofactions = 0;
	
	// this will create the corresponding action (consequence) for WLED : color
	if (newColor[3] == 1)
	{
		var conseq = newTrigger.consequences.addItem("Consequence");
		conseq.setCommand("WLED","WLED","WLED Color");
		newTrigger.consequences.delay.set(local.parameters.audioParams.effectsDelay.get()/1000);
		
		var parcmd = conseq.getChild("command");
		parcmd.wledcolor.set(newColor);
		numberofactions += 1;
		
		if (local.parameters.wledParams.allIP.get() == 1 && local.parameters.wledParams.associateGroup.get() != 0)
		{
			AnalyzerWLEDWSLoopColor(groupName,newColor);
		}
	}
	
	// this will create the corresponding action (consequence) for WLED : effect
	if (newEffect != -1)
	{
		var conseq = newTrigger.consequences.addItem("Consequence");
		conseq.setCommand("WLED","WLED","WLED Effect");
		newTrigger.consequences.delay.set(local.parameters.audioParams.effectsDelay.get()/1000);
		
		var parcmd = conseq.getChild("command");
		parcmd.wledeffect.set(newEffect);	
		numberofactions += 1;
		
		if (local.parameters.wledParams.allIP.get() == 1 && local.parameters.wledParams.associateGroup.get() != 0)
		{
			AnalyzerWLEDWSLoopEffect(groupName,newEffect);
		}		
	}

	// this will create the corresponding action (consequence) for WLED : palette
	if (newPalette != -1)
	{
		var conseq = newTrigger.consequences.addItem("Consequence");
		conseq.setCommand("WLED","WLED","WLED Palette");
		newTrigger.consequences.delay.set(local.parameters.audioParams.effectsDelay.get()/1000);		

		var parcmd = conseq.getChild("command");
		parcmd.palette.set(newPalette);	
		numberofactions += 1;
		
		if (local.parameters.wledParams.allIP.get() == 1 && local.parameters.wledParams.associateGroup.get() != 0)
		{
			AnalyzerWLEDWSLoopPalette(groupName,newPalette);
		}		
	}

	if (numberofactions > 1)
	{
		// put delay between actions							
		newTrigger.consequences.stagger.set(.500);		
	}

}
 
// Mapping from WLED
function analyzerWLEDMapping (groupName, split, ps)
{
	
	var grp = local.parameters.getChild("wledParams/"+ groupName);		
	var mapin = root.customVariables.getItemWithName(grp.get());
	var testWS = local.parameters.wledParams.useWebSocket.get();

	script.log("Group name for Mapping : " + mapin.name);

	if (mapin != undefined)
	{
		// retreive variables
		var additionalIP = mapin.variables.getItems();
		script.log(additionalIP.length);
		
		if (additionalIP)
		{
			script.log("WLED -- Number of additional IP address : "+additionalIP.length);
			var portNumber = root.modules.wledsync.parameters.output.remotePort.get();
			
			if (split == 1)
			{
				createWLEDMapping();
				
			} else {
				
				for (k = 0; k < additionalIP.length; k++) 
				{ 
			
					if (additionalIP[k].name.contains("ip"))
					{				
						ipname = additionalIP[k].name;
						
						var newIP = additionalIP[k].getChild(ipname);				
						var addIP = newIP.get();
						
						if (addIP != "0.0.0.0" && addIP != "")
						{
							if (testWS == 1)
							{
								createWS(addIP);	
							}								
							createWLEDMapping();
							
						} else {
						
							script.log("We bypass this one: "+additionalIP[k].name);
						}
						
					} else {
						
						script.log("We bypass this one: "+additionalIP[k].name);
						
					}
				}
			}
		}
	}
}

function createWLEDMapping()
{
	// add delay to filters
	var testdelay = local.parameters.audioParams.effectsDelay.get()/1000;
	if (testdelay != 0) 
	{
		var timeDelay = newLayersMapping.mapping.filters.getItemWithName("Delay");
		if (timeDelay == undefined){
			// create Delay
			var mapoutdelay = newLayersMapping.mapping.filters.addItem("Delay");
			mapoutdelay.filterParams.delay.set(testdelay);
		}		
	}
	// add math / multiply to filters
	var mathTest = newLayersMapping.mapping.filters.getItemWithName("Math");
	if (mathTest == undefined){
		// create Math
		var mapoutmath = newLayersMapping.mapping.filters.addItem("Math");
		mapoutmath.filterParams.operation.set("Multiply");
		mapoutmath.filterParams.value.set(50);		
	}
		

	if (split == 1)
	{
	
		// create output
		var mapout = newLayersMapping.mapping.outputs.addItem();
		mapout.setCommand("SCAnalyzer","SCAnalyzer","Script callback");
		var parcmd = mapout.getChild("command");
		// set script callback name
		parcmd.callback.set("analyzerIPLoop");
		
		// create arguments 
		var argmapout = parcmd.getChild("Arguments");
		var varargmapout = argmapout.addItem("String");

		// by default, linkType is active for argument, this will remove it --> linkType : 0 , change the name to 'GroupName' and set value to group name
		varargmapout.loadJSONData({
			"parameters": [
				{
					"value": mapin.name,
					"controlAddress": "/#1"
				}
			],
			"niceName": "GroupName",
			"type": "String",
			"param": {
				"value": mapin.name,
				"controlAddress": mapout.getControlAddress() + "/command/arguments/groupName/#1"
			},
			"paramLinks": {
				"linkType": 0
			}
		});

		// create ws 
		if (testWS == 1)
		{
			for (n = 0; n < additionalIP.length; n++) 
			{ 
				if (additionalIP[n].name.contains("ip"))
				{				
					var wsipname = additionalIP[n].name;
					
					var wsnewIP = additionalIP[n].getChild(wsipname);
					var wsaddIP = wsnewIP.get();
					
					if (wsaddIP != "0.0.0.0" && wsaddIP != "")
					{
						createWS(wsaddIP);
					}
					
				}
			}
		}
		
		createWLEDOutput();
		
	} else {

		createWLEDOutput();

	}
}

// create WLED command for Mapping
function createWLEDOutput()
{
	// test WS
	var protocolws = local.parameters.wledParams.useWebSocket.get();
	var preset = local.parameters.wledParams.preset.get();
	
	// create output
	var mapout = newLayersMapping.mapping.outputs.addItem("mappingOutput");
	mapout.setName(groupName);
	mapout.setCommand("WLED","WLED","WLED Main");
	var parcmd = mapout.getChild("command");
	
	// set params from Group
	parcmd.wledIP.set(addIP);
	// Create Param Ref for IP
	if (split == 1)
	{
		var refParam = parcmd.wledIP.getControlAddress();
		var toValue = mapin.calcWLEDParams.ip.getControlAddress();
		createParamReferenceTo(refParam,toValue);		
	}
	//
	parcmd.live.set(false);
	parcmd.on.set(true);
	if (protocolws == 1)
	{
		parcmd.udp.set(false);
		
	} else {
		
		parcmd.udp.set(true);
	}
	parcmd.uDPPort.set(mapin.defaultWLEDParams.uDPPort.get());	
	parcmd.wledcolor.set(mapin.defaultWLEDParams.wledcolor.get());
	// Create Param Ref for Color
	if (local.parameters.defaultColors.loopColors.get() == 1)		
	{
		var refParam = parcmd.wledcolor.getControlAddress();
		var toValue = mapin.calcWLEDParams.mapcolor.getControlAddress();
		createParamReferenceTo(refParam,toValue);
	}
	//
	parcmd.bgcolor.set(mapin.defaultWLEDParams.bgcolor.get());
	parcmd.brightness.set(mapin.defaultWLEDParams.brightness.get());
	parcmd.wledeffect.set(mapin.defaultWLEDParams.wledeffect.get());	
	parcmd.fxspeed.set(mapin.defaultWLEDParams.fxspeed.get());
	parcmd.fxintensity.set(mapin.defaultWLEDParams.fxintensity.get());
	parcmd.palette.set(mapin.defaultWLEDParams.palette.get());	
	parcmd.wledgroup.set(mapin.name);
	parcmd.wledgroup.setAttribute("readOnly",false);
	parcmd.wledws.set(protocolws);
	parcmd.wledws.setAttribute("readOnly",false);
	parcmd.wledps.set(preset);
	parcmd.wledps.setAttribute("readOnly",false);

	// set the link active for brightness
	var brightControl = parcmd.brightness.getControlAddress();
	var brightObj = root.getChild(brightControl).getParent();
	brightObj.loadJSONData({
		"paramLinks": {
			"brightness": {
				"linkType": 1,
				"mappingValueIndex": 0
			}
		}	
	});
	//	
}

// create mapping output for color : can be used to change WLED color
function createColorMapping(groupName)
{
	// retreive group name from wledgroupxx
	var grp = local.parameters.getChild("wledParams/"+ groupName);		
	var mapin = root.customVariables.getItemWithName(grp.get());

	// add delay to filters
	var testdelay = local.parameters.audioParams.effectsDelay.get()/1000;
	if (testdelay != 0) 
	{
		var timeDelay = newLayersMapping.mapping.filters.getItemWithName("Delay");
		if (timeDelay == undefined){
			// create Delay
			var mapoutdelay = newLayersMapping.mapping.filters.addItem("Delay");
			mapoutdelay.filterParams.delay.set(testdelay);
		}		
	}
	
	// create output
	var mapout = newLayersMapping.mapping.outputs.addItem();
	mapout.setCommand("SCAnalyzer","SCAnalyzer","Script callback");
	var parcmd = mapout.getChild("command");
	// set script callback name
	parcmd.callback.set("analyzerColorLoop");
	
	// create arguments 
	var argmapout = parcmd.getChild("Arguments");
	var varargmapout = argmapout.addItem("String");
	
	// by default, linkType is active for argument, this will remove it --> linkType : 0 , change the name to 'GroupName' and set value to group name
	varargmapout.loadJSONData({
		"parameters": [
			{
				"value": mapin.name,
				"controlAddress": "/#1"
			}
		],
		"niceName": "GroupName",
		"type": "String",
		"description": "Groupe name from /modules/sCAnalyzer/parameters/wledParams/wledGroupXX",
		"param": {
			"value": mapin.name,
			"controlAddress": mapout.getControlAddress() + "/command/arguments/groupName/#1"
		},
		"paramLinks": {
			"linkType": 0
		}
	});
}

// create custom variables for WLED group
function wledCustomVariables(wledGroup)
{
	script.log("Custom group creation for : " + wledGroup);

	// retreive groupe name 
	var wledGroupNamevar = local.parameters.getChild("wledParams/"+wledGroup);
	var wledGroupName = wledGroupNamevar.get();
	var groupExist = root.customVariables.getItemWithName(wledGroupName);

	if (wledGroupName != "")
	{
		if (groupExist.name == "undefined")
		{
			// create variable group
			var newGroup = root.customVariables.addItem(wledGroupName);
			newGroup.setName(wledGroupName);

			// add Wled Variables
			var newIP = newGroup.variables.addItem("String Parameter");
			var newIPV = newIP.getChild(newIP.name);
			newIPV.set("0.0.0.0");
			newIP.setName("IP");		
			
			// create Container for default WLED group values 
			var newwledContainer = newGroup.addContainer("Default WLED Params");
			
			// add Wled Parameters
			newUDP = newwledContainer.addBoolParameter("UDP","Send data thru UDP",true);
			newUDP.setAttribute("readOnly", true);
			newUDP.setAttribute("saveValueOnly",false);
			newUDPPort = newwledContainer.addIntParameter("UDPPort","Port number",0,0,65535);
			newUDPPort.setAttribute("saveValueOnly",false);
			newwledcolor = newwledContainer.addColorParameter("wledcolor","Main WLED Color",[1,1,1]);
			newwledcolor.setAttribute("saveValueOnly",false);			
			newbgcolor = newwledContainer.addColorParameter("bgcolor","Bg Color",[0,0,0]);
			newbgcolor.setAttribute("saveValueOnly",false);						
			newbri = newwledContainer.addFloatParameter("brightness","Bri",127,0,255);
			newbri.setAttribute("saveValueOnly",false);									
			newwledeffect = newwledContainer.addIntParameter("wledeffect","Effect index",0,0,200);
			newwledeffect.setAttribute("saveValueOnly",false);									
			newfx = newwledContainer.addFloatParameter("fxspeed","Effect speed",127,0,255);
			newfx.setAttribute("saveValueOnly",false);									
			newfxin = newwledContainer.addFloatParameter("fxintensity","Intensity number",64,0,255);
			newfxin.setAttribute("saveValueOnly",false);						
			newpalette = newwledContainer.addIntParameter("palette","Palette index",0,0,200);
			newpalette.setAttribute("saveValueOnly",false);									

			// create  WLED Container for calcul of IP/color/effect/index/mapcolor: used by script or link
			var newtmpwledContainer = newGroup.addContainer("Calc WLED Params");

			newGroupIP = newtmpwledContainer.addStringParameter("IP","IP to use for Effect. calculated by script","0.0.0.0");
			newGroupIP.setAttribute("readOnly",true);
			newGroupIP.setAttribute("saveValueOnly",false);
			newGroupindex = newtmpwledContainer.addIntParameter("Index","Number of iteration. calculated by script",0);
			newGroupindex.setAttribute("readOnly",true);
			newGroupindex.setAttribute("saveValueOnly",false);	
			newGroupcolor = newtmpwledContainer.addColorParameter("maincolor","WLED Color",[1,1,1]);
			newGroupcolor.setAttribute("readOnly",true);
			newGroupcolor.setAttribute("saveValueOnly",false);				
			newGroupeffect = newtmpwledContainer.addIntParameter("Effect number","Effect index.",0);
			newGroupeffect.setAttribute("readOnly",true);
			newGroupeffect.setAttribute("saveValueOnly",false);
			newGroupmapcolor = newtmpwledContainer.addColorParameter("Mapcolor","Mapping Color",[1,1,1]);
			newGroupmapcolor.setAttribute("readOnly",true);
			newGroupmapcolor.setAttribute("saveValueOnly",false);
			newGroupmapindex = newtmpwledContainer.addIntParameter("ColorIndex","Number of iteration. calculated by script",0);
			newGroupmapindex.setAttribute("readOnly",true);
			newGroupmapindex.setAttribute("saveValueOnly",false);	
			
			util.showMessageBox("Add new Group", "Custom Variables group created, go there and associate the IP addresses", "Info", "Got it");
		
		} else {
			
			util.showMessageBox("Add new Group", "Custom Variables group already exist", "Info", "Got it");
		}		
	}
}

// create WS module for an IP address
function createWS (wsip)
{

	if (wsip != "")
	{
		var ipname = wsip + "-" + "ws";
		var WSexist = root.modules.getItemWithName(ipname);

		if (WSexist.name != "undefined")
		{	
			script.log("Module WS exist");
			
		} else {
			
			var newWSModule = root.modules.addItem("WebSocket Client");
			newWSModule.parameters.protocol.set("JSON");
			newWSModule.parameters.autoAdd.set(false);
			newWSModule.parameters.serverPath.set(wsip+"/ws");
			newWSModule.setName(wsip+"-"+"ws");
			
		}
		
	} else {
		
		scrip.log("Nothing to do for blank IP");
		
	}
}


// Read all IP from custom variable group and loop from 1 ...n (set the value into root.customVariables.(wledGroupName).parameters.ip/index)
function analyzerIPLoop(wledGroupName)
{
	//script.log("Groupe Name : " + wledGroupName);
	
	var loopip = root.customVariables.getItemWithName(wledGroupName);
	var loopipAdditionalIP = loopip.variables.getItems();
	var loopIndex = loopip.calcWLEDParams.index.get() + 1;
	
	if (loopipAdditionalIP)
	{
		for ( var l = (loopipAdditionalIP.length -1); l >= 0; l--) 
		{ 
	
			if (loopipAdditionalIP[l].name.contains("ip"))
			{				
				var loopipIPName = loopipAdditionalIP[l].name;
				
				var loopipNewIP = loopipAdditionalIP[l].getChild(loopipIPName);
				var loopipAddIP = loopipNewIP.get();
				
				if (loopipAddIP != "0.0.0.0" && loopipAddIP != "")
				{
					var numtest = loopIndex % (l + 1);
				
					if (numtest == 0)
					{
						loopip.calcWLEDParams.ip.set(loopipAddIP);
						loopip.calcWLEDParams.index.set(loopIndex);
						break;
					}					
					
				} else {
				
					script.log("We bypass this one: "+loopipAdditionalIP[l].name);
				}
				
			} else {
				
				script.log("We bypass this one: "+loopipAdditionalIP[l].name);
				
			}
		}
	}
}

// Read all active Default Colors  and set the value into root.customVariables.(wledGroupName).parameters.mapcolor depend on index
// used as script callback in mapping output
function analyzerColorLoop(wledGroupName)
{
	//script.log("Groupe Name for Color Loop : " + wledGroupName);
	
	var loopColor = [];
	var loopgrp = root.customVariables.getItemWithName(wledGroupName);
	
	if (loopgrp.name != "undefined")
	{
		var loopIndex = loopgrp.calcWLEDParams.colorIndex.get() + 1;
		loopgrp.calcWLEDParams.colorIndex.set(loopIndex);
		
		for ( var l = 12; l > 0; l--) 
		{ 
			if ( l == 12 )
			{
				loopColor = local.parameters.defaultColors.segmentL.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 11 ) {
				loopColor = local.parameters.defaultColors.segmentK.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 10 ) {
				loopColor = local.parameters.defaultColors.segmentJ.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 9 ) {
				loopColor = local.parameters.defaultColors.segmentI.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 8 ) {
				loopColor = local.parameters.defaultColors.segmentH.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 7 ) {
				loopColor = local.parameters.defaultColors.segmentG.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 6 ) {
				loopColor = local.parameters.defaultColors.segmentF.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 5 ) {
				loopColor = local.parameters.defaultColors.segmentE.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 4 ) {
				loopColor = local.parameters.defaultColors.segmentD.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 3 ) {
				loopColor = local.parameters.defaultColors.segmentC.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 2 ) {
				loopColor = local.parameters.defaultColors.segmentB.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} else if ( l == 1 ) {
				loopColor = local.parameters.defaultColors.segmentA.get();
				if (loopColor[3] == 1)
				{
					var numtest = loopIndex % (l);				
					if (numtest == 0)
					{
						loopgrp.calcWLEDParams.mapcolor.set(loopColor);
						break;
					}
				}
			} 
		}
	}
}

// Play all sequences in sequential order From index 0 to last sequence number
function analyzerRunshow (play)  
{

	script.log('Play all sequences in sequential order ....');
	
	analyzerResetIndex ();

	if (play == 1)
	{
		var allsequences = root.sequences.getItems();
		numberToPlay = allsequences.length;
		lastsequence = 0;
		playseq = root.sequences.getItemAt(lastsequence);
		var rate = 1;
		script.setUpdateRate(rate);
		
	} else {
		
		numberToPlay = 0;
		script.log("Stop playing, release control");
	}	
}

// Stop all sequences
function analyzerResetshow ()  
{
	script.log('Reset all sequences to begin ....');
	numberToPlay = 0;

	var allsequences = root.sequences.getItems();
	numberToStop = allsequences.length;
	
	for (var i = 0; i < numberToStop; i += 1)
	{
		
		playseq = root.sequences.getItemAt(i);
		playseq.stop.trigger();

	}
	
	analyzerResetIndex ();
	
}

// reset index value to zero 
function analyzerResetIndex ()
{
	script.log('Reset all index from variables groups to zero ....');
	
	var allgroups = root.customVariables.getItems();
	
	for (var j = 0; j < allgroups.length; j += 1)
	{
	
		var customGroup = root.customVariables.getItemAt(j);
		if (customGroup.calcWLEDParams.index.name != "undefined")
		{
			customGroup.calcWLEDParams.index.set(0);			
		}
		if (customGroup.calcWLEDParams.colorIndex.name != "undefined")
		{
			customGroup.calcWLEDParams.colorIndex.set(0);
		}
	}	
}


// load ledFX enum param from file
function analyzerLoadenum ()
{
	local.parameters.ledFXParams.associatedEffects.removeOptions();
	
	var datafile = util.readFile(enumFile,true);
	for (var i = 0; i < datafile.length; i +=1 )
	{
		local.parameters.ledFXParams.associatedEffects.addOption(datafile[i].key,datafile[i].value);		
	}
}

// load default effects for ledFX
function analyzerLoaddefault()
{
	var defaulteffects = [
				'A:Power',
				'B:Bands',
				'C:Marching',
				'D:BPM Strobe',
				'E:Equalizer',
				'F:Energy',
				'G:Magnitude',
				'H:Spectrum',
				'I:Strobe',
				'J:Blocks',
				'K:Melt',
				'L:Bar'
	];
	
	local.parameters.ledFXParams.associatedEffects.removeOptions();
	
	for (var i = 0; i < defaulteffects.length; i +=1 )
	{
		var key = defaulteffects[i].split(":")[0];
		var value = defaulteffects[i].split(":")[1];
		local.parameters.ledFXParams.associatedEffects.addOption(key,value);		
	}	
}

// Default colors
function activateColors ()
{
	var activateColor = local.parameters.defaultColors.segmentA.get();
	local.parameters.defaultColors.segmentA.set([activateColor[0],activateColor[1],activateColor[2],1]);
	var activateColor = local.parameters.defaultColors.segmentB.get();
	local.parameters.defaultColors.segmentB.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentC.get();
	local.parameters.defaultColors.segmentC.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentD.get();
	local.parameters.defaultColors.segmentD.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentE.get();
	local.parameters.defaultColors.segmentE.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentF.get();
	local.parameters.defaultColors.segmentF.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentG.get();
	local.parameters.defaultColors.segmentG.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentH.get();
	local.parameters.defaultColors.segmentH.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentI.get();
	local.parameters.defaultColors.segmentI.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentJ.get();
	local.parameters.defaultColors.segmentJ.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentK.get();
	local.parameters.defaultColors.segmentK.set([activateColor[0],activateColor[1],activateColor[2],1]);	
	var activateColor = local.parameters.defaultColors.segmentL.get();
	local.parameters.defaultColors.segmentL.set([activateColor[0],activateColor[1],activateColor[2],1]);	
}

function deActivateColors ()
{
	var activateColor = local.parameters.defaultColors.segmentA.get();
	local.parameters.defaultColors.segmentA.set([activateColor[0],activateColor[1],activateColor[2],0.75]);
	var activateColor = local.parameters.defaultColors.segmentB.get();
	local.parameters.defaultColors.segmentB.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentC.get();
	local.parameters.defaultColors.segmentC.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentD.get();
	local.parameters.defaultColors.segmentD.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentE.get();
	local.parameters.defaultColors.segmentE.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentF.get();
	local.parameters.defaultColors.segmentF.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentG.get();
	local.parameters.defaultColors.segmentG.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentH.get();
	local.parameters.defaultColors.segmentH.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentI.get();
	local.parameters.defaultColors.segmentI.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentJ.get();
	local.parameters.defaultColors.segmentJ.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentK.get();
	local.parameters.defaultColors.segmentK.set([activateColor[0],activateColor[1],activateColor[2],0.75]);	
	var activateColor = local.parameters.defaultColors.segmentL.get();
	local.parameters.defaultColors.segmentL.set([activateColor[0],activateColor[1],activateColor[2],0.75]);		
}

// Default Effects
function resetEffects ()
{
	local.parameters.defaultEffects.effectA.set(-1);
	local.parameters.defaultEffects.effectB.set(-1);
	local.parameters.defaultEffects.effectC.set(-1);
	local.parameters.defaultEffects.effectD.set(-1);
	local.parameters.defaultEffects.effectE.set(-1);
	local.parameters.defaultEffects.effectF.set(-1);
	local.parameters.defaultEffects.effectG.set(-1);
	local.parameters.defaultEffects.effectH.set(-1);
	local.parameters.defaultEffects.effectI.set(-1);
	local.parameters.defaultEffects.effectJ.set(-1);
	local.parameters.defaultEffects.effectK.set(-1);
	local.parameters.defaultEffects.effectL.set(-1);
}

// Default Palettes
function resetPalettes ()
{
	local.parameters.defaultPalettes.paletteA.set(-1);
	local.parameters.defaultPalettes.paletteB.set(-1);
	local.parameters.defaultPalettes.paletteC.set(-1);
	local.parameters.defaultPalettes.paletteD.set(-1);
	local.parameters.defaultPalettes.paletteE.set(-1);
	local.parameters.defaultPalettes.paletteF.set(-1);
	local.parameters.defaultPalettes.paletteG.set(-1);
	local.parameters.defaultPalettes.paletteH.set(-1);
	local.parameters.defaultPalettes.paletteI.set(-1);
	local.parameters.defaultPalettes.paletteJ.set(-1);
	local.parameters.defaultPalettes.paletteK.set(-1);
	local.parameters.defaultPalettes.paletteL.set(-1);
}


// retreive temp location
function analyzerTMP ()
{
	script.log("Retreive temp folder");
	// TMP, TMPDIR, and TEMP environment variables 
	var pathTMP = util.getEnvironmentVariable("TMP");
	var pathTMPDIR = util.getEnvironmentVariable("TMPDIR");	
	var pathTEMP = util.getEnvironmentVariable("TEMP");
	
	if (pathTMP != "")
	{
		tempDIR = pathTMP;
		return tempDIR;
		
	} else if (pathTMPDIR != ""){
		tempDIR = pathTMPDIR;
		return tempDIR;

	} else if (pathTEMP != ""){
		tempDIR = pathTEMP;
		return tempDIR;	
	}
	
	script.log('ERROR temp directory not found');
	
return tempDIR;
}

// create transform file for QM segmenter from skeleton
function segAnalyzerTransform (featureType, nSegmentTypes, neighbourhoodLimit)
{
	var pluginName = SCAvampPluginName.replace(":","-");
	pathTransform = tempDIR + "/" + pluginName+".nc3";
	var qmsegmentTransform = util.readFile(origTransform);
	
	qmsegmentTransform = qmsegmentTransform.replace('value "featureType"','value '+'"'+featureType+'"');
	qmsegmentTransform = qmsegmentTransform.replace('value "nSegmentTypes"','value '+'"'+nSegmentTypes+'"');
	qmsegmentTransform = qmsegmentTransform.replace('value "neighbourhoodLimit"','value '+'"'+neighbourhoodLimit+'"');
	
	util.writeFile(pathTransform, qmsegmentTransform, true);
}

// create transform file for BBC Rhythm from skeleton
function rhythmAnalyzerTransform (SubBands, Threshold, MovingAvgWindowLength, OnsetPeackWindowLength, MinBPM, MaxBPM)
{
	var pluginName = SCAvampPluginName.replace(":","-");
	pathTransform = tempDIR + "/" + pluginName+".nc3";
	var bbcrhythmTransform = util.readFile(origTransform);
	
	bbcrhythmTransform = bbcrhythmTransform.replace('value "numBands"','value '+'"'+SubBands+'"');
	bbcrhythmTransform = bbcrhythmTransform.replace('value "threshold"','value '+'"'+Threshold+'"');
	bbcrhythmTransform = bbcrhythmTransform.replace('value "average_window"','value '+'"'+MovingAvgWindowLength+'"');
	bbcrhythmTransform = bbcrhythmTransform.replace('value "peak_window"','value '+'"'+OnsetPeackWindowLength+'"');
	bbcrhythmTransform = bbcrhythmTransform.replace('value "min_bpm"','value '+'"'+MinBPM+'"');
	bbcrhythmTransform = bbcrhythmTransform.replace('value "max_bpm"','value '+'"'+MaxBPM+'"');	
	
	util.writeFile(pathTransform, bbcrhythmTransform, true);
}


// One click Create Show for a mp3 file
// Step 1
function createShow (targetFile)
{
	script.log("We create sequence for automatic show");
	
	// reset all index value to zero
	analyzerResetIndex();
	
	// SEGMENTER part

	// First, execute segmenter with default values
	moreInfo = "Step 1";	
	keepJson = false;
	
	segAnalyzer("", targetFile, 1, 10, 4);	
	createShowStep2 = true;	
}

// check is step 1 is finished
function checkStep1()
{
	if (segAnalyzerIsRunning)
	{
		script.log('Seganalyzer is running');
		return;
		
	} else {
		
		createShowStep2 = false;
		showStep2();		
	}
}

function showStep2 ()
{
	// retreive the new Audio clip address to pass as parameter, this will create data on current sequence for next segmenter / rhythm.
	var seqaddr = newAudio.getControlAddress();
	
	// Second, create colors/effects from existing JSON output file 
	moreInfo = "Step 2";	
	keepJson = true;
	var mappEffect = true;
	var mapGroup = local.parameters.wledParams.associateGroup.get();
	
	script.log("Create sequence for : " + seqaddr);
	
	if (mapGroup != 0)
	{
		segAnalyzer(seqaddr, "", 1, 10, 4);	
	}
	
	createShowStep3 = true;	
}

// check is step 2 is finished
function checkStep2()
{
	if (segAnalyzerIsRunning)
	{
		script.log('Seganalyzer is running');
		return;
		
	} else {
		
		createShowStep3 = false;
		showStep3();		
	}	
}

function showStep3 ()
{
	// RHYTHM part

	var seqaddr = newAudio.getControlAddress();

	// Third, execute Rhythm with default values, need to erase the output JSON file
	moreInfo = "Step 3";	
	keepJson = false;
	
	script.log("Create mapping for : " + seqaddr);
	
	rhythmAnalyzer (seqaddr, "", 7, 1, 200, 6, 12, 300);	
	createShowStep4 = true;
}

// check is step 3 is finished
function checkStep3()
{
	if (rhythmAnalyzerIsRunning)
	{
		script.log('RhythmAnalyzer is running');
		return;
		
	} else {
		
		createShowStep4 = false;
		showStep4();		
	}	
}


function showStep4 ()
{	
	var seqaddr = newAudio.getControlAddress();
	
	// Fourth, create colors loop based on rhythm if requested
	moreInfo = "Step 4";	
	if (local.parameters.defaultColors.loopColors.get() == 1)
	{
		keepJson = true;
		// set flag for wled auto actions creation to false
		var wledExist = root.modules.getItemWithName("WLED");			
		if (wledExist.name == "wled")
		{
			bkpWLEDValue = local.parameters.wledParams.createWLEDActions.get();
			local.parameters.wledParams.createWLEDActions.set(0);						
		}
		
		rhythmAnalyzer (seqaddr, "", 7, 1, 200, 6, 12, 300);
	}
	
	createShowStep5 = true;
}


// check is step 4 is finished
function checkStep4()
{
	if (rhythmAnalyzerIsRunning)
	{
		script.log('RhythmAnalyzer is running');
		return;
		
	} else {

		var wledExist = root.modules.getItemWithName("WLED");		
		// put back flag value
		if (wledExist.name == "wled")
		{
			local.parameters.wledParams.createWLEDActions.set(bkpWLEDValue);
		}		
	}	

	createShowStep5 = false;
	showStep5();
}


function showStep5 ()
{
	var seqaddr = newAudio.getControlAddress();

	// fifth, run spleeter separate for vocal
	moreInfo = "Step 5";
	keepJson = false;
	
	script.log("Create vocals for : " + seqaddr);
	
	if (spleeterExist.name != "undefined")
	{
		var cmd = spleeterExist.commandTester.setCommand("Spleeter","Spleeter","Separate");		
		cmd.sequence.set(seqaddr+"/clips/audioClip/filePath");
		spleeterExist.commandTester.trigger.trigger();

		spleeterIsRunning = true;
		
	} else {
		
		showLast();
	}
}

function checkSpleeter()
{
	var newSequence = newAudio.getParent();
	var vocalExist = newSequence.getChild('vocals');
	if (vocalExist.name == "undefined" && spleeterOccurrence < spleeterMaxOccurrences)
	{
		script.log('spleeter is running');
		spleeterOccurrence = spleeterOccurrence + 1;
		return;
	}
	
	if (spleeterOccurrence >= spleeterMaxOccurrences) 
	{
		script.log('Max occurrence reached for spleeter testing');
		
	} else {
		// retreive vocals part from the sequence and create mapping
		var seqVocals = newAudio.getParent().getControlAddress() + "/vocals";		
		rhythmAnalyzer (seqVocals, "", 7, 1, 200, 6, 12, 300);		
	}
	
	spleeterOccurrence = 0;
	spleeterIsRunning = false;
	createShowLast = true;
}


// check if analyzer for spleeter is finished
function checkLast()
{
	if (rhythmAnalyzerIsRunning)
	{
		script.log('RhythmAnalyzer is running');
		return;
		
	} else {

		createShowLast = false;
		showLast();		
	}	
}


function showLast()
{
	
		// Last, reset test
	moreInfo = "";
	keepJson = false;
	util.showMessageBox("Sonic Analyzer ! Show Maker ", "Finished", "info", "OK");

	
}


// Reference parameter to value of , 'from' and 'to' need to be OSC addresses.
function createParamReferenceTo(refParam,toValue)
{
	script.log("Create Reference  from param : " + refParam + " to value of : "  + toValue);
	
	// From param, retreive object 
	var fromObj = root.getChild(refParam);
	var paramToRef = fromObj.getParent();
	
	// To value of, retreive object. Done in this way to validate the OSC address already provided.
	var toParamValue = root.getChild(toValue).getControlAddress();

	// Modify Param definition to create the Reference
	paramToRef.loadJSONData({
		"parameters": [
		  {
			"value": 1,
			"controlMode": 2,
			"reference": {
			  "value": toParamValue,
			  "controlAddress": "/reference"
			},
			"hexMode": false,
			"controlAddress": "/" + fromObj.name,
			"feedbackOnly": false,
			"customizable": true,
			"removable": false,
			"hideInEditor": false
		  }
		]
	});
}


// used for value/expression testing .......
function testScript(from)
{
	
	
}