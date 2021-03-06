// PORTAL DETAILS DISPLAY ////////////////////////////////////////////
// hand any of these functions the details-hash of a portal, and they
// will return pretty, displayable HTML or parts thereof.

// returns displayable text+link about portal range
window.getRangeText = function(d) {
  var range = getPortalRange(d);
  return ['range',
      '<a onclick="window.rangeLinkClick()">'
    + (range > 1000
      ? Math.floor(range/1000) + ' km'
      : Math.floor(range)      + ' m')
    + '</a>'];
}

// generates description text from details for portal
window.getPortalDescriptionFromDetails = function(details) {
  var descObj = details.portalV2.descriptiveText;
  // FIXME: also get real description?
  var desc = descObj.TITLE + '\n' + descObj.ADDRESS;
  if(descObj.ATTRIBUTION)
    desc += '\nby '+descObj.ATTRIBUTION+' ('+descObj.ATTRIBUTION_LINK+')';
  return desc;
}

// Grabs more info, including the submitter name for the current main
// portal image
window.getPortalDescriptionFromDetailsExtended = function(details) {
  var descObj = details.portalV2.descriptiveText;
  var photoStreamObj = details.photoStreamInfo;

  var submitterObj = new Object();
  submitterObj.type = "";
  submitterObj.name = "Unknown";
  submitterObj.team = "";
  submitterObj.link = "";
  submitterObj.voteCount = 0;

  if(photoStreamObj && photoStreamObj.hasOwnProperty("coverPhoto") && photoStreamObj.coverPhoto.hasOwnProperty("attributionMarkup")) {
    var attribution = photoStreamObj.coverPhoto.attributionMarkup;
    submitterObj.type = attribution[0];
    if(attribution[1].hasOwnProperty("plain"))
      submitterObj.name = attribution[1].plain;
    if(attribution[1].hasOwnProperty("team"))
      submitterObj.team = attribution[1].team;
    if(attribution[1].hasOwnProperty("attributionLink"))
      submitterObj.link = attribution[1].attributionLink;
    if(photoStreamObj.coverPhoto.hasOwnProperty("voteCount"))
      submitterObj.voteCount = photoStreamObj.coverPhoto.voteCount;
  }


  var portalDetails = {
    title: descObj.TITLE,
    description: descObj.DESCRIPTION,
    address: descObj.ADDRESS,
    submitter: submitterObj
  };

  return portalDetails;
}

// given portal details, returns time in seconds between hacks
window.getTimeDetails = function(d) {
  var hsmods = {VERY_RARE : 0, RARE : 0, COMMON : 0};
  var hsvals = {COMMON : 200000, RARE : 500000, VERY_RARE : 700000}; //standard values
  
  $.each(d.portalV2.linkedModArray, function(ind, mod) {
    if (mod) {
      if (mod.type === 'HEATSINK') {
    		hsmods[mod.rarity]=hsmods[mod.rarity]+1;
	      if (mod.stats) {
	        for (var key in mod.stats) {
	          if (!mod.stats.hasOwnProperty(key)) continue;
	          var val = mod.stats[key];
	          if (mod.type === 'HEATSINK' && key === 'HACK_SPEED') {
	          	val = (val/1000000); // 500000 = 50%
	          	hsvals[mod.rarity]=val;
	          }
	        }
	      }
    		
    	}
    }
  });
  var theone=true;
  var thetime=300;
  var thecoef=1;
  $.each(hsmods, function (ind, count) {
  	for(var i=0; i<count; i++) {
  		thetime=thetime*(1-hsvals[ind]*thecoef);
	  	if (theone) {
	  		thecoef=0.5;
	  		theone=false;
	  	}
  	}
  });
  var t=thetime;
  return t;
}

// given protal details, returns the total count of hack before burnout
window.getBODetails = function(d) {
  var mhmods = {VERY_RARE : 0, RARE : 0, COMMON : 0};
  var mhvals = {COMMON : 4, RARE : 8, VERY_RARE : 12}; //standard values, overwritten by data from intel
  
  $.each(d.portalV2.linkedModArray, function(ind, mod) {
    if (mod) {
    	if (mod.type === 'MULTIHACK') {
    		mhmods[mod.rarity]=mhmods[mod.rarity]+1; //add 1 to the mod count
    		
	      if (mod.stats) {
	        for (var key in mod.stats) {
	          if (!mod.stats.hasOwnProperty(key)) continue;
	          var val = mod.stats[key];
	          if (mod.type === 'MULTIHACK' && key === 'BURNOUT_INSULATION') {
	          	mhvals[mod.rarity]=val; //overwrite values by actual from intel
	          }
	        }
	      }
    		
    	}
    }
  });

  var theone=true; // did we have the first that counts for 100%?
  var insulation=4; // standard insulation
  var thecoef=1; // coefficiant to count, the highest mod gets 100%, the others 50%
  $.each(mhmods, function (ind, count) {
  	for(var i=0; i<count; i++) {
  		insulation=insulation+mhvals[ind]*thecoef;
	  	if (theone) {
	  		thecoef=0.5;
	  		theone=false;
	  	}
  	}
  });
  var t=insulation;
  return t;
}

// given portal details, returns html code to display mod details.
window.getModDetails = function(d) {
  var mods = [];
  var modsTitle = [];
  var modsColor = [];
  $.each(d.portalV2.linkedModArray, function(ind, mod) {
    var modName = '';
    var modTooltip = '';
    var modColor = '#000';

    if (mod) {
      // all mods seem to follow the same pattern for the data structure
      // but let's try and make this robust enough to handle possible future differences

      if (mod.displayName) {
        modName = mod.displayName;
      } else if (mod.type) {
        modName = mod.type;
      } else {
        modName = '(unknown mod)';
      }

      if (mod.rarity) {
        modName = mod.rarity.capitalize().replace(/_/g,' ') + ' ' + modName;
      }

      modTooltip = modName + '\n';
      if (mod.installingUser) {
        modTooltip += 'Installed by: '+ getPlayerName(mod.installingUser) + '\n';
      }

      if (mod.stats) {
        modTooltip += 'Stats:';
        for (var key in mod.stats) {
          if (!mod.stats.hasOwnProperty(key)) continue;
          var val = mod.stats[key];

          if (key === 'REMOVAL_STICKINESS' && val == 0) continue;  // stat on all mods recently - unknown meaning, not displayed in stock client

          // special formatting for known mod stats, where the display of the raw value is less useful
          if (mod.type === 'HEATSINK' && key === 'HACK_SPEED') val = (val/10000)+'%'; // 500000 = 50%
          else if (mod.type === 'FORCE_AMP' && key === 'FORCE_AMPLIFIER') val = (val/1000)+'x';  // 2000 = 2x
          else if (mod.type === 'LINK_AMPLIFIER' && key === 'LINK_RANGE_MULTIPLIER') val = (val/1000)+'x' // 2000 = 2x
          else if (mod.type === 'TURRET' && key === 'HIT_BONUS') val = (val/10000)+'%'; // 2000 = 0.2% (although this seems pretty small to be useful?)
          else if (mod.type === 'TURRET' && key === 'ATTACK_FREQUENCY') val = (val/1000)+'x' // 2000 = 2x
          // else display unmodified. correct for shield mitigation and multihack - unknown for future/other mods

          modTooltip += '\n+' +  val + ' ' + key.capitalize().replace(/_/g,' ');
        }
      }

      if (mod.rarity) {
        modColor = COLORS_MOD[mod.rarity];
      } else {
        modColor = '#fff';
      }
    }

    mods.push(modName);
    modsTitle.push(modTooltip);
    modsColor.push(modColor);
  });

  var t = '<span'+(modsTitle[0].length ? ' title="'+modsTitle[0]+'"' : '')+' style="color:'+modsColor[0]+'">'+mods[0]+'</span>'
        + '<span'+(modsTitle[1].length ? ' title="'+modsTitle[1]+'"' : '')+' style="color:'+modsColor[1]+'">'+mods[1]+'</span>'
        + '<span'+(modsTitle[2].length ? ' title="'+modsTitle[2]+'"' : '')+' style="color:'+modsColor[2]+'">'+mods[2]+'</span>'
        + '<span'+(modsTitle[3].length ? ' title="'+modsTitle[3]+'"' : '')+' style="color:'+modsColor[3]+'">'+mods[3]+'</span>'

  return t;
}

window.getEnergyText = function(d) {
  var currentNrg = getCurrentPortalEnergy(d);
  var totalNrg = getTotalPortalEnergy(d);
  var inf = currentNrg + ' / ' + totalNrg;
  var fill = prettyEnergy(currentNrg) + ' / ' + prettyEnergy(totalNrg)
  return ['energy', '<tt title="'+inf+'">' + fill + '</tt>'];
}

window.getAvgResoDistText = function(d) {
  var avgDist = Math.round(10*getAvgResoDist(d))/10;
  return ['reso dist', avgDist + ' m'];
}

window.getResonatorDetails = function(d) {
  var resoDetails = [];
  // octant=slot: 0=E, 1=NE, 2=N, 3=NW, 4=W, 5=SW, 6=S, SE=7
  // resos in the display should be ordered like this:
  //   N    NE         Since the view is displayed in columns, they
  //  NW    E          need to be ordered like this: N, NW, W, SW, NE,
  //   W    SE         E, SE, S, i.e. 2 3 4 5 1 0 7 6
  //  SW    S

  $.each([2, 1, 3, 0, 4, 7, 5, 6], function(ind, slot) {
    var reso = d.resonatorArray.resonators[slot];
    if(!reso) {
      resoDetails.push(renderResonatorDetails(slot, 0, 0, null, null));
      return true;
    }

    var l = parseInt(reso.level);
    var v = parseInt(reso.energyTotal);
    var nick = window.getPlayerName(reso.ownerGuid);
    var dist = reso.distanceToPortal;
    // if array order and slot order drift apart, at least the octant
    // naming will still be correct.
    slot = parseInt(reso.slot);

    resoDetails.push(renderResonatorDetails(slot, l, v, dist, nick));
  });
  return genFourColumnTable(resoDetails);
}

// helper function that renders the HTML for a given resonator. Does
// not work with raw details-hash. Needs digested infos instead:
// slot: which slot this resonator occupies. Starts with 0 (east) and
// rotates clockwise. So, last one is 7 (southeast).
window.renderResonatorDetails = function(slot, level, nrg, dist, nick) {
  if(level === 0) {
    var meter = '<span class="meter" title="octant:\t' + OCTANTS[slot] + ' ' + OCTANTS_ARROW[slot] + '"></span>';
  } else {
    var max = RESO_NRG[level];
    var fillGrade = nrg/max*100;

    var inf = 'energy:\t' + nrg   + ' / ' + max + ' (' + Math.round(fillGrade) + '%)\n'
            + 'level:\t'  + level + '\n'
            + 'distance:\t' + dist  + 'm\n'
            + 'owner:\t'  + nick  + '\n'
            + 'octant:\t' + OCTANTS[slot] + ' ' + OCTANTS_ARROW[slot];

    var style = 'width:'+fillGrade+'%; background:'+COLORS_LVL[level]+';';

    var color = (level < 3 ? "#9900FF" : "#FFFFFF");

    var lbar = '<span class="meter-level" style="color: ' + color + ';"> ' + level + ' </span>';

    var fill  = '<span style="'+style+'"></span>';

    var meter = '<span class="meter" title="'+inf+'">' + fill + lbar + '</span>';
  }
  nick = nick ? '<span class="nickname">'+nick+'</span>' : null;
  return [meter, nick || ''];
}

// calculate AP gain from destroying portal and then capturing it by deploying resonators
window.getAttackApGainText = function(d) {
  var breakdown = getAttackApGain(d);
  var totalGain = breakdown.enemyAp;

  function tt(text) {
    var t = '';
    if (PLAYER.team == d.controllingTeam.team) {
      totalGain = breakdown.friendlyAp;
      t += 'Friendly AP:\t' + breakdown.friendlyAp + '\n';
      t += '  Deploy ' + breakdown.deployCount + ', ';
      t += 'Upgrade ' + breakdown.upgradeCount + '\n';
      t += '\n';
    }
    t += 'Enemy AP:\t' + breakdown.enemyAp + '\n';
    t += '  Destroy AP:\t' + breakdown.destroyAp + '\n';
    t += '  Capture AP:\t' + breakdown.captureAp + '\n';
    return '<tt title="' + t + '">' + digits(text) + '</tt>';
  }

  return [tt('AP Gain'), tt(totalGain)];
}
