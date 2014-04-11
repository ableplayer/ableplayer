<?php 
/* 
	Transcript Maker (TM) for Univeral Media Player (UMP)
	http://www.terrillthompson.com/ump
	Author: Terrill Thompson
	Version: 1.0 alpha 
	Last update: December 15, 2012

	Produces a UMP-compatible interactive transcript from one or two WebVTT files 
	Output is written to the screen
	
	Expects URLs of WebVTT files to be passed by GET 
	$c = URL of caption file 
	$d = URL of description file (optional, but highly recommended)
	
	If anything goes wrong, writes an error code to the screen 
	0 = insuficcient parameters were passed by URL 
	1 = unable to read WebVTT file (enforced for caption file only)
	2 = file is not a WebVTT file 
	3 = no cues were found in WebVTT file 
*/

parseWebVTT($_GET['c'],$_GET['d']);

function parseWebVTT($captionUrl=NULL,$descUrl=NULL)	{ 
	if ($captionUrl) { 
		$captionFile = @file_get_contents($captionUrl); 
		if ($captionFile) {
			$captionArray = toArray('captions',$captionFile);		
		}
		else { 
			echo '1'; // unable to read caption file;
		}
		if ($descUrl) { 
			$descFile = @file_get_contents($descUrl);
			if ($descFile) {
				$descArray = toArray('desc',$descFile);
			}
			else { 
				// do nothing 
				// description file is not required 
			}
		}
		if (sizeof($captionArray) > 0) { 
			writeOutput($captionArray,$descArray);
		}
		else { 
			// do nothing 
			// an error has occurred (and hopefully an error code was displayed)
		}
	}
	else { 
		echo '0'; // insuficcient parameters were passed by URL 
	}		
}

function toArray($type,$content) { 

	//standardize on \n for eol character
	$content = preg_replace("/\r\n|\r|\n/m", "\n", trim($content)); 
	$cues = explode("\n\n",$content); 
	$n = 0; // counter of kept cues  
	if (sizeof($cues)>1) { 
		if (trim(strtoupper($cues[0])) == 'WEBVTT') { //spec requires WEBVTT on the first line
			$i=1;
			while ($i < sizeof($cues)) { 
				$cue = explode("\n",$cues[$i]);
				if (sizeof($cue) >=2) { // this seems to be a valid cue. Keep it 
					$times = explode(' --> ',$cue[0]);
					$c['type'][$n] = $type;
					$c['start'][$n] = toSeconds(trim($times[0]));
					$c['end'][$n] = toSeconds(trim($times[1]));
					$cueText = $cue[1];
					if(sizeof($cue) > 2) { // this is a multi-line cue 
						$j=2; 
						while ($j < sizeof($cue)) { 
							// ensure there's one space between cues, but not more than one
							$cueText .= ' '.trim($cue[$j]);
							$j++;
						}
					}
					$c['text'][$n] = $cueText;					
					$n++;
				}
				$i++;
			}
		}
		else { 
			echo '2'; // this is not a WebVTT file 
		}
	}
	else { 
		echo '3'; // too few cues were found 
	}
	return $c; 
}

function toSeconds($time) { 
	$seconds = 0;
	if ($time) {
		$parts = explode(':',$time);
		$i=0;
		while ($i < sizeof($parts)) { 
			$seconds = $seconds * 60 + str_replace(',','.',$parts[$i]);
			$i++;
		}
		return $seconds;
	}
}

function writeOutput($c,$d) { 

	// merge arrays and sort by start time 
	$allCues = array_merge_recursive($c,$d);
	array_multisort($allCues['start'],$allCues['end'],$allCues['type'],$allCues['text']);
//echo "<pre>";
//var_dump($allCues);	
//echo "</pre>";	
	$numCues = sizeof($allCues['start']);
	if ($numCues > 0) { 
		echo '<div class="ump-transcript">'."\n";
		$divOpen = false;
		$descOpen = false;
		$i=0;
		while ($i < $numCues) { 		
			$cue = trim($allCues['text'][$i]);
			$cueType = $allCues['type'][$i];
			// make transcript more readable by breaking divs on parenthetical or bracketed text 
			// brackets contain unspoken information such as sounds or speaker names			 
			//standardize on square brackets []
			// $cue = @preg_replace("(|（", "[", $cue); // this wasn't working
			// $cue = @preg_replace(")|）", "]", $cue); // trying to account for various ( symbols
			$cue = str_replace('(','[',$cue);
			$cue = str_replace(')',']',$cue);
			
			if ($descOpen && $cueType != 'desc') { 
				// close description div 
				echo "\n</div>\n";
				$descOpen = false;
				$divOpen = false;
			}
			// if cue contains bracketed content, or is the start of a new description	
			// both make good breaking points
			if (substr($cue,0,1) == '[' || ($cueType =='desc' && !$descOpen)) { 
				if ($divOpen) { 
					// close the preceding div
					echo "\n</div>\n\n";
					if ($cueType == 'desc') { 
						// this is the start of a new description (following a caption)
						echo '<div class="ump-desc">'."\n";
						// preface description with a hidden prompt for non-visual users
						echo '<span class="hidden">Description: </span>';
						$descOpen = true;					
					}
					else { 
						// this is the start of a new caption with bracketed content 
						echo "<div>\n";
					}					
				}
				else { // div is not already open 
					if ($cueType == 'desc') { 
						// this is the start of a new description 
						echo '<div class="ump-desc">'."\n";
						// preface description with a hidden prompt for non-visual users
						echo '<span class="hidden">Description: </span>';
						$descOpen = true;					
					}
					else { 
						// this is a new caption 
						echo "<div>\n";
						$divOpen = true;
					}
				}	
				$bracketEndPos = strpos($cue,']');
				if (substr($cue,0,1) == '[') { 				
					echo '<span class="ump-unspoken">'; 					
					echo '['.ucfirst(trim(substr($cue,1,$bracketEndPos-1))).']'; 
					echo "</span>\n";
					if (strlen($cue) > ($bracketEndPos+1)) { 
						// there is additional content in this cue, not just bracketed content
						$cue = substr($cue,$bracketEndPos+1);
					}
					else { 
						// nothing in this queue but bracketed text. Close the div
						echo "</div>\n";										
						$divOpen = false;
						$cue = '';
					}
				}
			}
			// now write the cue 
			if ($cue != '') {
				if ($cueType == 'desc') { 
					echo $cue.' ';
				}
				else { 
					// add attributes to make this cue clickable and highlightable
					// Note: tabindex="0" will be added dynamically based on user preference
					echo '<span ';
					echo 'data-start="'.$allCues['start'][$i].'" ';
					echo 'data-end="'.$allCues['end'][$i].'">';
					echo $cue.' ';
					echo "</span> ";
				}
			}
			$i++;
		}
		if ($divOpen) { //close it
			echo "</div>\n";
		}
		echo "</div>\n"; //close transcript
	}	
}
?>